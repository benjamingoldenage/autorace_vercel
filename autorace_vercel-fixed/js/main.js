// main.js - AutoRace App Orchestration & Screen Navigation
(function() {
  'use strict';

  class AppController {
    constructor() {
      this.currentScreen = 'menu'; // 'menu', 'tracks', 'game', 'shop', 'garage', 'leaderboard'
      this.gameEngine = null;
      this.selectedTrack = 'neon_city';
    }

    init() {
      this.setupWalletSync();
      this.setupAudioButtons();
      this.setupMenuButtons();
      this.setupTrackSelection();
      this.setupGlobalEvents();
      this.showScreen('menu');

      // Resume audio on first user touch/click anywhere
      const firstTouch = () => {
        if (window.AutoRaceAudio) {
          window.AutoRaceAudio.resume();
        }
        window.removeEventListener('click', firstTouch);
        window.removeEventListener('keydown', firstTouch);
      };
      window.addEventListener('click', firstTouch);
      window.addEventListener('keydown', firstTouch);
    }

    setupWalletSync() {
      const updateBadges = () => {
        const cash = window.AutoRaceStorage ? window.AutoRaceStorage.getCash() : 150;
        document.querySelectorAll('.wallet-val').forEach(el => {
          el.textContent = `$${cash}`;
        });
      };
      window.addEventListener('autorace:cash-changed', updateBadges);
      updateBadges();
    }

    setupAudioButtons() {
      const musicBtn = document.getElementById('btn-toggle-music');
      const sfxBtn = document.getElementById('btn-toggle-sfx');

      const updateIcons = () => {
        const settings = window.AutoRaceStorage ? window.AutoRaceStorage.getSettings() : { musicEnabled: true, sfxEnabled: true };
        if (musicBtn) {
          musicBtn.innerHTML = settings.musicEnabled ? '🎵 <span class="btn-text">Music: ON</span>' : '🔇 <span class="btn-text">Music: OFF</span>';
          musicBtn.classList.toggle('off', !settings.musicEnabled);
        }
        if (sfxBtn) {
          sfxBtn.innerHTML = settings.sfxEnabled ? '🔊 <span class="btn-text">SFX: ON</span>' : '🔈 <span class="btn-text">SFX: OFF</span>';
          sfxBtn.classList.toggle('off', !settings.sfxEnabled);
        }
      };

      if (musicBtn) {
        musicBtn.addEventListener('click', () => {
          if (window.AutoRaceAudio) {
            window.AutoRaceAudio.toggleMusic();
            updateIcons();
          }
        });
      }

      if (sfxBtn) {
        sfxBtn.addEventListener('click', () => {
          if (window.AutoRaceAudio) {
            window.AutoRaceAudio.toggleSFX();
            updateIcons();
          }
        });
      }

      updateIcons();
    }

    setupMenuButtons() {
      // Main Menu navigation
      const btnPlay = document.getElementById('menu-btn-play');
      const btnShop = document.getElementById('menu-btn-shop');
      const btnGarage = document.getElementById('menu-btn-garage');
      const btnLeaderboard = document.getElementById('menu-btn-leaderboard');
      const btnControls = document.getElementById('menu-btn-controls');
      const modalControls = document.getElementById('modal-controls');
      const btnCloseControls = document.getElementById('btn-close-controls');

      if (btnPlay) {
        btnPlay.addEventListener('click', () => {
          this.playClick();
          this.showScreen('tracks');
        });
      }

      if (btnShop) {
        btnShop.addEventListener('click', () => {
          this.playClick();
          this.showScreen('shop');
        });
      }

      if (btnGarage) {
        btnGarage.addEventListener('click', () => {
          this.playClick();
          this.showScreen('garage');
        });
      }

      if (btnLeaderboard) {
        btnLeaderboard.addEventListener('click', () => {
          this.playClick();
          this.showScreen('leaderboard');
        });
      }

      if (btnControls && modalControls) {
        btnControls.addEventListener('click', () => {
          this.playClick();
          modalControls.classList.remove('hidden');
        });
      }

      if (btnCloseControls && modalControls) {
        btnCloseControls.addEventListener('click', () => {
          this.playClick();
          modalControls.classList.add('hidden');
        });
      }

      // Back buttons in screens
      document.querySelectorAll('.btn-back-menu').forEach(btn => {
        btn.addEventListener('click', () => {
          this.playClick();
          this.showScreen('menu');
        });
      });
    }

    setupTrackSelection() {
      const cards = document.querySelectorAll('.track-choice-card');
      const btnStart = document.getElementById('btn-start-race');

      cards.forEach(card => {
        card.addEventListener('click', () => {
          this.playClick();
          cards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedTrack = card.getAttribute('data-track');
        });
      });

      if (btnStart) {
        btnStart.addEventListener('click', () => {
          this.playClick();
          this.startRace(this.selectedTrack);
        });
      }
    }

    setupGlobalEvents() {
      window.addEventListener('autorace:navigate', (e) => {
        if (e.detail && e.detail.view) {
          this.showScreen(e.detail.view);
        }
      });

      // Escape key to pause or return from sub-screens
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (this.currentScreen === 'game') {
            const pauseModal = document.getElementById('pause-modal');
            if (pauseModal) pauseModal.classList.toggle('hidden');
          } else if (this.currentScreen !== 'menu') {
            this.showScreen('menu');
          }
        }
      });

      // Pause modal actions
      const resumeBtn = document.getElementById('btn-pause-resume');
      const quitBtn = document.getElementById('btn-pause-quit');
      const pauseModal = document.getElementById('pause-modal');

      if (resumeBtn && pauseModal) {
        resumeBtn.addEventListener('click', () => {
          this.playClick();
          pauseModal.classList.add('hidden');
        });
      }

      if (quitBtn && pauseModal) {
        quitBtn.addEventListener('click', () => {
          this.playClick();
          pauseModal.classList.add('hidden');
          this.stopRace();
          this.showScreen('menu');
        });
      }
    }

    showScreen(screenName) {
      this.currentScreen = screenName;

      // Hide all screens
      const screens = document.querySelectorAll('.screen-view');
      screens.forEach(s => s.classList.remove('active'));

      // If leaving game, tear down race engine.
      // Wrapped defensively: navigation must always succeed even if
      // cleanup itself throws (this is what used to cause the black
      // screen / "Exit" button not working).
      if (screenName !== 'game' && this.gameEngine) {
        try {
          this.stopRace();
        } catch (err) {
          console.warn('AutoRace: stopRace failed, forcing navigation anyway', err);
          this.gameEngine = null;
        }
      }

      // If leaving garage, tear down garage 3D scene
      if (screenName !== 'garage' && window.AutoRaceGarage) {
        try {
          window.AutoRaceGarage.destroy();
        } catch (err) {
          console.warn('AutoRace: garage destroy failed, forcing navigation anyway', err);
        }
      }

      // Show target screen
      const target = document.getElementById(`screen-${screenName}`);
      if (target) target.classList.add('active');

      // Initialize screen specifics
      if (screenName === 'shop' && window.AutoRaceShop) {
        const container = document.getElementById('shop-content');
        window.AutoRaceShop.init(container);
      } else if (screenName === 'garage' && window.AutoRaceGarage) {
        const container = document.getElementById('garage-content');
        window.AutoRaceGarage.init(container);
      } else if (screenName === 'leaderboard' && window.AutoRaceLeaderboard) {
        const container = document.getElementById('leaderboard-content');
        window.AutoRaceLeaderboard.init(container);
      }
    }

    startRace(trackId) {
      this.showScreen('game');
      const container = document.getElementById('game-content');
      this.gameEngine = new window.AutoRaceGameEngine();
      this.gameEngine.init(container, trackId);
    }

    stopRace() {
      if (this.gameEngine) {
        try {
          this.gameEngine.destroy();
        } catch (err) {
          console.warn('AutoRace: gameEngine.destroy() failed', err);
        }
        this.gameEngine = null;
      }
      const container = document.getElementById('game-content');
      if (container) container.innerHTML = '';
    }

    playClick() {
      if (window.AutoRaceAudio) window.AutoRaceAudio.playClick();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.AutoRaceApp = new AppController();
    window.AutoRaceApp.init();
  });
})();
