import { Component, output, computed, input, model, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { ChallengeDef, DailyChallengeDef } from '../../models/challenge';
import { findChallengeById } from '../../lib/challenges';

@Component({
  selector: 'app-challenge-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (challenge() || daily()) {
      <div class="player" [class.success]="success()">

        @if (!success()) {
          <!-- Active challenge bar -->
          <div class="player-left">
            <button class="back-btn" (click)="quit.emit()" title="Quit challenge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span class="player-label">
              @if (daily(); as d) { Daily · {{ d.theme }} }
              @else if (challenge(); as c) { {{ c.name }} }
            </span>
          </div>

          <div class="player-center">
            @if (challenge(); as c) {
              <span class="player-formula">{{ c.formula }}</span>
            } @else if (daily(); as d) {
              <span class="player-constraints">
                @for (ct of d.constraints; track ct.smarts) {
                  <span class="mini-chip">{{ ct.label }}</span>
                }
              </span>
            }
          </div>

          <div class="player-right">
            @if (challenge(); as c) {
              @for (hint of c.hints; track $index) {
                <button
                  class="hint-btn"
                  [class.used]="hintsUsedCount() > $index"
                  [class.open]="hintsUsedCount() > $index && hintsOpen()"
                  (click)="hintsUsedCount() > $index ? hintsOpen.set(!hintsOpen()) : useHint($index)"
                  [title]="hintsUsedCount() > $index ? (hintsOpen() ? 'Hide hints' : 'Show hints') : 'Reveal: ' + hint.label"
                >
                  {{ hintsUsedCount() > $index ? hint.label : '💡 ' + hint.label }}
                </button>
              }
            }
          </div>

        } @else {
          <!-- Success state -->
          <div class="success-content">
            <span class="success-icon">🎉</span>
            <span class="success-text">
              @if (daily()) { Daily challenge complete! }
              @else if (challenge(); as c) { {{ c.name }} built! }
            </span>
            <button class="btn-done" (click)="quit.emit()">Back to Challenges</button>
          </div>
        }

      </div>

      <!-- Hint panel (shown below player when hints revealed) -->
      @if (!success() && challenge(); as c) {
        @if (hintsOpen() && hintsUsedCount() > 0) {
          <div class="hint-panel">
            @for (hint of c.hints.slice(0, hintsUsedCount()); track $index) {
              <div class="hint-item">
                <span class="hint-label">{{ hint.label }}</span>
                @if (hint.content === 'img' && c.targetCid) {
                  <img
                    class="hint-img"
                    [src]="'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/' + c.targetCid + '/PNG?record_type=2d&image_size=200x150'"
                    alt="2D structure"
                    loading="lazy"
                  />
                } @else {
                  <span class="hint-text">{{ hint.content }}</span>
                }
              </div>
            }
          </div>
        }
      }
    }
  `,
  styles: [`
    :host {
      position: absolute;
      top: 52px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 18;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      pointer-events: none;
    }

    .player, .hint-panel { pointer-events: all; }

    // ── Main bar ──────────────────────────────────────────────────────────

    .player {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(10 10 14 / 0.9);
      border: 1px solid rgba(255 255 255 / 0.12);
      border-radius: 10px;
      padding: 5px 8px 5px 6px;
      backdrop-filter: blur(16px);
      box-shadow: 0 4px 24px rgba(0 0 0 / 0.5);
      min-width: 360px;
      max-width: 560px;
      transition: border-color 0.3s;

      &.success {
        border-color: rgba(80 200 120 / 0.5);
        background: rgba(10 10 14 / 0.92);
      }
    }

    .player-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .back-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: rgba(255 255 255 / 0.06);
      border: 1px solid rgba(255 255 255 / 0.1);
      border-radius: 5px;
      color: rgba(255 255 255 / 0.5);
      cursor: pointer;
      padding: 0;
      transition: all 0.12s;
      flex-shrink: 0;

      &:hover { background: rgba(255 255 255 / 0.12); color: rgba(255 255 255 / 0.85); }
    }

    .player-label {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255 255 255 / 0.7);
      white-space: nowrap;
      letter-spacing: 0.02em;
    }

    .player-center {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
    }

    .player-formula {
      font-size: 13px;
      font-weight: 700;
      color: rgba(255 255 255 / 0.9);
      font-family: monospace;
      letter-spacing: 0.02em;
    }

    .player-constraints {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      justify-content: center;
    }

    .mini-chip {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 20px;
      background: rgba(255 255 255 / 0.07);
      border: 1px solid rgba(255 255 255 / 0.1);
      color: rgba(255 255 255 / 0.5);
    }

    .player-right {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .hint-btn {
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255 200 60 / 0.3);
      background: rgba(255 200 60 / 0.06);
      color: rgba(255 200 60 / 0.8);
      font-size: 9px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.12s;

      &:hover:not([disabled]) {
        background: rgba(255 200 60 / 0.14);
        border-color: rgba(255 200 60 / 0.5);
      }

      &.used {
        opacity: 0.5;
        background: transparent;
        color: rgba(255 255 255 / 0.35);
        border-color: rgba(255 255 255 / 0.12);

        &:hover {
          opacity: 0.8;
          background: rgba(255 255 255 / 0.06);
          border-color: rgba(255 255 255 / 0.2);
          color: rgba(255 255 255 / 0.6);
        }

        &.open {
          opacity: 0.85;
          background: rgba(255 200 60 / 0.08);
          border-color: rgba(255 200 60 / 0.3);
          color: rgba(255 200 60 / 0.7);
        }
      }
    }

    // ── Success ───────────────────────────────────────────────────────────

    .success-content {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      justify-content: center;
    }

    .success-icon { font-size: 16px; }

    .success-text {
      font-size: 12px;
      font-weight: 700;
      color: rgba(80 200 120 / 0.9);
      letter-spacing: 0.02em;
    }

    .btn-done {
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid rgba(80 200 120 / 0.4);
      background: rgba(80 200 120 / 0.1);
      color: rgba(80 200 120 / 0.9);
      font-size: 10px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.12s;

      &:hover { background: rgba(80 200 120 / 0.2); }
    }

    // ── Hint panel ────────────────────────────────────────────────────────

    .hint-panel {
      background: rgba(10 10 14 / 0.88);
      border: 1px solid rgba(255 255 255 / 0.1);
      border-radius: 10px;
      padding: 10px 14px;
      backdrop-filter: blur(16px);
      box-shadow: 0 4px 20px rgba(0 0 0 / 0.4);
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 360px;
    }

    .hint-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hint-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255 200 60 / 0.65);
    }

    .hint-text {
      font-size: 11px;
      color: rgba(255 255 255 / 0.6);
      line-height: 1.4;
    }

    .hint-img {
      border-radius: 6px;
      background: #fff;
      max-width: 200px;
      height: auto;
      display: block;
    }
  `],
})
export class ChallengePlayerComponent {
  readonly challengeId = input<string | null>(null);
  readonly dailyActive = input(false);
  readonly dailyDef = input<DailyChallengeDef | null>(null);
  readonly success = input(false);

  readonly quit = output<void>();
  readonly hintsOpen = model(false);

  readonly challenge = computed(() => {
    const id = this.challengeId();
    return id ? findChallengeById(id) : null;
  });

  readonly daily = computed(() =>
    this.dailyActive() ? this.dailyDef() : null
  );

  readonly #hintsUsed = signal(0);

  readonly #resetHints = effect(() => {
    this.challengeId();
    this.#hintsUsed.set(0);
    this.hintsOpen.set(false);
  }, { allowSignalWrites: true });

  readonly hintsUsedCount = computed(() => this.#hintsUsed());

  useHint(index: number): void {
    if (this.hintsUsedCount() <= index) {
      this.#hintsUsed.update(n => n + 1);
      this.hintsOpen.set(true);
    }
  }
}
