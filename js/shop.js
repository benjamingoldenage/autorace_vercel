// shop.js - AutoRace Market / Shop System
(function() {
  'use strict';

  const SHOP_CATALOG = {
    cars: [
      {
        id: 'apex_gt',
        name: 'Apex GT',
        subtitle: 'Balanced Street Tuner',
        price: 0,
        badge: 'Starter',
        stats: { speed: '160 km/h', accel: 'Medium', handling: 'High', drift: 'Good' },
        desc: 'Reliable rear-wheel-drive street machine with excellent drift balance.'
      },
      {
        id: 'viper_r',
        name: 'Viper R',
        subtitle: 'American Muscle Beast',
        price: 350,
        badge: 'Muscle',
        stats: { speed: '185 km/h', accel: 'Very High', handling: 'Medium', drift: 'Raw Power' },
        desc: 'Roaring V8 with aggressive acceleration on straightaways.'
      },
      {
        id: 'drift_king',
        name: 'Drift King 240',
        subtitle: 'Drift Legend',
        price: 600,
        badge: 'Pro Tuner',
        stats: { speed: '175 km/h', accel: 'High', handling: 'Sharp', drift: 'Apex King' },
        desc: 'Specially tuned suspension for maximum drift angle and huge cash multipliers.'
      },
      {
        id: 'hyperion_evo',
        name: 'Hyperion EVO',
        subtitle: 'Apex Hypercar',
        price: 1000,
        badge: 'Hypercar',
        stats: { speed: '215 km/h', accel: 'Extreme', handling: 'Extreme', drift: 'Fast Grip' },
        desc: 'Cutting-edge aerodynamics and twin-turbo hypercar performance.'
      }
    ],
    exhaust: [
      {
        id: 'stock',
        name: 'Stock OEM Exhaust',
        price: 0,
        badge: 'Standard',
        stats: '+0 km/h | Normal Sound',
        desc: 'Standard factory exhaust system.'
      },
      {
        id: 'sport',
        name: 'Sport Twin-Pipe',
        price: 100,
        badge: '+8 km/h',
        stats: '+8 Top Speed | +5 Nitro Boost',
        desc: 'Deep rumble and improved exhaust flow for higher top end.'
      },
      {
        id: 'titanium',
        name: 'Titanium Race Exhaust',
        price: 250,
        badge: '+18 km/h',
        stats: '+18 Top Speed | +12 Nitro Boost | Blue Flame',
        desc: 'Lightweight titanium construction with explosive nitro flames.'
      }
    ],
    tires: [
      {
        id: 'stock',
        name: 'Stock Street Steelies',
        price: 0,
        badge: 'Standard',
        stats: '+0 Handling',
        desc: 'Factory all-weather radial tires.'
      },
      {
        id: 'sport',
        name: 'Sport Radial Alloys',
        price: 80,
        badge: '+10 Grip',
        stats: '+8 Handling | +6 Drift Stability',
        desc: 'Lightweight alloy wheels with sticky high-grip compound.'
      },
      {
        id: 'drift',
        name: 'Pro Drift Slicks (Gold)',
        price: 200,
        badge: '+Apex Slip',
        stats: '+14 Handling | +18 Drift Agility',
        desc: 'Competition drift slicks engineered for smooth sideways slides.'
      }
    ],
    engine: [
      {
        id: 'stock',
        name: 'Stock 2.0L Engine',
        price: 0,
        badge: 'Standard',
        stats: 'Base Output',
        desc: 'Factory naturally aspirated 4-cylinder.'
      },
      {
        id: 'turbo_s1',
        name: 'Turbo Stage 1 Intercooler',
        price: 150,
        badge: '+12 km/h',
        stats: '+12 Top Speed | +12 Acceleration',
        desc: 'Bolt-on turbocharger providing punchy mid-range boost.'
      },
      {
        id: 'twinturbo_v8',
        name: 'Twin-Turbo V8 Engine Swap',
        price: 350,
        badge: '+28 km/h',
        stats: '+28 Top Speed | +26 Acceleration',
        desc: 'Monstrous racing engine delivering massive horsepower.'
      }
    ],
    transmission: [
      {
        id: 'stock',
        name: '5-Speed Manual',
        price: 0,
        badge: 'Standard',
        stats: 'Base Shift Speed',
        desc: 'Standard manual H-pattern gearbox.'
      },
      {
        id: 'quickshift',
        name: 'Quickshift Sport Gearbox',
        price: 100,
        badge: '+10 Accel',
        stats: '+10 Acceleration | Reduced Shift Lag',
        desc: 'Short throw shifter with optimized gear ratios.'
      },
      {
        id: 'sequential',
        name: 'Sequential Racing Transmission',
        price: 250,
        badge: '+22 Accel',
        stats: '+22 Acceleration | Instant Shifts',
        desc: 'Ultra-fast paddle sequential transmission with seamless power.'
      }
    ],
    paints: [
      { id: '#e63946', name: 'Crimson Red', price: 40, hex: '#e63946' },
      { id: '#4361ee', name: 'Electric Blue', price: 40, hex: '#4361ee' },
      { id: '#06d6a0', name: 'Cyber Mint', price: 40, hex: '#06d6a0' },
      { id: '#ffb703', name: 'Sunset Gold', price: 40, hex: '#ffb703' },
      { id: '#7209b7', name: 'Midnight Violet', price: 40, hex: '#7209b7' },
      { id: '#1a1a1a', name: 'Stealth Black', price: 40, hex: '#1a1a1a' },
      { id: '#f72585', name: 'Neon Hot Pink', price: 40, hex: '#f72585' },
      { id: '#f8f9fa', name: 'Pearl White', price: 40, hex: '#f8f9fa' }
    ]
  };

  class ShopManager {
    constructor() {
      this.activeTab = 'cars';
      this.container = null;
    }

    init(containerEl) {
      this.container = containerEl;
      this.render();
    }

    setTab(tabName) {
      this.activeTab = tabName;
      this.render();
      if (window.AutoRaceAudio) window.AutoRaceAudio.playClick();
    }

    render() {
      if (!this.container) return;
      const storage = window.AutoRaceStorage;
      const currentCash = storage.getCash();
      const ownedCars = storage.getOwnedCars();
      const inventory = storage.getInventory();

      const tabs = [
        { id: 'cars', label: 'Cars' },
        { id: 'engine', label: 'Engine (Motor)' },
        { id: 'transmission', label: 'Transmission (Şanzıman)' },
        { id: 'exhaust', label: 'Exhaust (Egzoz)' },
        { id: 'tires', label: 'Tires (Tekerlek)' },
        { id: 'paints', label: 'Paints (Boya)' }
      ];

      let tabsHtml = `<div class="shop-tabs">`;
      tabs.forEach(tab => {
        const activeClass = (tab.id === this.activeTab) ? 'active' : '';
        tabsHtml += `<button class="shop-tab-btn ${activeClass}" data-tab="${tab.id}">${tab.label}</button>`;
      });
      tabsHtml += `</div>`;

      let gridHtml = `<div class="shop-items-grid">`;

      if (this.activeTab === 'cars') {
        SHOP_CATALOG.cars.forEach(car => {
          const isOwned = ownedCars.includes(car.id);
          const canAfford = currentCash >= car.price;
          const isSelected = storage.getSelectedCar() === car.id;

          gridHtml += `
            <div class="shop-card ${isOwned ? 'owned' : ''}">
              <div class="card-header">
                <span class="card-badge">${car.badge}</span>
                <span class="card-price">${isOwned ? (isSelected ? 'SELECTED' : 'OWNED') : `$${car.price}`}</span>
              </div>
              <h3 class="card-title">${car.name}</h3>
              <p class="card-subtitle">${car.subtitle}</p>
              <div class="card-stats">
                <div><span>Speed:</span> <strong>${car.stats.speed}</strong></div>
                <div><span>Acceleration:</span> <strong>${car.stats.accel}</strong></div>
                <div><span>Handling:</span> <strong>${car.stats.handling}</strong></div>
                <div><span>Drift:</span> <strong>${car.stats.drift}</strong></div>
              </div>
              <p class="card-desc">${car.desc}</p>
              <div class="card-action">
                ${isOwned ? 
                  `<button class="btn btn-secondary ${isSelected ? 'disabled' : ''}" data-action="select-car" data-id="${car.id}">
                    ${isSelected ? 'Currently Selected' : 'Drive This Car'}
                  </button>` :
                  `<button class="btn btn-primary ${canAfford ? '' : 'disabled'}" data-action="buy-car" data-id="${car.id}" data-price="${car.price}">
                    ${canAfford ? `Buy for $${car.price}` : 'Insufficient Cash'}
                  </button>`
                }
              </div>
            </div>
          `;
        });
      } else if (this.activeTab === 'paints') {
        const ownedPaints = inventory.paints || [];
        const currentCar = storage.getSelectedCar();
        const activePaint = storage.getCarUpgrades(currentCar).paint;

        SHOP_CATALOG.paints.forEach(paint => {
          const isOwned = ownedPaints.includes(paint.id) || paint.price === 0;
          const canAfford = currentCash >= paint.price;
          const isCurrent = (activePaint && activePaint.toLowerCase() === paint.hex.toLowerCase());

          gridHtml += `
            <div class="shop-card paint-card ${isOwned ? 'owned' : ''}">
              <div class="paint-swatch" style="background-color: ${paint.hex};"></div>
              <h3 class="card-title">${paint.name}</h3>
              <span class="card-price">${isOwned ? (isCurrent ? 'APPLIED' : 'OWNED') : `$${paint.price}`}</span>
              <div class="card-action">
                ${isOwned ?
                  `<button class="btn btn-secondary ${isCurrent ? 'disabled' : ''}" data-action="apply-paint" data-id="${paint.id}">
                    ${isCurrent ? 'Active Paint' : 'Apply to Car'}
                  </button>` :
                  `<button class="btn btn-primary ${canAfford ? '' : 'disabled'}" data-action="buy-paint" data-id="${paint.id}" data-price="${paint.price}">
                    ${canAfford ? `Buy for $${paint.price}` : 'Insufficient Cash'}
                  </button>`
                }
              </div>
            </div>
          `;
        });
      } else {
        // Upgrade Parts (engine, transmission, exhaust, tires)
        const items = SHOP_CATALOG[this.activeTab] || [];
        const ownedItems = inventory[this.activeTab] || ['stock'];
        const currentCar = storage.getSelectedCar();
        const equippedItem = storage.getCarUpgrades(currentCar)[this.activeTab];

        items.forEach(item => {
          const isOwned = ownedItems.includes(item.id) || item.price === 0;
          const canAfford = currentCash >= item.price;
          const isEquipped = equippedItem === item.id;

          gridHtml += `
            <div class="shop-card ${isOwned ? 'owned' : ''}">
              <div class="card-header">
                <span class="card-badge">${item.badge}</span>
                <span class="card-price">${isOwned ? (isEquipped ? 'EQUIPPED' : 'OWNED') : `$${item.price}`}</span>
              </div>
              <h3 class="card-title">${item.name}</h3>
              <div class="card-stats">
                <strong>${item.stats}</strong>
              </div>
              <p class="card-desc">${item.desc}</p>
              <div class="card-action">
                ${isOwned ?
                  `<button class="btn btn-secondary ${isEquipped ? 'disabled' : ''}" data-action="equip-upgrade" data-slot="${this.activeTab}" data-id="${item.id}">
                    ${isEquipped ? 'Installed' : 'Equip on Car'}
                  </button>` :
                  `<button class="btn btn-primary ${canAfford ? '' : 'disabled'}" data-action="buy-upgrade" data-slot="${this.activeTab}" data-id="${item.id}" data-price="${item.price}">
                    ${canAfford ? `Buy for $${item.price}` : 'Insufficient Cash'}
                  </button>`
                }
              </div>
            </div>
          `;
        });
      }

      gridHtml += `</div>`;

      this.container.innerHTML = `
        <div class="shop-wrapper">
          <div class="shop-header">
            <h2 class="section-title">TUNING & PERFORMANCE MARKET</h2>
            <div class="wallet-badge">
              <span class="coin-icon">💰</span>
              <span class="wallet-val">$${currentCash}</span>
            </div>
          </div>
          ${tabsHtml}
          ${gridHtml}
        </div>
      `;

      this.bindEvents();
    }

    bindEvents() {
      if (!this.container) return;

      // Tab clicks
      this.container.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.setTab(e.currentTarget.getAttribute('data-tab'));
        });
      });

      // Actions (Buy & Equip)
      this.container.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const action = e.currentTarget.getAttribute('data-action');
          const id = e.currentTarget.getAttribute('data-id');
          const price = parseInt(e.currentTarget.getAttribute('data-price') || '0', 10);
          const slot = e.currentTarget.getAttribute('data-slot');

          this.handleAction(action, id, price, slot);
        });
      });
    }

    handleAction(action, id, price, slot) {
      const storage = window.AutoRaceStorage;
      if (window.AutoRaceAudio) window.AutoRaceAudio.playClick();

      if (action === 'buy-car') {
        if (storage.buyCar(id, price)) {
          if (window.AutoRaceAudio) window.AutoRaceAudio.playCashChime();
          this.showToast(`Vehicle Purchased! Go to Garage to inspect and drive.`);
          this.render();
        } else {
          this.showToast(`Not enough cash! Complete more races to earn $${price}.`, 'error');
        }
      } else if (action === 'select-car') {
        storage.setSelectedCar(id);
        this.showToast(`Car changed to ${id.toUpperCase()}!`);
        this.render();
      } else if (action === 'buy-upgrade') {
        if (storage.buyInventoryItem(slot, id, price)) {
          if (window.AutoRaceAudio) window.AutoRaceAudio.playCashChime();
          storage.equipUpgrade(storage.getSelectedCar(), slot, id);
          this.showToast(`Upgrade purchased and equipped!`);
          this.render();
        } else {
          this.showToast(`Not enough cash for this upgrade!`, 'error');
        }
      } else if (action === 'equip-upgrade') {
        storage.equipUpgrade(storage.getSelectedCar(), slot, id);
        this.showToast(`Part equipped on current vehicle!`);
        this.render();
      } else if (action === 'buy-paint') {
        if (storage.buyInventoryItem('paints', id, price)) {
          if (window.AutoRaceAudio) window.AutoRaceAudio.playCashChime();
          storage.setCarPaint(storage.getSelectedCar(), id);
          this.showToast(`New paint purchased and applied!`);
          this.render();
        } else {
          this.showToast(`Not enough cash for paint!`, 'error');
        }
      } else if (action === 'apply-paint') {
        storage.setCarPaint(storage.getSelectedCar(), id);
        this.showToast(`Paint color applied!`);
        this.render();
      }
    }

    showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `autorace-toast ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('visible');
      }, 10);
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
  }

  window.AutoRaceShop = new ShopManager();
  window.AutoRaceCatalog = SHOP_CATALOG;
})();
