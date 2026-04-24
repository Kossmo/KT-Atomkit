import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `
    <div class="loading-screen">
      <div class="loading-inner">
        <div class="logo">Atomkit</div>
        <div class="subtitle">Loading chemistry engine…</div>
        <div class="progress-track">
          <div class="progress-bar" [style.width.%]="progress()"></div>
        </div>
        <div class="progress-label">{{ progress() }}%</div>
      </div>
    </div>
  `,
  styles: [`
    .loading-screen {
      position: fixed; inset: 0;
      background: #0d0d0f;
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .loading-inner { text-align: center; }
    .logo {
      font-size: 2.5rem; font-weight: 100; letter-spacing: 0.3em;
      color: #fff; margin-bottom: 12px;
      text-transform: uppercase;
    }
    .subtitle {
      font-size: 0.8rem; color: rgba(255 255 255 / 0.4);
      letter-spacing: 0.1em; margin-bottom: 32px;
    }
    .progress-track {
      width: 240px; height: 2px; background: rgba(255 255 255 / 0.1);
      border-radius: 1px; overflow: hidden; margin: 0 auto 12px;
    }
    .progress-bar {
      height: 100%; background: rgba(255 255 255 / 0.6);
      border-radius: 1px; transition: width 0.3s ease;
    }
    .progress-label {
      font-size: 0.7rem; color: rgba(255 255 255 / 0.3);
      font-variant-numeric: tabular-nums;
    }
  `],
})
export class LoadingComponent {
  readonly progress = input.required<number>();
}
