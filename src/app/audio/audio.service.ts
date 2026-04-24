import { Injectable, inject } from '@angular/core';
import { AppStateStore } from '../store/app-state.store';

@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly #store = inject(AppStateStore);

  #ctx: AudioContext | null = null;

  #getCtx(): AudioContext {
    if (!this.#ctx) this.#ctx = new AudioContext();
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
    return this.#ctx;
  }

  playAtomSpawnSound(): void {
    if (this.#store.muted()) return;
    this.#playTone(800, 0.08, 'sine', 0.12);
  }

  playBondSound(): void {
    if (this.#store.muted()) return;
    this.#playTone(1200, 0.06, 'triangle', 0.08);
  }

  playDiscoveryFamousSound(): void {
    if (this.#store.muted()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      setTimeout(() => this.#playTone(freq, 0.15, 'sine', 0.4), i * 80);
    });
  }

  playDiscoveryExploratorySound(): void {
    if (this.#store.muted()) return;
    this.#playTone(660, 0.1, 'sine', 0.3);
  }

  playChallengeSuccessSound(): void {
    if (this.#store.muted()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      setTimeout(() => this.#playTone(freq, 0.18, 'sine', 0.5), i * 70);
    });
  }

  #playTone(freq: number, gain: number, type: OscillatorType, duration: number): void {
    try {
      const ctx = this.#getCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = type;
      osc.frequency.value = freq;
      gainNode.gain.value = gain * this.#store.volume();
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch { /* AudioContext may be blocked before user interaction */ }
  }
}
