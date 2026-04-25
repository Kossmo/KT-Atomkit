import { Component, OnInit, output, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { AppStateStore } from '../../store/app-state.store';
import { CHAPTERS, DAILY_CHALLENGES, getDailyChallenge, isDailyCompleted } from '../../lib/challenges';
import { ChallengeDef } from '../../models/challenge';

@Component({
  selector: 'app-challenges',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="challenges-page">

      <!-- Daily challenge banner -->
      <div class="daily-banner" [class.done]="dailyDone()">
        <div class="daily-header">
          <span class="daily-tag">Daily · {{ todayLabel() }}</span>
          @if (dailyDone()) { <span class="done-badge">✓ Completed</span> }
        </div>
        <div class="daily-theme">{{ daily.theme }}</div>
        <div class="daily-desc">{{ daily.description }}</div>
        <div class="daily-constraints">
          @for (c of daily.constraints; track c.smarts) {
            <span class="constraint-chip">{{ c.label }}</span>
          }
        </div>
        <div class="daily-footer">
          <span class="difficulty">
            @for (filled of stars(daily.difficulty); track $index) {
              <span [class.star-filled]="filled" [class.star-empty]="!filled">★</span>
            }
          </span>
          @if (!dailyDone()) {
            <button class="btn-start" (click)="startDaily.emit()">Start</button>
          }
        </div>
      </div>

      <!-- Chapter list -->
      <div class="chapters">
        @for (chapter of chapterStates(); track chapter.id) {
          <div class="chapter" [class.locked]="!chapter.unlocked">

            <button class="chapter-header" (click)="chapter.unlocked && toggleChapter(chapter.id)">
              <span class="chapter-icon">{{ chapter.icon }}</span>
              <span class="chapter-title">{{ chapter.title }}</span>
              <span class="chapter-progress">{{ chapter.completedCount }}/{{ chapter.challenges.length }}</span>
              @if (chapter.unlocked) {
                <span class="chapter-chevron" [class.open]="openChapterId() === chapter.id">›</span>
              } @else {
                <span class="lock-glyph">🔒</span>
              }
            </button>

            <div class="chapter-body" [class.open]="openChapterId() === chapter.id">
              <div class="chapter-body-inner">
                <div class="challenge-grid">
                  @for (c of chapter.challenges; track c.id) {
                    <button
                      class="challenge-card"
                      [class.completed]="isCompleted(c.id)"
                      (click)="startChallenge.emit(c)"
                    >
                      @if (isCompleted(c.id)) {
                        <span class="card-check">✓</span>
                      }
                      <span class="card-formula">{{ c.formula }}</span>
                      <span class="card-name">{{ c.name }}</span>
                      <span class="card-stars">
                        @for (filled of stars(c.difficulty); track $index) {
                          <span [class.star-filled]="filled" [class.star-empty]="!filled">★</span>
                        }
                      </span>
                    </button>
                  }
                </div>
              </div>
            </div>

          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .challenges-page {
      position: absolute;
      inset: 52px 0 0 0;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 680px;
      margin: 0 auto;
    }

    // ── Daily banner ──────────────────────────────────────────────────────

    .daily-banner {
      background: rgba(255 255 255 / 0.04);
      border: 1px solid rgba(255 255 255 / 0.1);
      border-radius: 12px;
      padding: 14px 16px 12px;
      flex-shrink: 0;

      &.done {
        border-color: rgba(80 200 120 / 0.3);
        background: rgba(80 200 120 / 0.04);
      }
    }

    .daily-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .daily-tag {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255 255 255 / 0.3);
    }

    .done-badge {
      font-size: 10px;
      font-weight: 600;
      color: rgba(80 200 120 / 0.85);
      letter-spacing: 0.04em;
    }

    .daily-theme {
      font-size: 15px;
      font-weight: 700;
      color: rgba(255 255 255 / 0.88);
      margin-bottom: 4px;
      letter-spacing: -0.01em;
    }

    .daily-desc {
      font-size: 11px;
      color: rgba(255 255 255 / 0.4);
      line-height: 1.45;
      margin-bottom: 8px;
    }

    .daily-constraints {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 10px;
    }

    .constraint-chip {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 20px;
      background: rgba(255 255 255 / 0.07);
      border: 1px solid rgba(255 255 255 / 0.1);
      color: rgba(255 255 255 / 0.55);
      letter-spacing: 0.02em;
    }

    .daily-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .difficulty {
      font-size: 14px;
      letter-spacing: 2px;
    }

    .btn-start {
      padding: 5px 16px;
      border-radius: 7px;
      border: 1px solid rgba(80 200 120 / 0.35);
      background: rgba(80 200 120 / 0.08);
      color: rgba(80 200 120 / 0.9);
      font-size: 11px;
      font-weight: 600;
      font-family: inherit;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        background: rgba(80 200 120 / 0.16);
        border-color: rgba(80 200 120 / 0.55);
      }
    }

    // ── Chapters ──────────────────────────────────────────────────────────

    .chapters { display: flex; flex-direction: column; gap: 6px; }

    .chapter {
      background: rgba(255 255 255 / 0.03);
      border: 1px solid rgba(255 255 255 / 0.08);
      border-radius: 10px;
      overflow: hidden;
      transition: opacity 0.2s;

      &.locked { opacity: 0.38; }
    }

    .chapter-header {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: none;
      border: none;
      cursor: pointer;
      color: rgba(255 255 255 / 0.75);
      font-family: inherit;
      text-align: left;
      transition: background 0.12s;

      &:hover { background: rgba(255 255 255 / 0.04); }
    }

    .chapter-icon { font-size: 14px; flex-shrink: 0; }

    .chapter-title {
      flex: 1;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .chapter-progress {
      font-size: 10px;
      color: rgba(255 255 255 / 0.3);
      font-variant-numeric: tabular-nums;
    }

    .chapter-chevron {
      font-size: 14px;
      color: rgba(255 255 255 / 0.3);
      transition: transform 0.2s;
      flex-shrink: 0;

      &.open { transform: rotate(90deg); }
    }

    .lock-glyph { font-size: 10px; flex-shrink: 0; }

    .chapter-body {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.22s ease;

      &.open { grid-template-rows: 1fr; }
    }

    .chapter-body-inner {
      overflow: hidden;
    }

    .challenge-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
      padding: 12px 12px 14px;
      border-top: 1px solid rgba(255 255 255 / 0.05);
    }

    .challenge-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      padding: 14px 12px 10px;
      background: rgba(255 255 255 / 0.03);
      border: 1px solid rgba(255 255 255 / 0.08);
      border-radius: 8px;
      cursor: pointer;
      color: rgba(255 255 255 / 0.7);
      font-family: inherit;
      text-align: left;
      transition: all 0.14s;
      min-height: 100px;

      &:hover {
        background: rgba(255 255 255 / 0.07);
        border-color: rgba(255 255 255 / 0.16);
        color: rgba(255 255 255 / 0.92);
      }

      &.completed {
        border-color: rgba(80 200 120 / 0.25);
        background: rgba(80 200 120 / 0.04);
      }
    }

    .card-check {
      position: absolute;
      top: 9px;
      right: 10px;
      font-size: 13px;
      font-weight: 700;
      color: rgba(80 200 120 / 0.8);
    }

    .card-formula {
      font-size: 20px;
      font-weight: 700;
      color: rgba(255 255 255 / 0.88);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .card-name {
      font-size: 12px;
      font-weight: 500;
      color: rgba(255 255 255 / 0.45);
      line-height: 1.3;
    }

    .card-stars {
      margin-top: auto;
      font-size: 14px;
      letter-spacing: 2px;
    }

    .star-filled { color: rgba(255 200 60 / 0.85); }
    .star-empty {
      color: rgba(255 255 255 / 0.15);
      filter: blur(0.4px);
    }
  `],
})
export class ChallengesComponent implements OnInit {
  readonly startChallenge = output<ChallengeDef>();
  readonly startDaily = output<void>();

  readonly #store = inject(AppStateStore);
  readonly daily = getDailyChallenge();
  readonly dailyDone = computed(() => isDailyCompleted(this.#store.dailyCompletedDate()));
  readonly todayLabel = computed(() => new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' }));
  readonly openChapterId = signal<string | null>('ch1');

  ngOnInit(): void {
    const lastUnlocked = [...this.chapterStates()].reverse().find(ch => ch.unlocked);
    if (lastUnlocked) this.openChapterId.set(lastUnlocked.id);
  }

  readonly chapterStates = computed(() => {
    const completed = this.#store.completedChallengeIds();
    return CHAPTERS.map((ch, i) => {
      const prevChapter = i > 0 ? CHAPTERS[i - 1] : null;
      const unlocked = !prevChapter || prevChapter.challenges.every(c => completed.includes(c.id));
      return {
        ...ch,
        unlocked,
        completedCount: ch.challenges.filter(c => completed.includes(c.id)).length,
      };
    });
  });

  isCompleted(id: string): boolean {
    return this.#store.completedChallengeIds().includes(id);
  }

  toggleChapter(id: string): void {
    this.openChapterId.update(current => current === id ? null : id);
  }

  stars(difficulty: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < difficulty);
  }
}
