// bot.js - AutoRace AI Bot Competitors Logic
(function() {
  'use strict';

  class AIRacer {
    constructor(botId, name, carId, colorHex, track3D, startGridIndex = 1) {
      this.botId = botId;
      this.name = name;
      this.carId = carId;
      this.colorHex = colorHex;
      this.track3D = track3D;
      this.startGridIndex = startGridIndex;

      // 3D Vehicle instance
      this.vehicle = new window.AutoRaceVehicle3D(this.carId, true, this.colorHex);

      // AI Personality / Tuning
      this.lookAheadDistance = 22; // meters ahead along curve
      this.currentT = 0; // progress along curve (0.0 to 1.0)
      this.lap = 1;
      this.laneOffset = (startGridIndex === 1) ? -2.5 : 2.5; // lateral offset from center
      this.targetLaneOffset = this.laneOffset;

      // Race Stats
      this.checkpointsPassed = 0;
      this.lastCheckpointIdx = -1;
      this.totalDistanceTraveled = 0;
      this.finished = false;
      this.finishTime = null;

      // Positioning on Grid
      this.resetToGrid();
    }

    resetToGrid() {
      const startPt = this.track3D.curve.getPointAt(0);
      const tangent = this.track3D.curve.getTangentAt(0).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Place behind start line, offset left/right
      const backDist = 12 + this.startGridIndex * 10;
      const pos = startPt.clone()
        .sub(tangent.clone().multiplyScalar(backDist))
        .add(normal.clone().multiplyScalar(this.laneOffset));

      this.vehicle.position.copy(pos);
      this.vehicle.yaw = Math.atan2(tangent.x, tangent.z);
      this.vehicle.speed = 0;
      this.vehicle.velocity.set(0, 0, 0);

      this.currentT = 0;
      this.lap = 1;
      this.checkpointsPassed = 0;
      this.lastCheckpointIdx = -1;
      this.totalDistanceTraveled = 0;
      this.finished = false;
      this.finishTime = null;
    }

    update(dt, playerVehicle, otherBot) {
      if (this.finished) {
        // Coast to slow stop
        this.vehicle.updatePhysics(dt, { throttle: false, brake: true, left: false, right: false, handbrake: false, nitro: false });
        return;
      }

      // 1. Calculate current position on spline
      const trackProgress = this.track3D.getClosestPointOnSpline(this.vehicle.position);
      this.currentT = trackProgress.t;

      // 2. Lookahead target waypoint
      // Advance t slightly ahead along the curve
      const advanceT = this.lookAheadDistance / 800; // approximate track circumference
      let targetT = (this.currentT + advanceT) % 1.0;
      if (targetT < 0) targetT += 1.0;

      const targetPt = this.track3D.curve.getPointAt(targetT);
      const tangent = this.track3D.curve.getTangentAt(targetT).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      // Add lane offset to target point for natural racing line
      const offsetTarget = targetPt.clone().add(normal.clone().multiplyScalar(this.laneOffset));

      // 3. Steering Angle Calculation
      const toTarget = offsetTarget.clone().sub(this.vehicle.position);
      const targetAngle = Math.atan2(toTarget.x, toTarget.z);

      let angleDiff = targetAngle - this.vehicle.yaw;
      // Normalize angle to -PI to PI
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      let steerLeft = angleDiff > 0.04;
      let steerRight = angleDiff < -0.04;

      // 4. Throttle & Braking logic (Slow down for sharp corners)
      const absAngle = Math.abs(angleDiff);
      let throttle = true;
      let brake = false;
      let handbrake = false;
      let nitro = false;

      const currentSpeedKmh = Math.abs(this.vehicle.speed) * 3.6;

      if (absAngle > 0.7 && currentSpeedKmh > 95) {
        // Sharp hairpin / hard bend -> brake hard
        throttle = false;
        brake = true;
        if (absAngle > 1.0 && currentSpeedKmh > 80) {
          handbrake = true; // Bot drift!
        }
      } else if (absAngle > 0.4 && currentSpeedKmh > 130) {
        // Medium turn -> gentle brake / coast
        throttle = false;
        brake = true;
      } else {
        // Straightaway -> Full throttle!
        throttle = true;
        // Nitro on straights if trailing
        if (absAngle < 0.15 && currentSpeedKmh > 100 && this.vehicle.nitro > 30) {
          nitro = Math.random() < 0.35;
        }
      }

      // 5. Collision Avoidance with Player & Other Bot
      if (playerVehicle) {
        const distToPlayer = this.vehicle.position.distanceTo(playerVehicle.position);
        if (distToPlayer < 7.0) {
          // If close, shift lane slightly
          const side = (this.vehicle.position.x > playerVehicle.position.x) ? 1 : -1;
          this.laneOffset = THREE.MathUtils.lerp(this.laneOffset, side * 3.5, dt * 2);
        }
      }

      if (otherBot && otherBot.vehicle) {
        const distToBot = this.vehicle.position.distanceTo(otherBot.vehicle.position);
        if (distToBot < 6.0) {
          this.laneOffset = THREE.MathUtils.lerp(this.laneOffset, -this.laneOffset, dt * 2);
        }
      }

      // 6. Execute Physics Update
      this.vehicle.updatePhysics(dt, {
        throttle,
        brake,
        left: steerLeft,
        right: steerRight,
        handbrake,
        nitro
      });

      // 7. Track Checkpoint & Lap Progress
      this.checkpointsCheck();
    }

    checkpointsCheck() {
      const checkpoints = this.track3D.checkpoints;
      if (!checkpoints || !checkpoints.length) return;

      const nextExpected = (this.lastCheckpointIdx + 1) % checkpoints.length;
      const cp = checkpoints[nextExpected];

      const dist = this.vehicle.position.distanceTo(cp.position);
      if (dist < cp.radius) {
        this.lastCheckpointIdx = nextExpected;
        this.checkpointsPassed++;

        // Completed a full lap
        if (this.lastCheckpointIdx === 0 && this.checkpointsPassed > 1) {
          this.lap++;
          if (this.lap > this.track3D.def.laps) {
            this.finished = true;
          }
        }
      }
    }

    getRaceProgress() {
      return (this.lap - 1) + this.currentT;
    }
  }

  window.AutoRaceAIRacer = AIRacer;
})();
