// car.js - AutoRace 3D Car Generator & Racing Physics Engine
(function() {
  'use strict';

  // Base Car Profiles
  const CAR_MODELS = {
    apex_gt: {
      name: 'Apex GT',
      tagline: 'Balanced JDM Street Tuner',
      price: 0,
      baseStats: {
        topSpeed: 160,    // km/h
        acceleration: 35, // 0-100 responsiveness
        handling: 40,     // cornering grip
        driftAgility: 50  // slip control
      },
      dimensions: { width: 1.8, height: 1.0, length: 4.2 }
    },
    viper_r: {
      name: 'Viper R',
      tagline: 'High-Torque V8 Muscle Beast',
      price: 350,
      baseStats: {
        topSpeed: 185,
        acceleration: 48,
        handling: 32,
        driftAgility: 45
      },
      dimensions: { width: 1.95, height: 1.05, length: 4.4 }
    },
    drift_king: {
      name: 'Drift King 240',
      tagline: 'Ultra-Agile Japanese Drift Legend',
      price: 600,
      baseStats: {
        topSpeed: 175,
        acceleration: 42,
        handling: 46,
        driftAgility: 65
      },
      dimensions: { width: 1.85, height: 0.95, length: 4.3 }
    },
    hyperion_evo: {
      name: 'Hyperion EVO',
      tagline: 'Aerodynamic Apex Hypercar',
      price: 1000,
      baseStats: {
        topSpeed: 215,
        acceleration: 58,
        handling: 52,
        driftAgility: 40
      },
      dimensions: { width: 2.05, height: 0.92, length: 4.6 }
    }
  };

  // Upgrade Modifiers
  const UPGRADE_STATS = {
    exhaust: {
      stock: { speed: 0, accel: 0, nitro: 0 },
      sport: { speed: 8, accel: 3, nitro: 5 },
      titanium: { speed: 18, accel: 6, nitro: 12 }
    },
    tires: {
      stock: { handling: 0, drift: 0 },
      sport: { handling: 8, drift: 6 },
      drift: { handling: 14, drift: 18 }
    },
    engine: {
      stock: { speed: 0, accel: 0 },
      turbo_s1: { speed: 12, accel: 12 },
      twinturbo_v8: { speed: 28, accel: 26 }
    },
    transmission: {
      stock: { accel: 0 },
      quickshift: { accel: 10 },
      sequential: { accel: 22 }
    }
  };

  class Vehicle3D {
    constructor(carId, isAI = false, initialColor = null) {
      this.carId = carId || 'apex_gt';
      this.modelData = CAR_MODELS[this.carId] || CAR_MODELS.apex_gt;
      this.isAI = isAI;

      // 3D Visual Mesh container
      this.mesh = new THREE.Group();
      this.bodyMaterials = [];
      this.tailLightsMaterial = null;
      this.wheelMeshes = [];
      this.exhaustFlames = [];

      // Upgrades configuration
      this.upgrades = {
        exhaust: 'stock',
        tires: 'stock',
        engine: 'stock',
        transmission: 'stock',
        paint: initialColor || '#e63946'
      };

      if (!isAI && window.AutoRaceStorage) {
        this.upgrades = window.AutoRaceStorage.getCarUpgrades(this.carId);
      } else if (initialColor) {
        this.upgrades.paint = initialColor;
      }

      // Physics State
      this.position = new THREE.Vector3(0, 0, 0);
      this.yaw = 0; // heading rotation in radians
      this.steerAngle = 0;
      this.speed = 0; // forward speed in m/s (1 m/s = 3.6 km/h)
      this.lateralSpeed = 0;
      this.velocity = new THREE.Vector3(0, 0, 0);

      // Nitro
      this.nitro = 100;
      this.maxNitro = 100;
      this.nitroActive = false;

      // Drift State
      this.isDrifting = false;
      this.driftDuration = 0;
      this.driftAngle = 0;
      this.currentDriftScore = 0;
      this.driftCombo = 1;

      // Smoke Particle pool
      this.smokeParticles = [];

      this.recalculateStats();
      this.build3DModel();
    }

    recalculateStats() {
      const base = this.modelData.baseStats;
      const ex = UPGRADE_STATS.exhaust[this.upgrades.exhaust] || UPGRADE_STATS.exhaust.stock;
      const ti = UPGRADE_STATS.tires[this.upgrades.tires] || UPGRADE_STATS.tires.stock;
      const en = UPGRADE_STATS.engine[this.upgrades.engine] || UPGRADE_STATS.engine.stock;
      const tr = UPGRADE_STATS.transmission[this.upgrades.transmission] || UPGRADE_STATS.transmission.stock;

      this.maxSpeedKmh = base.topSpeed + (ex.speed || 0) + (en.speed || 0);
      this.maxSpeed = this.maxSpeedKmh / 3.6; // convert to m/s
      this.accelerationRate = 12 + (base.acceleration + (ex.accel || 0) + (en.accel || 0) + (tr.accel || 0)) * 0.28;
      this.handlingScore = base.handling + (ti.handling || 0);
      this.driftScoreBonus = base.driftAgility + (ti.drift || 0);
      this.turnSpeed = 2.4 + (this.handlingScore / 100) * 1.4;
      this.reverseMaxSpeed = 10;
    }

    build3DModel() {
      // Clear existing
      while (this.mesh.children.length > 0) {
        this.mesh.remove(this.mesh.children[0]);
      }
      this.bodyMaterials = [];
      this.wheelMeshes = [];
      this.exhaustFlames = [];

      const colorHex = parseInt(this.upgrades.paint.replace('#', '0x'), 16);

      // Metallic Car Paint Material
      const bodyMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.85,
        roughness: 0.25
      });
      this.bodyMaterials.push(bodyMat);

      // Dark Cabin / Tinted Glass Material
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x111625,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85
      });

      // Dark Matte Trim / Underbody
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0x181818,
        roughness: 0.8
      });

      // Headlights glow material
      const headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      // Taillights material (changes brightness on brake)
      this.tailLightsMaterial = new THREE.MeshBasicMaterial({ color: 0xff1e27 });

      // Carbon/Black Spoiler material
      const carbonMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.4
      });

      const dim = this.modelData.dimensions;
      const w = dim.width;
      const h = dim.height;
      const l = dim.length;

      // 1. Lower Chassis
      const chassisGeo = new THREE.BoxGeometry(w, h * 0.45, l);
      const chassis = new THREE.Mesh(chassisGeo, bodyMat);
      chassis.position.y = h * 0.35;
      chassis.castShadow = true;
      chassis.receiveShadow = true;
      this.mesh.add(chassis);

      // 2. Cabin Roof & Windows
      const cabinLength = l * 0.52;
      const cabinWidth = w * 0.82;
      const cabinHeight = h * 0.45;
      const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, h * 0.72, -l * 0.05);
      cabin.castShadow = true;
      this.mesh.add(cabin);

      // Roof Cover
      const roofGeo = new THREE.BoxGeometry(cabinWidth * 0.92, 0.06, cabinLength * 0.85);
      const roof = new THREE.Mesh(roofGeo, bodyMat);
      roof.position.set(0, h * 0.95, -l * 0.05);
      this.mesh.add(roof);

      // 3. Front Hood Slope
      const hoodGeo = new THREE.BoxGeometry(w * 0.92, h * 0.18, l * 0.35);
      const hood = new THREE.Mesh(hoodGeo, bodyMat);
      hood.position.set(0, h * 0.46, l * 0.32);
      hood.rotation.x = 0.08;
      this.mesh.add(hood);

      // 4. Front Splitter / Bumper
      const splitterGeo = new THREE.BoxGeometry(w * 1.02, 0.1, 0.35);
      const splitter = new THREE.Mesh(splitterGeo, trimMat);
      splitter.position.set(0, 0.14, l * 0.5);
      this.mesh.add(splitter);

      // 5. Rear Diffuser
      const diffuserGeo = new THREE.BoxGeometry(w * 0.95, 0.16, 0.3);
      const diffuser = new THREE.Mesh(diffuserGeo, trimMat);
      diffuser.position.set(0, 0.18, -l * 0.5);
      this.mesh.add(diffuser);

      // 6. Headlights
      const headLightGeo = new THREE.BoxGeometry(w * 0.22, 0.1, 0.08);
      const leftLight = new THREE.Mesh(headLightGeo, headLightMat);
      leftLight.position.set(-w * 0.36, h * 0.45, l * 0.51);
      const rightLight = new THREE.Mesh(headLightGeo, headLightMat);
      rightLight.position.set(w * 0.36, h * 0.45, l * 0.51);
      this.mesh.add(leftLight);
      this.mesh.add(rightLight);

      // 7. Taillights
      const tailLightGeo = new THREE.BoxGeometry(w * 0.28, 0.08, 0.08);
      const leftTail = new THREE.Mesh(tailLightGeo, this.tailLightsMaterial);
      leftTail.position.set(-w * 0.33, h * 0.48, -l * 0.51);
      const rightTail = new THREE.Mesh(tailLightGeo, this.tailLightsMaterial);
      rightTail.position.set(w * 0.33, h * 0.48, -l * 0.51);
      this.mesh.add(leftTail);
      this.mesh.add(rightTail);

      // 8. Racing Rear Wing / Spoiler
      const wingPlankGeo = new THREE.BoxGeometry(w * 0.95, 0.05, 0.35);
      const wingPlank = new THREE.Mesh(wingPlankGeo, carbonMat);
      wingPlank.position.set(0, h * 0.92, -l * 0.46);

      const standGeo = new THREE.BoxGeometry(0.06, h * 0.35, 0.12);
      const leftStand = new THREE.Mesh(standGeo, carbonMat);
      leftStand.position.set(-w * 0.32, h * 0.72, -l * 0.46);
      const rightStand = new THREE.Mesh(standGeo, carbonMat);
      rightStand.position.set(w * 0.32, h * 0.72, -l * 0.46);

      this.mesh.add(wingPlank);
      this.mesh.add(leftStand);
      this.mesh.add(rightStand);

      // 9. Dual Exhaust Pipes & Nitro Flame Meshes
      const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.25, 12);
      const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 });
      
      const flameGeo = new THREE.ConeGeometry(0.09, 0.45, 8);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.9
      });

      [-w * 0.22, w * 0.22].forEach(posX => {
        const pipe = new THREE.Mesh(exhaustGeo, exhaustMat);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(posX, 0.22, -l * 0.52);
        this.mesh.add(pipe);

        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.rotation.x = -Math.PI / 2;
        flame.position.set(posX, 0.22, -l * 0.52 - 0.25);
        flame.visible = false;
        this.mesh.add(flame);
        this.exhaustFlames.push(flame);
      });

      // 10. Wheels (4 wheels with rims and brake disks)
      const wheelRadius = 0.36;
      const wheelWidth = 0.24;
      const wheelPositions = [
        { x: -w * 0.52, y: wheelRadius, z: l * 0.32, front: true },  // Front Left
        { x: w * 0.52,  y: wheelRadius, z: l * 0.32, front: true },  // Front Right
        { x: -w * 0.52, y: wheelRadius, z: -l * 0.32, front: false }, // Rear Left
        { x: w * 0.52,  y: wheelRadius, z: -l * 0.32, front: false }  // Rear Right
      ];

      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });
      
      // Rim style color based on tires upgrade
      let rimColor = 0x888888;
      if (this.upgrades.tires === 'sport') rimColor = 0xdcdcdc;
      if (this.upgrades.tires === 'drift') rimColor = 0xd4af37; // Gold rims for drift slicks

      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.02, 12);
      const rimMat = new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.9, roughness: 0.2 });

      wheelPositions.forEach(pos => {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(pos.x, pos.y, pos.z);

        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;

        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.z = Math.PI / 2;

        wheelGroup.add(tire);
        wheelGroup.add(rim);
        this.mesh.add(wheelGroup);

        this.wheelMeshes.push({
          group: wheelGroup,
          tire: tire,
          isFront: pos.front
        });
      });
    }

    setPaintColor(hexString) {
      this.upgrades.paint = hexString;
      const colorHex = parseInt(hexString.replace('#', '0x'), 16);
      this.bodyMaterials.forEach(mat => {
        mat.color.setHex(colorHex);
      });
    }

    setUpgrade(slot, itemId) {
      this.upgrades[slot] = itemId;
      this.recalculateStats();
      if (slot === 'tires' || slot === 'exhaust') {
        this.build3DModel();
      }
    }

    updatePhysics(dt, controls) {
      // Controls: { throttle: bool, brake: bool, left: bool, right: bool, handbrake: bool, nitro: bool }
      dt = Math.min(dt, 0.1); // clamp delta time

      // 1. Nitro Boost
      if (controls.nitro && this.nitro > 5) {
        this.nitroActive = true;
        this.nitro = Math.max(0, this.nitro - dt * 25);
        if (window.AutoRaceAudio && !this.isAI && Math.random() < 0.1) {
          window.AutoRaceAudio.playNitroSound();
        }
      } else {
        this.nitroActive = false;
        // Passive nitro regeneration
        this.nitro = Math.min(this.maxNitro, this.nitro + dt * 4);
      }

      // Show/animate nitro flames
      this.exhaustFlames.forEach(flame => {
        flame.visible = this.nitroActive;
        if (this.nitroActive) {
          const pulse = 0.8 + Math.random() * 0.5;
          flame.scale.set(pulse, pulse * 1.3, pulse);
        }
      });

      // 2. Acceleration & Braking
      const effectiveMaxSpeed = this.nitroActive ? this.maxSpeed * 1.25 : this.maxSpeed;
      const effectiveAccel = this.nitroActive ? this.accelerationRate * 1.6 : this.accelerationRate;

      if (controls.throttle) {
        this.speed += effectiveAccel * dt;
        if (this.speed > effectiveMaxSpeed) {
          this.speed = effectiveMaxSpeed;
        }
      } else if (controls.brake) {
        if (this.speed > 0.5) {
          // Braking
          this.speed -= effectiveAccel * 1.6 * dt;
        } else {
          // Reverse
          this.speed -= effectiveAccel * 0.6 * dt;
          if (this.speed < -this.reverseMaxSpeed) {
            this.speed = -this.reverseMaxSpeed;
          }
        }
      } else {
        // Natural rolling friction
        const friction = this.isDrifting ? 4.5 : 8.0;
        if (this.speed > 0) {
          this.speed = Math.max(0, this.speed - friction * dt);
        } else if (this.speed < 0) {
          this.speed = Math.min(0, this.speed + friction * dt);
        }
      }

      // Taillights brake glow
      if (this.tailLightsMaterial) {
        if (controls.brake) {
          this.tailLightsMaterial.color.setHex(0xff0033);
        } else {
          this.tailLightsMaterial.color.setHex(0x550508);
        }
      }

      // 3. Steering & Drift Mechanics
      const speedRatio = Math.abs(this.speed) / this.maxSpeed;
      let targetSteer = 0;
      if (controls.left) targetSteer += 1;
      if (controls.right) targetSteer -= 1;

      // Smooth steering response
      this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, dt * 10);

      // Handbrake Drift trigger
      const handbrakePressed = controls.handbrake && Math.abs(this.speed) > 7;
      if (handbrakePressed && Math.abs(this.steerAngle) > 0.2) {
        this.isDrifting = true;
      } else if (Math.abs(this.steerAngle) < 0.1 || Math.abs(this.speed) < 5) {
        this.isDrifting = false;
      }

      // Yaw rotation
      const driftMultiplier = this.isDrifting ? (1.5 + (this.driftScoreBonus / 100) * 0.6) : 1.0;
      const turnAmount = this.steerAngle * this.turnSpeed * driftMultiplier * dt * (this.speed >= 0 ? 1 : -1);
      
      // Only turn if moving
      if (Math.abs(this.speed) > 0.3) {
        this.yaw += turnAmount * Math.min(1.2, speedRatio + 0.3);
      }

      // 4. Velocity vector & Lateral Slip
      const forwardX = Math.sin(this.yaw);
      const forwardZ = Math.cos(this.yaw);

      if (this.isDrifting) {
        // Carry lateral momentum
        const slideFactor = 0.92;
        this.lateralSpeed += (this.steerAngle * this.speed * 0.4 - this.lateralSpeed) * dt * 4;
        this.driftDuration += dt;
        this.driftAngle = Math.abs(this.steerAngle) * 45; // estimated drift angle in degrees

        // Faster nitro recharge on drift
        this.nitro = Math.min(this.maxNitro, this.nitro + dt * 15);

        // Calculate drift combo & cash
        this.currentDriftScore += Math.round((this.driftAngle * (Math.abs(this.speed) * 3.6) * 0.05) * dt * 10);
      } else {
        this.lateralSpeed *= Math.max(0, 1 - dt * 9);
        this.driftDuration = 0;
        this.driftAngle = 0;
      }

      const lateralX = Math.cos(this.yaw);
      const lateralZ = -Math.sin(this.yaw);

      this.velocity.x = forwardX * this.speed + lateralX * this.lateralSpeed;
      this.velocity.z = forwardZ * this.speed + lateralZ * this.lateralSpeed;

      // Update position
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;

      // Update 3D Mesh
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.yaw;

      // Body roll during sharp turns & drift
      const bodyRoll = (this.lateralSpeed / 15) * 0.12 - (this.steerAngle * speedRatio) * 0.08;
      this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, bodyRoll, dt * 8);

      // Wheel rotation and front wheel steering angle
      const wheelRotateSpeed = (this.speed / 0.36) * dt;
      this.wheelMeshes.forEach(w => {
        w.tire.rotation.x += wheelRotateSpeed;
        if (w.isFront) {
          w.group.rotation.y = this.steerAngle * 0.45;
        }
      });

      // Audio engine update for player
      if (!this.isAI && window.AutoRaceAudio) {
        const speedKmh = Math.abs(this.speed) * 3.6;
        window.AutoRaceAudio.updateEngine(speedKmh, this.maxSpeedKmh, controls.throttle);
        const driftIntensity = this.isDrifting ? Math.min(1.0, (this.driftAngle / 45) * (speedKmh / 60)) : 0;
        window.AutoRaceAudio.updateTireScreech(driftIntensity);
      }
    }
  }

  window.AutoRaceCarModels = CAR_MODELS;
  window.AutoRaceVehicle3D = Vehicle3D;
})();
