// garage.js - AutoRace 3D Garage & Vehicle Customizer
(function() {
  'use strict';

  class GarageManager {
    constructor() {
      this.container = null;
      this.canvasContainer = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.turntable = null;
      this.currentVehicle = null;
      this.animId = null;

      // Interaction
      this.isDragging = false;
      this.prevMouseX = 0;
      this.rotationSpeed = 0.005;
      this.autoRotate = true;
    }

    init(containerEl) {
      this.container = containerEl;
      this.renderUI();
      this.setup3DScene();
      this.loadActiveCar();
      this.startLoop();
    }

    destroy() {
      // Wrapped in try/catch so a cleanup failure can never again block
      // navigation back to the menu (this is what caused the black screen).
      try {
        if (this.animId) {
          cancelAnimationFrame(this.animId);
          this.animId = null;
        }
      } catch (err) { console.warn('AutoRace: garage animId cleanup failed', err); }

      try {
        if (this._onResizeBound) {
          window.removeEventListener('resize', this._onResizeBound);
          this._onResizeBound = null;
        }
        if (this._onMouseMoveBound) {
          window.removeEventListener('mousemove', this._onMouseMoveBound);
          this._onMouseMoveBound = null;
        }
        if (this._onMouseUpBound) {
          window.removeEventListener('mouseup', this._onMouseUpBound);
          this._onMouseUpBound = null;
        }
      } catch (err) { console.warn('AutoRace: garage listener cleanup failed', err); }

      try {
        if (this.renderer) {
          // BUGFIX: this used to call
          // this.renderer.domElement.parentNode.removeChild(this.renderer.domElement.parentNode)
          // which asks a node to remove ITSELF from itself and always threw,
          // aborting whatever screen change triggered destroy().
          if (this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
          }
          this.renderer.dispose();
          this.renderer = null;
        }
      } catch (err) { console.warn('AutoRace: garage renderer cleanup failed', err); }

      this.scene = null;
      this.camera = null;
      this.turntable = null;
      this.currentVehicle = null;
    }

    setup3DScene() {
      this.canvasContainer = this.container.querySelector('#garage-canvas-container');
      if (!this.canvasContainer) return;

      const width = this.canvasContainer.clientWidth || 600;
      const height = this.canvasContainer.clientHeight || 380;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0a0d16);

      this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      this.camera.position.set(4.5, 2.2, 5.5);
      this.camera.lookAt(0, 0.4, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
      this.renderer.shadowMap.enabled = true;
      this.canvasContainer.appendChild(this.renderer.domElement);

      // Lighting
      const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
      this.scene.add(ambLight);

      const spotLight = new THREE.SpotLight(0x00f5d4, 2.5);
      spotLight.position.set(5, 8, 4);
      spotLight.angle = Math.PI / 4;
      spotLight.penumbra = 0.5;
      this.scene.add(spotLight);

      const rearLight = new THREE.DirectionalLight(0xff0077, 1.2);
      rearLight.position.set(-5, 4, -4);
      this.scene.add(rearLight);

      // Rotating Turntable Base
      this.turntable = new THREE.Group();
      this.scene.add(this.turntable);

      // Floor Platform
      const discGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.25, 48);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0x161a29,
        roughness: 0.3,
        metalness: 0.8
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.y = -0.125;
      disc.receiveShadow = true;
      this.turntable.add(disc);

      // Glowing Neon Ring on Turntable Edge
      const ringGeo = new THREE.RingGeometry(3.4, 3.6, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      this.turntable.add(ring);

      // Mouse drag rotation
      this.canvasContainer.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.prevMouseX = e.clientX;
        this.autoRotate = false;
      });

      this._onMouseMoveBound = (e) => {
        if (!this.isDragging || !this.turntable) return;
        const deltaX = e.clientX - this.prevMouseX;
        this.turntable.rotation.y += deltaX * 0.01;
        this.prevMouseX = e.clientX;
      };
      window.addEventListener('mousemove', this._onMouseMoveBound);

      this._onMouseUpBound = () => {
        this.isDragging = false;
        setTimeout(() => { this.autoRotate = true; }, 3000);
      };
      window.addEventListener('mouseup', this._onMouseUpBound);

      // Touch controls
      this.canvasContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          this.isDragging = true;
          this.prevMouseX = e.touches[0].clientX;
          this.autoRotate = false;
        }
      });

      this.canvasContainer.addEventListener('touchmove', (e) => {
        if (!this.isDragging || !this.turntable || e.touches.length !== 1) return;
        const deltaX = e.touches[0].clientX - this.prevMouseX;
        this.turntable.rotation.y += deltaX * 0.01;
        this.prevMouseX = e.touches[0].clientX;
      });

      this.canvasContainer.addEventListener('touchend', () => {
        this.isDragging = false;
        setTimeout(() => { this.autoRotate = true; }, 3000);
      });

      // Window resize
      this._onResizeBound = () => {
        if (!this.canvasContainer || !this.renderer || !this.camera) return;
        const w = this.canvasContainer.clientWidth;
        const h = this.canvasContainer.clientHeight;
        if (w && h) {
          this.camera.aspect = w / h;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(w, h);
        }
      };
      window.addEventListener('resize', this._onResizeBound);
    }

    loadActiveCar() {
      const storage = window.AutoRaceStorage;
      const selectedCarId = storage.getSelectedCar();

      if (this.currentVehicle && this.currentVehicle.mesh) {
        this.turntable.remove(this.currentVehicle.mesh);
      }

      this.currentVehicle = new window.AutoRaceVehicle3D(selectedCarId, false);
      this.turntable.add(this.currentVehicle.mesh);
      this.updateStatBars();
    }

    updateStatBars() {
      if (!this.currentVehicle || !this.container) return;
      const v = this.currentVehicle;

      const speedEl = this.container.querySelector('#stat-speed-val');
      const accelEl = this.container.querySelector('#stat-accel-val');
      const handlingEl = this.container.querySelector('#stat-handling-val');
      const driftEl = this.container.querySelector('#stat-drift-val');

      const speedBar = this.container.querySelector('#bar-speed');
      const accelBar = this.container.querySelector('#bar-accel');
      const handlingBar = this.container.querySelector('#bar-handling');
      const driftBar = this.container.querySelector('#bar-drift');

      if (speedEl) speedEl.textContent = `${Math.round(v.maxSpeedKmh)} km/h`;
      if (accelEl) accelEl.textContent = `${Math.round(v.accelerationRate * 2.5)} / 100`;
      if (handlingEl) handlingEl.textContent = `${Math.round(v.handlingScore)} / 100`;
      if (driftEl) driftEl.textContent = `${Math.round(v.driftScoreBonus)} / 100`;

      if (speedBar) speedBar.style.width = `${Math.min(100, (v.maxSpeedKmh / 240) * 100)}%`;
      if (accelBar) accelBar.style.width = `${Math.min(100, (v.accelerationRate * 2.5))}%`;
      if (handlingBar) handlingBar.style.width = `${Math.min(100, v.handlingScore * 1.3)}%`;
      if (driftBar) driftBar.style.width = `${Math.min(100, v.driftScoreBonus * 1.2)}%`;
    }

    startLoop() {
      const animate = () => {
        this.animId = requestAnimationFrame(animate);
        if (this.autoRotate && this.turntable) {
          this.turntable.rotation.y += 0.008;
        }
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate();
    }

    renderUI() {
      const storage = window.AutoRaceStorage;
      const ownedCars = storage.getOwnedCars();
      const selectedCar = storage.getSelectedCar();
      const inventory = storage.getInventory();
      const upgrades = storage.getCarUpgrades(selectedCar);
      const catalog = window.AutoRaceCatalog;

      let carSwitcherHtml = `<div class="garage-car-switcher">`;
      ownedCars.forEach(carId => {
        const carInfo = window.AutoRaceCarModels[carId];
        const isSelected = (carId === selectedCar);
        carSwitcherHtml += `
          <button class="garage-car-btn ${isSelected ? 'active' : ''}" data-car="${carId}">
            <strong>${carInfo ? carInfo.name : carId}</strong>
            <small>${isSelected ? 'DRIVING' : 'SWITCH'}</small>
          </button>
        `;
      });
      carSwitcherHtml += `</div>`;

      // Upgrades selector
      const slots = [
        { slot: 'engine', label: 'Engine', icon: '⚙️' },
        { slot: 'transmission', label: 'Transmission', icon: '🕹️' },
        { slot: 'exhaust', label: 'Exhaust', icon: '💨' },
        { slot: 'tires', label: 'Tires', icon: '🛞' }
      ];

      let partsHtml = `<div class="garage-parts-grid">`;
      slots.forEach(s => {
        const ownedInSlot = inventory[s.slot] || ['stock'];
        const equippedId = upgrades[s.slot] || 'stock';

        partsHtml += `
          <div class="part-slot-box">
            <div class="part-slot-title">${s.icon} ${s.label}</div>
            <select class="part-select" data-slot="${s.slot}">
              ${ownedInSlot.map(itemId => {
                const itemDef = catalog[s.slot].find(x => x.id === itemId);
                const isEq = itemId === equippedId;
                return `<option value="${itemId}" ${isEq ? 'selected' : ''}>${itemDef ? itemDef.name : itemId}</option>`;
              }).join('')}
            </select>
          </div>
        `;
      });
      partsHtml += `</div>`;

      // Paint colors picker
      const ownedPaints = inventory.paints || [];
      const currentPaint = upgrades.paint;
      let paintHtml = `<div class="garage-paint-swatches">`;
      ownedPaints.forEach(hex => {
        const isSel = currentPaint.toLowerCase() === hex.toLowerCase();
        paintHtml += `
          <div class="paint-chip ${isSel ? 'selected' : ''}" style="background-color: ${hex};" data-hex="${hex}"></div>
        `;
      });
      paintHtml += `</div>`;

      this.container.innerHTML = `
        <div class="garage-wrapper">
          <div class="garage-top-bar">
            <div>
              <h2 class="section-title">GARAGE & TUNING LAB</h2>
              <p class="section-subtitle">Inspect your vehicle, equip tuning upgrades, and change colors.</p>
            </div>
            <div class="wallet-badge">
              <span class="coin-icon">💰</span>
              <span class="wallet-val">$${storage.getCash()}</span>
            </div>
          </div>

          <div class="garage-layout">
            <!-- Left: 3D Viewport -->
            <div class="garage-viewport-panel">
              <div id="garage-canvas-container" class="garage-canvas-container">
                <div class="canvas-hint">Drag to inspect 360°</div>
              </div>

              <!-- Performance Radar Bars -->
              <div class="performance-stats-card">
                <div class="stat-row">
                  <span>Top Speed</span>
                  <div class="stat-bar-bg"><div id="bar-speed" class="stat-bar-fill speed-fill"></div></div>
                  <strong id="stat-speed-val">160 km/h</strong>
                </div>
                <div class="stat-row">
                  <span>Acceleration</span>
                  <div class="stat-bar-bg"><div id="bar-accel" class="stat-bar-fill accel-fill"></div></div>
                  <strong id="stat-accel-val">40 / 100</strong>
                </div>
                <div class="stat-row">
                  <span>Handling & Grip</span>
                  <div class="stat-bar-bg"><div id="bar-handling" class="stat-bar-fill handling-fill"></div></div>
                  <strong id="stat-handling-val">40 / 100</strong>
                </div>
                <div class="stat-row">
                  <span>Drift Agility</span>
                  <div class="stat-bar-bg"><div id="bar-drift" class="stat-bar-fill drift-fill"></div></div>
                  <strong id="stat-drift-val">50 / 100</strong>
                </div>
              </div>
            </div>

            <!-- Right: Customizer Controls -->
            <div class="garage-controls-panel">
              <div class="panel-section">
                <h3>Select Vehicle</h3>
                ${carSwitcherHtml}
              </div>

              <div class="panel-section">
                <h3>Installed Upgrades</h3>
                <p class="section-hint">Choose from parts unlocked in Market.</p>
                ${partsHtml}
              </div>

              <div class="panel-section">
                <h3>Paint & Livery Color</h3>
                ${paintHtml}
              </div>
            </div>
          </div>
        </div>
      `;

      this.bindEvents();
    }

    bindEvents() {
      const storage = window.AutoRaceStorage;

      // Car switch buttons
      this.container.querySelectorAll('.garage-car-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const carId = e.currentTarget.getAttribute('data-car');
          storage.setSelectedCar(carId);
          if (window.AutoRaceAudio) window.AutoRaceAudio.playClick();
          this.renderUI();
          this.loadActiveCar();
        });
      });

      // Part select change
      this.container.querySelectorAll('.part-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const slot = e.currentTarget.getAttribute('data-slot');
          const itemId = e.currentTarget.value;
          storage.equipUpgrade(storage.getSelectedCar(), slot, itemId);
          if (this.currentVehicle) {
            this.currentVehicle.setUpgrade(slot, itemId);
          }
          this.updateStatBars();
          if (window.AutoRaceAudio) window.AutoRaceAudio.playClick();
        });
      });

      // Paint chip click
      this.container.querySelectorAll('.paint-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          const hex = e.currentTarget.getAttribute('data-hex');
          storage.setCarPaint(storage.getSelectedCar(), hex);
          this.container.querySelectorAll('.paint-chip').forEach(c => c.classList.remove('selected'));
          e.currentTarget.classList.add('selected');
          if (this.currentVehicle) {
            this.currentVehicle.setPaintColor(hex);
          }
          if (window.AutoRaceAudio) window.AutoRaceAudio.playClick();
        });
      });
    }
  }

  window.AutoRaceGarage = new GarageManager();
})();
