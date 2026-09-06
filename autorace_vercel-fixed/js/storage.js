// storage.js - AutoRace LocalStorage Manager
(function() {
  'use strict';

  const STORAGE_KEY = 'autorace_game_save_v1';

  // Default pre-seeded rival racers for leaderboard
  const DEFAULT_LEADERBOARD = [
    { name: 'Alex Vance', racesCompleted: 45, wins: 34, bestLap: '0:42.18' },
    { name: 'Ryosuke K.', racesCompleted: 40, wins: 31, bestLap: '0:43.05' },
    { name: 'Mia Toretto', racesCompleted: 35, wins: 24, bestLap: '0:44.20' },
    { name: 'Marcus Drift', racesCompleted: 29, wins: 18, bestLap: '0:45.10' },
    { name: 'Kenji Sato', racesCompleted: 22, wins: 13, bestLap: '0:46.85' },
    { name: 'Ghost Rider', racesCompleted: 16, wins: 9, bestLap: '0:48.30' }
  ];

  const DEFAULT_DATA = {
    cash: 150,
    ownedCars: ['apex_gt'],
    selectedCar: 'apex_gt',
    // Upgrades per car
    carUpgrades: {
      apex_gt: {
        exhaust: 'stock',
        tires: 'stock',
        engine: 'stock',
        transmission: 'stock',
        paint: '#e63946' // Red racer
      },
      viper_r: {
        exhaust: 'stock',
        tires: 'stock',
        engine: 'stock',
        transmission: 'stock',
        paint: '#4361ee' // Electric Blue
      },
      drift_king: {
        exhaust: 'stock',
        tires: 'stock',
        engine: 'stock',
        transmission: 'stock',
        paint: '#ffb703' // Gold Yellow
      },
      hyperion_evo: {
        exhaust: 'stock',
        tires: 'stock',
        engine: 'stock',
        transmission: 'stock',
        paint: '#06d6a0' // Cyber Mint
      }
    },
    // Owned upgrade items (bought in shop)
    inventory: {
      exhaust: ['stock'],
      tires: ['stock'],
      engine: ['stock'],
      transmission: ['stock'],
      paints: ['#e63946', '#ffffff', '#111111']
    },
    career: {
      playerName: 'SpeedDemon',
      racesCompleted: 0,
      wins: 0,
      totalDriftCash: 0,
      bestLaps: {
        neon_city: null,
        desert_canyon: null,
        coastal_sunset: null
      }
    },
    leaderboard: DEFAULT_LEADERBOARD,
    settings: {
      musicVolume: 0.6,
      sfxVolume: 0.8,
      musicEnabled: true,
      sfxEnabled: true,
      cameraView: 'chase' // 'chase', 'hood', 'orbit'
    }
  };

  class GameStorage {
    constructor() {
      this.data = this.load();
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
        const parsed = JSON.parse(raw);
        // Deep merge with defaults to avoid missing keys on updates
        return Object.assign({}, DEFAULT_DATA, parsed, {
          carUpgrades: Object.assign({}, DEFAULT_DATA.carUpgrades, parsed.carUpgrades),
          inventory: Object.assign({}, DEFAULT_DATA.inventory, parsed.inventory),
          career: Object.assign({}, DEFAULT_DATA.career, parsed.career),
          settings: Object.assign({}, DEFAULT_DATA.settings, parsed.settings),
          leaderboard: parsed.leaderboard && parsed.leaderboard.length ? parsed.leaderboard : DEFAULT_LEADERBOARD
        });
      } catch (err) {
        console.warn('Failed to load storage, using defaults', err);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (err) {
        console.error('Failed to save to localStorage', err);
      }
    }

    getCash() {
      return this.data.cash || 0;
    }

    addCash(amount) {
      if (amount <= 0) return this.getCash();
      this.data.cash = (this.data.cash || 0) + Math.round(amount);
      this.save();
      this.notifyCashChange();
      return this.data.cash;
    }

    spendCash(amount) {
      if (amount > (this.data.cash || 0)) return false;
      this.data.cash -= Math.round(amount);
      this.save();
      this.notifyCashChange();
      return true;
    }

    notifyCashChange() {
      window.dispatchEvent(new CustomEvent('autorace:cash-changed', {
        detail: { cash: this.data.cash }
      }));
    }

    getOwnedCars() {
      return this.data.ownedCars || ['apex_gt'];
    }

    buyCar(carId, price) {
      if (this.data.ownedCars.includes(carId)) return true;
      if (this.spendCash(price)) {
        this.data.ownedCars.push(carId);
        this.save();
        return true;
      }
      return false;
    }

    getSelectedCar() {
      return this.data.selectedCar || 'apex_gt';
    }

    setSelectedCar(carId) {
      if (this.data.ownedCars.includes(carId)) {
        this.data.selectedCar = carId;
        this.save();
        window.dispatchEvent(new CustomEvent('autorace:car-changed', { detail: { carId } }));
        return true;
      }
      return false;
    }

    getCarUpgrades(carId) {
      carId = carId || this.getSelectedCar();
      return this.data.carUpgrades[carId] || {
        exhaust: 'stock',
        tires: 'stock',
        engine: 'stock',
        transmission: 'stock',
        paint: '#e63946'
      };
    }

    getInventory() {
      return this.data.inventory;
    }

    hasInventoryItem(category, itemId) {
      const cat = this.data.inventory[category];
      return Array.isArray(cat) && cat.includes(itemId);
    }

    buyInventoryItem(category, itemId, price) {
      if (this.hasInventoryItem(category, itemId)) return true;
      if (this.spendCash(price)) {
        if (!this.data.inventory[category]) {
          this.data.inventory[category] = [];
        }
        this.data.inventory[category].push(itemId);
        this.save();
        return true;
      }
      return false;
    }

    equipUpgrade(carId, slot, itemId) {
      if (!this.data.carUpgrades[carId]) {
        this.data.carUpgrades[carId] = {
          exhaust: 'stock',
          tires: 'stock',
          engine: 'stock',
          transmission: 'stock',
          paint: '#e63946'
        };
      }
      this.data.carUpgrades[carId][slot] = itemId;
      this.save();
      window.dispatchEvent(new CustomEvent('autorace:upgrade-equipped', {
        detail: { carId, slot, itemId }
      }));
    }

    setCarPaint(carId, colorHex) {
      if (!this.data.carUpgrades[carId]) {
        this.data.carUpgrades[carId] = {};
      }
      this.data.carUpgrades[carId].paint = colorHex;
      this.save();
      window.dispatchEvent(new CustomEvent('autorace:paint-changed', {
        detail: { carId, paint: colorHex }
      }));
    }

    recordRaceResult(won, lapTimeSeconds, trackId, driftCashEarned) {
      this.data.career.racesCompleted = (this.data.career.racesCompleted || 0) + 1;
      if (won) {
        this.data.career.wins = (this.data.career.wins || 0) + 1;
      }
      this.data.career.totalDriftCash = (this.data.career.totalDriftCash || 0) + (driftCashEarned || 0);

      // Best lap tracking
      if (lapTimeSeconds && trackId) {
        const currentBest = this.data.career.bestLaps[trackId];
        if (!currentBest || lapTimeSeconds < currentBest) {
          this.data.career.bestLaps[trackId] = lapTimeSeconds;
        }
      }

      this.save();
      return {
        racesCompleted: this.data.career.racesCompleted,
        wins: this.data.career.wins
      };
    }

    getLeaderboard() {
      // Create unified leaderboard with player included
      const playerEntry = {
        name: this.data.career.playerName || 'Player 1 (You)',
        racesCompleted: this.data.career.racesCompleted || 0,
        wins: this.data.career.wins || 0,
        bestLap: this.getOverallBestLap() || '--:--.--',
        isPlayer: true
      };

      const rivals = this.data.leaderboard || DEFAULT_LEADERBOARD;
      const combined = [playerEntry, ...rivals];

      // User requested rule: "leaderboard mantığıda en çok yarış bitiren 1. gözüksün"
      // Primary sort: racesCompleted DESC, Secondary sort: wins DESC
      combined.sort((a, b) => {
        if (b.racesCompleted !== a.racesCompleted) {
          return b.racesCompleted - a.racesCompleted;
        }
        return b.wins - a.wins;
      });

      return combined;
    }

    getOverallBestLap() {
      const laps = Object.values(this.data.career.bestLaps).filter(v => v !== null);
      if (!laps.length) return null;
      const minSec = Math.min(...laps);
      const mins = Math.floor(minSec / 60);
      const secs = (minSec % 60).toFixed(2);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    getSettings() {
      return this.data.settings;
    }

    updateSettings(newSettings) {
      Object.assign(this.data.settings, newSettings);
      this.save();
      window.dispatchEvent(new CustomEvent('autorace:settings-changed', {
        detail: this.data.settings
      }));
    }

    resetAll() {
      localStorage.removeItem(STORAGE_KEY);
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      this.save();
    }
  }

  window.AutoRaceStorage = new GameStorage();
})();
