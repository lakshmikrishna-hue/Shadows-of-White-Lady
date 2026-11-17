import type { HeroId } from './types';

// Pentatonic D-major Wuxia scale frequencies (D4, E4, F#4, A4, B4, D5, E5, F#5, A5)
const PENTATONIC = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0];

class WuxiaAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private bgTimer: number | null = null;
  private bgStep = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.32;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.32, this.ctx.currentTime, 0.04);
    }
    if (mute) {
      this.stopAmbience();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public startAmbience(): void {
    if (this.muted || this.bgTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const pattern = [0, 2, 3, 5, 4, 3, 2, 1];
    this.bgTimer = window.setInterval(() => {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const noteIdx = pattern[this.bgStep % pattern.length];
      const freq = PENTATONIC[noteIdx] * (this.bgStep % 16 >= 8 ? 0.5 : 1);
      this.pluckGuqin(freq, 1.4, 0.08);
      if (this.bgStep % 4 === 0) {
        this.pluckGuqin(PENTATONIC[0] * 0.5, 2.2, 0.06);
      }
      this.bgStep++;
    }, 620);
  }

  public stopAmbience(): void {
    if (this.bgTimer !== null) {
      clearInterval(this.bgTimer);
      this.bgTimer = null;
    }
  }

  private pluckGuqin(freq: number, decay: number, volume: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const harm = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    harm.type = 'sine';
    const jitter = 1 + (Math.random() - 0.5) * 0.015;
    osc.frequency.setValueAtTime(freq * jitter, now);
    harm.frequency.setValueAtTime(freq * 2 * jitter, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + decay);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(filter);
    harm.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    harm.start(now);
    osc.stop(now + decay + 0.05);
    harm.stop(now + decay + 0.05);
  }

  public playStrike(hero: HeroId): void {
    const pitchVar = 0.92 + Math.random() * 0.16;
    if (hero === 'maomi') {
      this.pluckGuqin(587.33 * pitchVar, 0.25, 0.16);
    } else if (hero === 'jinka') {
      this.pluckGuqin(739.99 * pitchVar, 0.22, 0.16);
    } else {
      this.pluckGuqin(493.88 * pitchVar, 0.28, 0.18);
    }
  }

  public playSkillCast(hero: HeroId, isUltimate = false): void {
    if (isUltimate) {
      [293.66, 440, 587.33, 739.99, 880].forEach((f, i) => {
        setTimeout(() => this.pluckGuqin(f, 0.9, 0.2), i * 55);
      });
      return;
    }
    const base = hero === 'maomi' ? 440 : hero === 'jinka' ? 587.33 : 523.25;
    this.pluckGuqin(base, 0.45, 0.2);
    setTimeout(() => this.pluckGuqin(base * 1.25, 0.55, 0.18), 70);
  }

  public playHeavyImpact(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 * (0.92 + Math.random() * 0.16), now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playPlayerHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.22);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playHeroSwitch(hero: HeroId): void {
    const freq = hero === 'maomi' ? 587.33 : hero === 'jinka' ? 659.25 : 739.99;
    this.pluckGuqin(freq, 0.35, 0.14);
  }

  public playPickup(): void {
    this.pluckGuqin(659.25, 0.25, 0.16);
    setTimeout(() => this.pluckGuqin(880, 0.35, 0.16), 60);
  }

  public playBossTelegraph(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.38);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.32);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  public playVictoryFanfare(): void {
    [293.66, 369.99, 440, 587.33, 739.99, 880].forEach((f, idx) => {
      setTimeout(() => this.pluckGuqin(f, 1.3, 0.22), idx * 90);
    });
  }

  public playDefeatSting(): void {
    [329.63, 293.66, 246.94, 196.0].forEach((f, idx) => {
      setTimeout(() => this.pluckGuqin(f, 1.1, 0.2), idx * 140);
    });
  }
}

export const wuxiaAudio = new WuxiaAudioEngine();
