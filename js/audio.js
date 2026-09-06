// audio.js - AutoRace Web Audio API Synthesizer & Music Engine
(function () {
  'use strict';
  // src/Audio.js içine ekleyin:
  const bgMusic = new Audio('/assets/audio/new_race_music.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.4;

  export function playMusic() {
    bgMusic.play().catch(e => console.log("Oynatma engellendi", e));
  }

  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.initialized = false;
      this.musicPlaying = false;
      this.musicTimer = null;
      this.musicStep = 0;

      // Master Gains
      this.masterGain = null;
      this.sfxGain = null;
      this.musicGain = null;

      // Engine Sound Nodes
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineFilter = null;
      this.engineGain = null;
      this.engineRunning = false;

      // Tire Screech Nodes
      this.screechNoise = null;
      this.screechFilter = null;
      this.screechGain = null;

      // Nitro Sound Nodes
      this.nitroGain = null;

      // Settings from storage
      this.settings = {
        musicVolume: 0.5,
        sfxVolume: 0.7,
        musicEnabled: true,
        sfxEnabled: true
      };

      if (window.AutoRaceStorage) {
        this.settings = window.AutoRaceStorage.getSettings();
      }
    }

    init() {
      if (this.initialized) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);

        // SFX Sub-bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.settings.sfxEnabled ? this.settings.sfxVolume : 0.0;
        this.sfxGain.connect(this.masterGain);

        // Music Sub-bus
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.settings.musicEnabled ? this.settings.musicVolume : 0.0;
        this.musicGain.connect(this.masterGain);

        this.setupTireScreech();
        this.setupEngineSound();
        this.initialized = true;

        if (this.settings.musicEnabled) {
          this.startMusic();
        }
      } catch (err) {
        console.warn('Web Audio API not supported or blocked:', err);
      }
    }

    resume() {
      if (!this.initialized) {
        this.init();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    setupEngineSound() {
      if (!this.ctx) return;
      // Dual oscillator for engine rumble
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.value = 55; // Low A1

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.value = 110; // A2 harmonic

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 250;
      this.engineFilter.Q.value = 3.0;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0; // Start muted until car starts

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineRunning = true;
    }

    updateEngine(speedKmh, maxSpeedKmh, throttle) {
      if (!this.ctx || !this.engineRunning || !this.settings.sfxEnabled) return;
      const speedRatio = Math.min(1.0, Math.max(0, speedKmh / (maxSpeedKmh || 160)));

      // Calculate simulated RPM and gear shifts
      const gear = Math.floor(speedRatio * 4);
      const gearSubRatio = (speedRatio * 4) % 1.0;
      const rpm = 800 + gearSubRatio * 5000 + (throttle ? 1200 : 0);

      const targetFreq = 45 + (rpm / 6000) * 110;
      const filterFreq = 180 + (rpm / 6000) * 850 + (throttle ? 300 : 0);

      const now = this.ctx.currentTime;
      this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

      // Volume based on throttle and movement
      const targetGain = 0.12 + speedRatio * 0.15 + (throttle ? 0.08 : 0);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
    }

    stopEngine() {
      if (!this.ctx || !this.engineGain) return;
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }

    setupTireScreech() {
      if (!this.ctx) return;
      // Procedural white noise buffer for tire squeal
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      this.screechFilter = this.ctx.createBiquadFilter();
      this.screechFilter.type = 'bandpass';
      this.screechFilter.frequency.value = 1600;
      this.screechFilter.Q.value = 5.0;

      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.value = 0.0;

      whiteNoise.connect(this.screechFilter);
      this.screechFilter.connect(this.screechGain);
      this.screechGain.connect(this.sfxGain);

      whiteNoise.start();
    }

    updateTireScreech(driftIntensity) {
      if (!this.ctx || !this.screechGain || !this.settings.sfxEnabled) return;
      const now = this.ctx.currentTime;
      const intensity = Math.min(1.0, Math.max(0, driftIntensity));
      if (intensity > 0.05) {
        this.screechGain.gain.setTargetAtTime(intensity * 0.28, now, 0.04);
        this.screechFilter.frequency.setTargetAtTime(1400 + intensity * 600, now, 0.04);
      } else {
        this.screechGain.gain.setTargetAtTime(0, now, 0.08);
      }
    }

    playNitroSound() {
      if (!this.ctx || !this.settings.sfxEnabled) return;
      const now = this.ctx.currentTime;

      // Sub-bass whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.65);
    }

    playCashChime() {
      if (!this.ctx || !this.settings.sfxEnabled) return;
      const now = this.ctx.currentTime;

      // High bell chimes (C6 -> G6)
      const freqs = [1046.50, 1567.98];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.18, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    }

    playCountdown(isGo) {
      if (!this.ctx || !this.settings.sfxEnabled) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

      gain.gain.setValueAtTime(isGo ? 0.35 : 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + (isGo ? 0.65 : 0.3));
    }

    playWinFanfare() {
      if (!this.ctx || !this.settings.sfxEnabled) return;
      const now = this.ctx.currentTime;
      // Celebratory arcade arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0.3, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.55);
      });
    }

    playClick() {
      if (!this.ctx || !this.settings.sfxEnabled) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.06);
    }

    // --- Procedural Synthwave Arcade Music Engine ---
    startMusic() {
      if (!this.ctx || this.musicPlaying) return;
      this.musicPlaying = true;
      this.musicStep = 0;

      const bpm = 124;
      const stepDuration = (60 / bpm) / 4; // 16th notes (~121ms)

      // Bass notes (D minor / F / C / G progression)
      const bassSeq = [
        73.42, 73.42, 146.83, 73.42, 73.42, 73.42, 146.83, 73.42, // D1 / D2
        87.31, 87.31, 174.61, 87.31, 87.31, 87.31, 174.61, 87.31, // F1 / F2
        65.41, 65.41, 130.81, 65.41, 65.41, 65.41, 130.81, 65.41, // C1 / C2
        98.00, 98.00, 196.00, 98.00, 98.00, 98.00, 196.00, 98.00  // G1 / G2
      ];

      // Arpeggiated synth lead notes
      const leadSeq = [
        293.66, 349.23, 440.00, 523.25, 440.00, 349.23, 293.66, 349.23,
        349.23, 440.00, 523.25, 659.25, 523.25, 440.00, 349.23, 440.00,
        261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 329.63,
        392.00, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00, 440.00
      ];

      const playNextBeat = () => {
        if (!this.musicPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;
        const step = this.musicStep % 32;

        // Kick Drum on quarter notes (steps 0, 4, 8, 12, 16, 20, 24, 28)
        if (step % 4 === 0) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(140, now);
          kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

          kickGain.gain.setValueAtTime(0.35, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.16);
        }

        // Snare / Clap on offbeats (steps 4, 12, 20, 28)
        if (step % 8 === 4) {
          const snareOsc = this.ctx.createOscillator();
          const snareGain = this.ctx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(220, now);

          snareGain.gain.setValueAtTime(0.18, now);
          snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          snareOsc.connect(snareGain);
          snareGain.connect(this.musicGain);
          snareOsc.start(now);
          snareOsc.stop(now + 0.19);
        }

        // Synthwave Rolling Bassline
        const bassFreq = bassSeq[step];
        if (bassFreq) {
          const bassOsc = this.ctx.createOscillator();
          const bassFilter = this.ctx.createBiquadFilter();
          const bassGain = this.ctx.createGain();

          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(bassFreq, now);

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(420, now);
          bassFilter.frequency.exponentialRampToValueAtTime(120, now + stepDuration * 0.9);

          bassGain.gain.setValueAtTime(0.2, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(this.musicGain);
          bassOsc.start(now);
          bassOsc.stop(now + stepDuration);
        }

        // Synth Lead Arpeggio
        if (step % 2 === 0) {
          const leadFreq = leadSeq[step];
          const leadOsc = this.ctx.createOscillator();
          const leadFilter = this.ctx.createBiquadFilter();
          const leadGain = this.ctx.createGain();

          leadOsc.type = 'square';
          leadOsc.frequency.setValueAtTime(leadFreq, now);

          leadFilter.type = 'lowpass';
          leadFilter.frequency.setValueAtTime(1500, now);

          leadGain.gain.setValueAtTime(0.08, now);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);

          leadOsc.connect(leadFilter);
          leadFilter.connect(leadGain);
          leadGain.connect(this.musicGain);
          leadOsc.start(now);
          leadOsc.stop(now + stepDuration * 1.6);
        }

        this.musicStep++;
      };

      this.musicTimer = setInterval(playNextBeat, stepDuration * 1000);
    }

    stopMusic() {
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
      this.musicPlaying = false;
    }

    toggleMusic() {
      this.resume();
      this.settings.musicEnabled = !this.settings.musicEnabled;
      if (this.musicGain) {
        this.musicGain.gain.value = this.settings.musicEnabled ? this.settings.musicVolume : 0.0;
      }
      if (this.settings.musicEnabled) {
        if (!this.musicPlaying) this.startMusic();
      } else {
        this.stopMusic();
      }
      if (window.AutoRaceStorage) {
        window.AutoRaceStorage.updateSettings({ musicEnabled: this.settings.musicEnabled });
      }
      return this.settings.musicEnabled;
    }

    toggleSFX() {
      this.resume();
      this.settings.sfxEnabled = !this.settings.sfxEnabled;
      if (this.sfxGain) {
        this.sfxGain.gain.value = this.settings.sfxEnabled ? this.settings.sfxVolume : 0.0;
      }
      if (window.AutoRaceStorage) {
        window.AutoRaceStorage.updateSettings({ sfxEnabled: this.settings.sfxEnabled });
      }
      return this.settings.sfxEnabled;
    }
  }

  window.AutoRaceAudio = new SoundEngine();
})();
