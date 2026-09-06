// game.js - AutoRace Core Race Loop, Physics, HUD, Drift Rewards & AI Manager
(function() {
  'use strict';

  class GameEngine {
    constructor() {
      this.container = null;
      this.hud = null;
      this.canvas = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.animId = null;

      // State
      this.activeTrackId = 'neon_city';
      this.track3D = null;
      this.playerVehicle = null;
      this.bot1 = null;
      this.bot2 = null;

      // Controls
      this.keys = {
        throttle: false,
        brake: false,
        left: false,
        right: false,
        handbrake: false,
        nitro: false
      };

      // Race Session Stats
      this.raceState = 'idle'; // 'countdown', 'racing', 'finished'
      this.countdownValue = 3;
      this.raceStartTime = 0;
      this.raceTime = 0;
      this.currentLap = 1;
      this.totalLaps = 2;
      this.lastCheckpointIdx = -1;
      this.checkpointsPassed = 0;
      this.lapStartTime = 0;
      this.bestLapTime = null;

      // Drift & Reward Tracking
      this.inRaceDriftCash = 0;
      this.driftDuration = 0;
      this.driftAccumulator = 0;
      this.lastDriftPayoutTime = 0;
      this.apexZoneCooldown = 0;

      // Camera views
      this.cameraMode = 'chase'; // 'chase', 'hood', 'far'

      // Mini-map
      this.minimapCanvas = null;
      this.minimapCtx = null;
    }

    init(containerEl, trackId = 'neon_city') {
      this.container = containerEl;
      this.activeTrackId = trackId;

      this.setupDOM();
      this.setupThreeScene();
      this.setupKeyListeners();
      this.startCountdown();
      this.startLoop();
    }

    destroy() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      if (this.track3D) {
        this.track3D.destroy();
        this.track3D = null;
      }
      if (window.AutoRaceAudio) {
        window.AutoRaceAudio.stopEngine();
        window.AutoRaceAudio.updateTireScreech(0);
      }
      this.removeKeyListeners();
      if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement.parentNode);
      }
    }

    setupDOM() {
      this.container.innerHTML = `
        <div class="game-viewport-wrap">
          <div id="game-canvas-mount" class="game-canvas-mount"></div>

          <!-- In-Game HUD -->
          <div id="race-hud" class="race-hud">
            <!-- Top Bar -->
            <div class="hud-top-bar">
              <div class="hud-box position-box">
                <span class="hud-label">POSITION</span>
                <span id="hud-pos" class="hud-val highlight">1<small>/3</small></span>
              </div>
              <div class="hud-box lap-box">
                <span class="hud-label">LAP</span>
                <span id="hud-lap" class="hud-val">1 / 2</span>
              </div>
              <div class="hud-box time-box">
                <span class="hud-label">TIME</span>
                <span id="hud-time" class="hud-val">00:00.0</span>
              </div>
              <div class="hud-box cash-box">
                <span class="hud-label">STUNT CASH</span>
                <span id="hud-drift-cash" class="hud-val gold-val">+$0</span>
              </div>
            </div>

            <!-- Drift & Apex Notification Banner -->
            <div id="stunt-banner" class="stunt-banner">
              <div id="stunt-text" class="stunt-text">DRIFT +$10</div>
            </div>

            <!-- Mini Map -->
            <div class="minimap-container">
              <canvas id="minimap-canvas" width="140" height="140"></canvas>
            </div>

            <!-- Bottom Controls / Speedometer -->
            <div class="hud-bottom-bar">
              <!-- Nitro Gauge -->
              <div class="nitro-gauge-wrap">
                <div class="nitro-label">NITRO (SHIFT)</div>
                <div class="nitro-bar-bg">
                  <div id="hud-nitro-bar" class="nitro-bar-fill"></div>
                </div>
              </div>

              <!-- Speedometer -->
              <div class="speedometer-wrap">
                <div class="speedo-dial">
                  <span id="hud-speed" class="speed-num">0</span>
                  <span class="speed-unit">KM/H</span>
                </div>
              </div>

              <!-- Camera switch button -->
              <button id="btn-switch-cam" class="hud-cam-btn" title="Switch Camera (Key: C)">🎥 CAM</button>
            </div>

            <!-- Touch / Mobile Virtual Controls -->
            <div class="mobile-controls-wrap">
              <div class="mobile-steer-left" id="btn-touch-left">◀</div>
              <div class="mobile-steer-right" id="btn-touch-right">▶</div>
              <div class="mobile-drift-btn" id="btn-touch-drift">DRIFT</div>
              <div class="mobile-nitro-btn" id="btn-touch-nitro">NOS</div>
              <div class="mobile-brake-btn" id="btn-touch-brake">BRAKE</div>
              <div class="mobile-gas-btn" id="btn-touch-gas">GAS</div>
            </div>

            <!-- Countdown Overlay -->
            <div id="countdown-overlay" class="countdown-overlay visible">
              <div id="countdown-number" class="countdown-num">3</div>
            </div>

            <!-- Results Modal Overlay -->
            <div id="results-modal" class="results-modal hidden">
              <div class="results-card">
                <div id="podium-badge" class="podium-badge">🏆 1ST PLACE!</div>
                <h2 id="results-title" class="results-title">VICTORY!</h2>
                
                <div class="results-stats-grid">
                  <div class="r-stat">
                    <span>Race Time:</span>
                    <strong id="res-time">01:24.50</strong>
                  </div>
                  <div class="r-stat">
                    <span>Best Lap:</span>
                    <strong id="res-lap">00:41.20</strong>
                  </div>
                  <div class="r-stat">
                    <span>Winner Reward:</span>
                    <strong id="res-win-cash" class="text-gold">+$100</strong>
                  </div>
                  <div class="r-stat">
                    <span>Drift & Stunt Cash:</span>
                    <strong id="res-drift-cash" class="text-gold">+$45</strong>
                  </div>
                  <div class="r-stat total-stat">
                    <span>Total Cash Earned:</span>
                    <strong id="res-total-cash" class="highlight-gold">+$145</strong>
                  </div>
                </div>

                <div class="results-actions">
                  <button id="btn-res-retry" class="btn btn-secondary">Race Again</button>
                  <button id="btn-res-tracks" class="btn btn-primary">Change Track</button>
                  <button id="btn-res-menu" class="btn btn-secondary">Main Menu</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.minimapCanvas = this.container.querySelector('#minimap-canvas');
      if (this.minimapCanvas) {
        this.minimapCtx = this.minimapCanvas.getContext('2d');
      }

      // Camera toggle button
      const camBtn = this.container.querySelector('#btn-switch-cam');
      if (camBtn) {
        camBtn.addEventListener('click', () => this.cycleCamera());
      }

      this.setupTouchControls();
    }

    setupThreeScene() {
      const mount = this.container.querySelector('#game-canvas-mount');
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(65, width / height, 0.2, 800);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      mount.appendChild(this.renderer.domElement);

      // Load 3D Track
      this.track3D = new window.AutoRaceTrack3D(this.scene, this.activeTrackId);
      this.totalLaps = this.track3D.def.laps || 2;

      // Set fog and scene lighting from track definition
      this.scene.background = new THREE.Color(this.track3D.def.skyColor);
      this.scene.fog = new THREE.Fog(this.track3D.def.fogColor, this.track3D.def.fogNear, this.track3D.def.fogFar);

      const ambLight = new THREE.AmbientLight(this.track3D.def.ambientLight, this.track3D.def.ambientIntensity);
      this.scene.add(ambLight);

      const dirLight = new THREE.DirectionalLight(this.track3D.def.dirLightColor, this.track3D.def.dirLightIntensity);
      dirLight.position.set(60, 100, 40);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      this.scene.add(dirLight);

      // Spawn Player Car
      const storage = window.AutoRaceStorage;
      const selectedCarId = storage.getSelectedCar();
      this.playerVehicle = new window.AutoRaceVehicle3D(selectedCarId, false);
      this.scene.add(this.playerVehicle.mesh);

      // Position Player on Grid (Pole Position #1 or #2)
      this.resetPlayerToGrid();

      // Spawn 2 AI Bots
      // Bot 1: Viper R in flame orange
      this.bot1 = new window.AutoRaceAIRacer('bot_1', 'BlazeBot', 'viper_r', '#f77f00', this.track3D, 1);
      this.scene.add(this.bot1.vehicle.mesh);

      // Bot 2: Drift King in electric purple
      this.bot2 = new window.AutoRaceAIRacer('bot_2', 'PhantomAI', 'drift_king', '#7209b7', this.track3D, 2);
      this.scene.add(this.bot2.vehicle.mesh);

      // Resize listener
      window.addEventListener('resize', this.onResize.bind(this));
    }

    onResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const mount = this.container.querySelector('#game-canvas-mount');
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    resetPlayerToGrid() {
      const startPt = this.track3D.curve.getPointAt(0);
      const tangent = this.track3D.curve.getTangentAt(0).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Grid position for player (slightly to the right of centerline)
      const gridPos = startPt.clone()
        .sub(tangent.clone().multiplyScalar(4))
        .add(normal.clone().multiplyScalar(2.0));

      this.playerVehicle.position.copy(gridPos);
      this.playerVehicle.yaw = Math.atan2(tangent.x, tangent.z);
      this.playerVehicle.speed = 0;
      this.playerVehicle.velocity.set(0, 0, 0);

      this.currentLap = 1;
      this.lastCheckpointIdx = -1;
      this.checkpointsPassed = 0;
      this.inRaceDriftCash = 0;
    }

    startCountdown() {
      this.raceState = 'countdown';
      this.countdownValue = 3;

      const overlay = this.container.querySelector('#countdown-overlay');
      const numEl = this.container.querySelector('#countdown-number');
      if (overlay) overlay.classList.add('visible');

      if (window.AutoRaceAudio) {
        window.AutoRaceAudio.resume();
        window.AutoRaceAudio.playCountdown(false);
      }

      if (numEl) numEl.textContent = '3';

      const interval = setInterval(() => {
        this.countdownValue--;
        if (this.countdownValue > 0) {
          if (numEl) numEl.textContent = this.countdownValue;
          if (window.AutoRaceAudio) window.AutoRaceAudio.playCountdown(false);
        } else if (this.countdownValue === 0) {
          if (numEl) {
            numEl.textContent = 'GO!';
            numEl.classList.add('go-pulse');
          }
          if (window.AutoRaceAudio) window.AutoRaceAudio.playCountdown(true);
          this.raceState = 'racing';
          this.raceStartTime = performance.now();
          this.lapStartTime = performance.now();
        } else {
          clearInterval(interval);
          if (overlay) overlay.classList.remove('visible');
        }
      }, 1000);
    }

    setupKeyListeners() {
      this.keyDownHandler = (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'arrowup') this.keys.throttle = true;
        if (k === 's' || k === 'arrowdown') this.keys.brake = true;
        if (k === 'a' || k === 'arrowleft') this.keys.left = true;
        if (k === 'd' || k === 'arrowright') this.keys.right = true;
        if (k === ' ' || e.code === 'Space') {
          e.preventDefault();
          this.keys.handbrake = true;
        }
        if (k === 'shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          this.keys.nitro = true;
        }
        if (k === 'c') {
          this.cycleCamera();
        }
      };

      this.keyUpHandler = (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'arrowup') this.keys.throttle = false;
        if (k === 's' || k === 'arrowdown') this.keys.brake = false;
        if (k === 'a' || k === 'arrowleft') this.keys.left = false;
        if (k === 'd' || k === 'arrowright') this.keys.right = false;
        if (k === ' ' || e.code === 'Space') this.keys.handbrake = false;
        if (k === 'shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.nitro = false;
      };

      window.addEventListener('keydown', this.keyDownHandler);
      window.addEventListener('keyup', this.keyUpHandler);
    }

    removeKeyListeners() {
      if (this.keyDownHandler) window.removeEventListener('keydown', this.keyDownHandler);
      if (this.keyUpHandler) window.removeEventListener('keyup', this.keyUpHandler);
    }

    setupTouchControls() {
      const bindTouch = (id, keyName) => {
        const btn = this.container.querySelector(id);
        if (!btn) return;
        const start = (e) => { e.preventDefault(); this.keys[keyName] = true; };
        const end = (e) => { e.preventDefault(); this.keys[keyName] = false; };
        btn.addEventListener('touchstart', start);
        btn.addEventListener('touchend', end);
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
      };

      bindTouch('#btn-touch-gas', 'throttle');
      bindTouch('#btn-touch-brake', 'brake');
      bindTouch('#btn-touch-left', 'left');
      bindTouch('#btn-touch-right', 'right');
      bindTouch('#btn-touch-drift', 'handbrake');
      bindTouch('#btn-touch-nitro', 'nitro');
    }

    cycleCamera() {
      const modes = ['chase', 'hood', 'far'];
      const nextIdx = (modes.indexOf(this.cameraMode) + 1) % modes.length;
      this.cameraMode = modes[nextIdx];
      if (window.AutoRaceAudio) window.AutoRaceAudio.playClick();
    }

    updateCamera(dt) {
      if (!this.playerVehicle || !this.camera) return;
      const v = this.playerVehicle;

      const forwardX = Math.sin(v.yaw);
      const forwardZ = Math.cos(v.yaw);

      let targetCamPos = new THREE.Vector3();
      let lookTarget = new THREE.Vector3();

      if (this.cameraMode === 'chase') {
        // High-speed chase cam behind car
        const dist = 5.5 + (v.speed / v.maxSpeed) * 1.5;
        const height = 2.4;
        targetCamPos.set(
          v.position.x - forwardX * dist,
          v.position.y + height,
          v.position.z - forwardZ * dist
        );
        lookTarget.set(
          v.position.x + forwardX * 4,
          v.position.y + 1.2,
          v.position.z + forwardZ * 4
        );
      } else if (this.cameraMode === 'hood') {
        // First-person hood cam
        targetCamPos.set(
          v.position.x + forwardX * 0.8,
          v.position.y + 0.95,
          v.position.z + forwardZ * 0.8
        );
        lookTarget.set(
          v.position.x + forwardX * 20,
          v.position.y + 0.9,
          v.position.z + forwardZ * 20
        );
      } else {
        // Far orbit arcade cam
        targetCamPos.set(
          v.position.x - forwardX * 9.0,
          v.position.y + 4.5,
          v.position.z - forwardZ * 9.0
        );
        lookTarget.set(v.position.x, v.position.y + 1.0, v.position.z);
      }

      // Smooth camera interpolation
      const smoothFactor = Math.min(1.0, dt * 8);
      this.camera.position.lerp(targetCamPos, smoothFactor);
      this.camera.lookAt(lookTarget);

      // FOV effect during nitro
      const targetFov = v.nitroActive ? 75 : 65;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 6);
      this.camera.updateProjectionMatrix();
    }

    updateDriftAndRewards(dt, now) {
      if (this.raceState !== 'racing') return;
      const v = this.playerVehicle;

      // 1. Continuous Drift Detection & Real-time Cash Reward
      if (v.isDrifting && Math.abs(v.speed) > 7.0 && v.driftAngle > 14) {
        this.driftDuration += dt;
        this.driftAccumulator += dt;

        // Payout cash every 0.25 seconds of continuous drift
        if (this.driftAccumulator >= 0.25) {
          this.driftAccumulator = 0;
          // Calculate cash based on angle and speed
          const speedKmh = Math.abs(v.speed) * 3.6;
          const cashEarned = Math.max(1, Math.round((v.driftAngle / 20) * (speedKmh / 70) * 2));

          this.inRaceDriftCash += cashEarned;
          if (window.AutoRaceAudio) window.AutoRaceAudio.playCashChime();

          this.showStuntBanner(`DRIFT: +$${this.inRaceDriftCash} (+$${cashEarned})`);
        }
      } else {
        this.driftDuration = 0;
        this.driftAccumulator = 0;
      }

      // 2. High-Speed Sharp Corner "Clean Apex" Bonus
      if (this.apexZoneCooldown > 0) {
        this.apexZoneCooldown -= dt;
      } else {
        const speedKmh = Math.abs(v.speed) * 3.6;
        // If steering hard at high speed without hitting barriers
        if (Math.abs(v.steerAngle) > 0.65 && speedKmh > 75) {
          const apexBonus = 20;
          this.inRaceDriftCash += apexBonus;
          this.apexZoneCooldown = 6.0; // cooldown between apex bonuses
          if (window.AutoRaceAudio) window.AutoRaceAudio.playCashChime();
          this.showStuntBanner(`⚡ CLEAN APEX TURN! +$${apexBonus}`, true);
        }
      }
    }

    showStuntBanner(text, isSpecial = false) {
      const banner = this.container.querySelector('#stunt-banner');
      const textEl = this.container.querySelector('#stunt-text');
      if (!banner || !textEl) return;

      textEl.textContent = text;
      banner.className = `stunt-banner visible ${isSpecial ? 'special-apex' : ''}`;

      clearTimeout(this.bannerTimer);
      this.bannerTimer = setTimeout(() => {
        banner.classList.remove('visible');
      }, 1400);
    }

    checkCheckpointsAndLaps(now) {
      if (this.raceState !== 'racing') return;
      const checkpoints = this.track3D.checkpoints;
      if (!checkpoints || !checkpoints.length) return;

      const nextExpected = (this.lastCheckpointIdx + 1) % checkpoints.length;
      const cp = checkpoints[nextExpected];

      const dist = this.playerVehicle.position.distanceTo(cp.position);
      if (dist < cp.radius) {
        this.lastCheckpointIdx = nextExpected;
        this.checkpointsPassed++;

        // Lap completed when checkpoint 0 is passed after moving through the others
        if (this.lastCheckpointIdx === 0 && this.checkpointsPassed > 1) {
          const lapTime = (now - this.lapStartTime) / 1000;
          if (!this.bestLapTime || lapTime < this.bestLapTime) {
            this.bestLapTime = lapTime;
          }
          this.lapStartTime = now;

          this.currentLap++;
          if (this.currentLap > this.totalLaps) {
            this.finishRace();
          }
        }
      }
    }

    getLeaderboardPosition() {
      // Calculates current race rank (1st, 2nd, 3rd) based on laps + spline t
      const playerProgress = (this.currentLap - 1) + (this.track3D.getClosestPointOnSpline(this.playerVehicle.position).t);
      const bot1Progress = this.bot1.getRaceProgress();
      const bot2Progress = this.bot2.getRaceProgress();

      let rank = 1;
      if (bot1Progress > playerProgress) rank++;
      if (bot2Progress > playerProgress) rank++;
      return rank;
    }

    finishRace() {
      this.raceState = 'finished';
      const totalTimeSec = (performance.now() - this.raceStartTime) / 1000;
      const finalPosition = this.getLeaderboardPosition();
      const isWinner = (finalPosition === 1);

      if (window.AutoRaceAudio) {
        window.AutoRaceAudio.stopEngine();
        if (isWinner) window.AutoRaceAudio.playWinFanfare();
      }

      // User rule: "her yarış kazandığımızda 100 para gelsin"
      let winCash = 0;
      if (finalPosition === 1) winCash = 100;
      else if (finalPosition === 2) winCash = 50;
      else winCash = 25;

      const totalEarned = winCash + this.inRaceDriftCash;

      // Persist in storage
      const storage = window.AutoRaceStorage;
      storage.addCash(totalEarned);
      storage.recordRaceResult(isWinner, this.bestLapTime, this.activeTrackId, this.inRaceDriftCash);

      // Render Results Modal
      this.showResultsModal(finalPosition, totalTimeSec, this.bestLapTime, winCash, this.inRaceDriftCash, totalEarned);
    }

    showResultsModal(position, totalTimeSec, bestLapSec, winCash, driftCash, totalCash) {
      const modal = this.container.querySelector('#results-modal');
      const badge = this.container.querySelector('#podium-badge');
      const title = this.container.querySelector('#results-title');
      const resTime = this.container.querySelector('#res-time');
      const resLap = this.container.querySelector('#res-lap');
      const resWinCash = this.container.querySelector('#res-win-cash');
      const resDriftCash = this.container.querySelector('#res-drift-cash');
      const resTotal = this.container.querySelector('#res-total-cash');

      const formatTime = (sec) => {
        if (!sec) return '--:--.--';
        const m = Math.floor(sec / 60);
        const s = (sec % 60).toFixed(2);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
      };

      if (position === 1) {
        badge.textContent = '🏆 1ST PLACE WINNER!';
        badge.className = 'podium-badge winner-badge';
        title.textContent = 'GLORIOUS VICTORY!';
      } else if (position === 2) {
        badge.textContent = '🥈 2ND PLACE';
        badge.className = 'podium-badge runner-up-badge';
        title.textContent = 'GREAT PODIUM FINISH!';
      } else {
        badge.textContent = '🥉 3RD PLACE';
        badge.className = 'podium-badge third-badge';
        title.textContent = 'RACE COMPLETED!';
      }

      resTime.textContent = formatTime(totalTimeSec);
      resLap.textContent = formatTime(bestLapSec);
      resWinCash.textContent = `+$${winCash}`;
      resDriftCash.textContent = `+$${driftCash}`;
      resTotal.textContent = `+$${totalCash}`;

      modal.classList.remove('hidden');

      // Bind modal buttons
      this.container.querySelector('#btn-res-retry').onclick = () => {
        modal.classList.add('hidden');
        this.resetPlayerToGrid();
        this.bot1.resetToGrid();
        this.bot2.resetToGrid();
        this.startCountdown();
      };

      this.container.querySelector('#btn-res-tracks').onclick = () => {
        window.dispatchEvent(new CustomEvent('autorace:navigate', { detail: { view: 'tracks' } }));
      };

      this.container.querySelector('#btn-res-menu').onclick = () => {
        window.dispatchEvent(new CustomEvent('autorace:navigate', { detail: { view: 'menu' } }));
      };
    }

    updateHUD(now) {
      if (!this.playerVehicle) return;
      const v = this.playerVehicle;

      // Speedometer
      const speedKmh = Math.round(Math.abs(v.speed) * 3.6);
      const speedEl = this.container.querySelector('#hud-speed');
      if (speedEl) speedEl.textContent = speedKmh;

      // Nitro bar
      const nitroBar = this.container.querySelector('#hud-nitro-bar');
      if (nitroBar) nitroBar.style.width = `${v.nitro}%`;

      // Position (1st, 2nd, 3rd)
      const rank = this.getLeaderboardPosition();
      const posEl = this.container.querySelector('#hud-pos');
      if (posEl) posEl.innerHTML = `${rank}<small>/3</small>`;

      // Lap count
      const lapEl = this.container.querySelector('#hud-lap');
      if (lapEl) lapEl.textContent = `${Math.min(this.totalLaps, this.currentLap)} / ${this.totalLaps}`;

      // Time
      if (this.raceState === 'racing') {
        const elapsedSec = (now - this.raceStartTime) / 1000;
        const mins = Math.floor(elapsedSec / 60);
        const secs = (elapsedSec % 60).toFixed(1);
        const timeEl = this.container.querySelector('#hud-time');
        if (timeEl) timeEl.textContent = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }

      // Stunt Cash
      const cashEl = this.container.querySelector('#hud-drift-cash');
      if (cashEl) cashEl.textContent = `+$${this.inRaceDriftCash}`;

      // Render Mini-Map
      this.drawMinimap();
    }

    drawMinimap() {
      if (!this.minimapCtx || !this.track3D) return;
      const ctx = this.minimapCtx;
      const w = this.minimapCanvas.width;
      const h = this.minimapCanvas.height;

      ctx.clearRect(0, 0, w, h);

      // Track bounding box normalization
      const pts = this.track3D.waypoints;
      if (!pts || !pts.length) return;

      const scale = 0.16;
      const offsetX = w / 2 + 10;
      const offsetZ = h / 2 + 10;

      // Draw track path
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 4;
      pts.forEach((pt, i) => {
        const mx = offsetX + pt.x * scale;
        const mz = offsetZ + pt.z * scale;
        if (i === 0) ctx.moveTo(mx, mz);
        else ctx.lineTo(mx, mz);
      });
      ctx.closePath();
      ctx.stroke();

      // Draw Bot 1 (Orange)
      if (this.bot1 && this.bot1.vehicle) {
        ctx.fillStyle = '#f77f00';
        ctx.beginPath();
        ctx.arc(offsetX + this.bot1.vehicle.position.x * scale, offsetZ + this.bot1.vehicle.position.z * scale, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Bot 2 (Purple)
      if (this.bot2 && this.bot2.vehicle) {
        ctx.fillStyle = '#b5179e';
        ctx.beginPath();
        ctx.arc(offsetX + this.bot2.vehicle.position.x * scale, offsetZ + this.bot2.vehicle.position.z * scale, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Player (Cyan) with glowing pulse
      if (this.playerVehicle) {
        ctx.fillStyle = '#00f5d4';
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(offsetX + this.playerVehicle.position.x * scale, offsetZ + this.playerVehicle.position.z * scale, 5.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    }

    startLoop() {
      let lastTime = performance.now();

      const loop = (now) => {
        this.animId = requestAnimationFrame(loop);
        const dt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        // 1. Update Player Vehicle
        if (this.playerVehicle) {
          const activeControls = (this.raceState === 'racing') ? this.keys : {
            throttle: false, brake: false, left: false, right: false, handbrake: false, nitro: false
          };
          this.playerVehicle.updatePhysics(dt, activeControls);
        }

        // 2. Update AI Bots
        if (this.bot1 && this.raceState === 'racing') {
          this.bot1.update(dt, this.playerVehicle, this.bot2);
        }
        if (this.bot2 && this.raceState === 'racing') {
          this.bot2.update(dt, this.playerVehicle, this.bot1);
        }

        // 3. Drift & Apex Rewards
        this.updateDriftAndRewards(dt, now);

        // 4. Checkpoints & Lap Detection
        this.checkCheckpointsAndLaps(now);

        // 5. Update Camera
        this.updateCamera(dt);

        // 6. Update HUD
        this.updateHUD(now);

        // 7. Render 3D Scene
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };

      loop(lastTime);
    }
  }

  window.AutoRaceGameEngine = GameEngine;
})();
