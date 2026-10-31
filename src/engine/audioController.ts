// Bomberman Roguelike v6.44.0 - Advanced Chiptune Audio Controller
// Handles Web Audio context, dedicated Music & SFX Gain nodes,
// retro synthesized background music (BGM), audio feedback previews, and localStorage persistence.

export interface AudioState {
  musicVolume: number; // 0 - 100
  sfxVolume: number;   // 0 - 100
}

const STORAGE_KEY_MUSIC = 'bomberman_music_volume';
const STORAGE_KEY_SFX = 'bomberman_sfx_volume';
const DEFAULT_MUSIC_VOLUME = 70;
const DEFAULT_SFX_VOLUME = 80;

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private musicVolume: number = DEFAULT_MUSIC_VOLUME;
  private sfxVolume: number = DEFAULT_SFX_VOLUME;

  // Background music scheduler
  private isMusicPlaying: boolean = false;
  private isGamePaused: boolean = false;
  private bgmIntervalId: number | null = null;
  private currentStep: number = 0;
  private nextNoteTime: number = 0;
  private previewDebounceTimer: number | null = null;

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedMusic = localStorage.getItem(STORAGE_KEY_MUSIC);
      if (savedMusic !== null) {
        const val = Number(savedMusic);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          this.musicVolume = Math.round(val);
        }
      }
      const savedSfx = localStorage.getItem(STORAGE_KEY_SFX);
      if (savedSfx !== null) {
        const val = Number(savedSfx);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          this.sfxVolume = Math.round(val);
        }
      }
    } catch (_) {}
  }

  public init(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtor) return null;
        this.ctx = new AudioCtor();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        const initialMusic = (this.musicVolume / 100) * 0.18; // Soft balanced chiptune level
        this.musicGain.gain.setValueAtTime(initialMusic, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        const initialSfx = (this.sfxVolume / 100) * 1.0;
        this.sfxGain.gain.setValueAtTime(initialSfx, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      } catch (e) {
        console.warn('AudioContext initialization failed:', e);
        return null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public getAudioContext(): AudioContext | null {
    if (!this.ctx) {
      return this.init();
    }
    return this.ctx;
  }

  public getMusicGainNode(): GainNode | null {
    this.getAudioContext();
    return this.musicGain;
  }

  public getSfxGainNode(): GainNode | null {
    this.getAudioContext();
    return this.sfxGain;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setMusicVolume(volume: number, saveToStorage = true): void {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.musicVolume = clamped;

    if (saveToStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_MUSIC, String(clamped));
      } catch (_) {}
    }

    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      // Effective gain: 0 at 0%, max 0.22 at 100% for comfortable listening
      const targetGain = (clamped / 100) * 0.22;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(targetGain, now, 0.05);
    }
  }

  public setSfxVolume(volume: number, saveToStorage = true): void {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.sfxVolume = clamped;

    if (saveToStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_SFX, String(clamped));
      } catch (_) {}
    }

    if (this.sfxGain && this.ctx) {
      const now = this.ctx.currentTime;
      const targetGain = (clamped / 100);
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setTargetAtTime(targetGain, now, 0.05);
    }
  }

  // Interactive preview sound when adjusting SFX in the pause menu
  public playPreviewSfx(): void {
    if (this.sfxVolume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // Debounce rapid slider events so they don't flood the audio thread
    if (this.previewDebounceTimer !== null) {
      window.clearTimeout(this.previewDebounceTimer);
    }

    this.previewDebounceTimer = window.setTimeout(() => {
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Pleasant retro double-beep
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

        const currentVol = (this.sfxVolume / 100);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08 * currentVol, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(gain);
        if (this.sfxGain) {
          gain.connect(this.sfxGain);
        } else {
          gain.connect(ctx.destination);
        }

        osc.start(now);
        osc.stop(now + 0.14);
      } catch (_) {}
    }, 40);
  }

  // --- RETRO CHIPTUNE BGM SYNTHESIZER ---
  // A jaunty, memorable 8-bit Bomberman-inspired dungeon theme
  // Bass progression: A2 -> F2 -> C3 -> G2
  // Melody: Arpeggiated pulse lead + chiptune snare noise
  private startChiptuneLoop(): void {
    if (this.bgmIntervalId !== null) return;
    this.isMusicPlaying = true;
    this.currentStep = 0;

    const ctx = this.getAudioContext();
    if (!ctx) return;
    this.nextNoteTime = ctx.currentTime + 0.05;

    // Run scheduler at 50ms intervals looking ahead ~100ms
    const tempo = 128; // BPM
    const stepDuration = 60 / tempo / 4; // 16th note in seconds (~0.117s)

    const bassNotes = [
      110.00, 110.00, 164.81, 110.00,  87.31,  87.31, 130.81,  87.31,
      130.81, 130.81, 196.00, 130.81,  98.00,  98.00, 146.83,  98.00
    ];

    const leadMelody = [
      440.00,      0, 523.25, 659.25, 698.46, 659.25, 523.25,      0,
      523.25, 587.33, 659.25,      0, 587.33, 523.25, 493.88, 523.25,
      659.25,      0, 698.46, 783.99, 880.00, 783.99, 659.25,      0,
      587.33, 659.25, 698.46, 587.33, 523.25, 493.88, 440.00,      0
    ];

    const scheduleNotes = () => {
      if (!this.isMusicPlaying || this.isGamePaused) return;
      if (!this.ctx || !this.musicGain) return;
      if (this.musicVolume <= 0) return;

      const currentTime = this.ctx.currentTime;
      while (this.nextNoteTime < currentTime + 0.15) {
        const t = this.nextNoteTime;
        const step = this.currentStep;

        // 1. Bassline (triangle wave)
        const bassFreq = bassNotes[step % bassNotes.length];
        if (bassFreq > 0) {
          try {
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = 'triangle';
            bassOsc.frequency.setValueAtTime(bassFreq, t);

            bassGain.gain.setValueAtTime(0.0001, t);
            bassGain.gain.linearRampToValueAtTime(0.25, t + 0.01);
            bassGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.9);

            bassOsc.connect(bassGain);
            bassGain.connect(this.musicGain);

            bassOsc.start(t);
            bassOsc.stop(t + stepDuration);
          } catch (_) {}
        }

        // 2. Melody Lead (square / pulse wave)
        const leadFreq = leadMelody[step % leadMelody.length];
        if (leadFreq > 0) {
          try {
            const leadOsc = this.ctx.createOscillator();
            const leadGain = this.ctx.createGain();
            leadOsc.type = 'square';
            leadOsc.frequency.setValueAtTime(leadFreq, t);

            leadGain.gain.setValueAtTime(0.0001, t);
            leadGain.gain.linearRampToValueAtTime(0.14, t + 0.012);
            leadGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.85);

            leadOsc.connect(leadGain);
            leadGain.connect(this.musicGain);

            leadOsc.start(t);
            leadOsc.stop(t + stepDuration);
          } catch (_) {}
        }

        // 3. Retro Percussion Beat (every 4th step: snare, every 2nd step: hi-hat)
        if (step % 4 === 2) {
          // Snare noise
          try {
            const snareOsc = this.ctx.createOscillator();
            const snareGain = this.ctx.createGain();
            snareOsc.type = 'sawtooth';
            snareOsc.frequency.setValueAtTime(140, t);
            snareOsc.frequency.exponentialRampToValueAtTime(40, t + 0.05);

            snareGain.gain.setValueAtTime(0.0001, t);
            snareGain.gain.linearRampToValueAtTime(0.08, t + 0.005);
            snareGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

            snareOsc.connect(snareGain);
            snareGain.connect(this.musicGain);

            snareOsc.start(t);
            snareOsc.stop(t + 0.07);
          } catch (_) {}
        }

        this.nextNoteTime += stepDuration;
        this.currentStep = (this.currentStep + 1) % 64;
      }
    };

    this.bgmIntervalId = window.setInterval(scheduleNotes, 45);
  }

  private stopChiptuneLoop(): void {
    if (this.bgmIntervalId !== null) {
      window.clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.isMusicPlaying = false;
  }

  // --- GAME LIFECYCLE HOOKS ---
  public onGameStart(): void {
    this.init();
    this.isGamePaused = false;
    this.startChiptuneLoop();
  }

  public onPause(): void {
    this.isGamePaused = true;
    if (this.ctx && this.musicGain) {
      // Smoothly lower music while paused
      const now = this.ctx.currentTime;
      const dimmedGain = (this.musicVolume / 100) * 0.05;
      this.musicGain.gain.setTargetAtTime(dimmedGain, now, 0.1);
    }
  }

  public onResume(): void {
    this.isGamePaused = false;
    if (this.ctx && this.musicGain) {
      const now = this.ctx.currentTime;
      const targetGain = (this.musicVolume / 100) * 0.22;
      this.musicGain.gain.setTargetAtTime(targetGain, now, 0.1);
    }
    if (!this.isMusicPlaying) {
      this.startChiptuneLoop();
    }
  }

  public onGameOver(): void {
    this.stopChiptuneLoop();
  }
}

// Global Singleton
export const audioController = new RetroAudioEngine();

// Expose globally for both React and gameEngine.js
if (typeof window !== 'undefined') {
  (window as any).BOMBER_AUDIO = {
    initAudio: () => audioController.init(),
    getAudioContext: () => audioController.getAudioContext(),
    getMusicGainNode: () => audioController.getMusicGainNode(),
    getSfxGainNode: () => audioController.getSfxGainNode(),
    getMusicVolume: () => audioController.getMusicVolume(),
    getSfxVolume: () => audioController.getSfxVolume(),
    setMusicVolume: (v: number) => audioController.setMusicVolume(v),
    setSfxVolume: (v: number) => audioController.setSfxVolume(v),
    playPreviewSfx: () => audioController.playPreviewSfx(),
    onGameStart: () => audioController.onGameStart(),
    onPause: () => audioController.onPause(),
    onResume: () => audioController.onResume(),
    onGameOver: () => audioController.onGameOver(),
  };
}
