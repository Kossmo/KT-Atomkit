import { Component, output, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { FragmentDef } from '../../models';
import { FRAGMENTS } from '../../lib/fragments';
import { AppStateStore } from '../../store/app-state.store';
import { RdkitService } from '../../chemistry/rdkit.service';

@Component({
  selector: 'app-fragment-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="palette">
      <div class="palette-header">
        <span>Fragments</span>
        <div class="header-right">
          <span class="unlock-count">{{ unlockedCount() }}/{{ fragments.length }}</span>
          @if (lockedCount() > 0) {
            <button
              class="peek-btn"
              [class.active]="showLocked()"
              (click)="showLocked.set(!showLocked())"
              [title]="showLocked() ? 'Hide locked fragments' : 'Peek at locked fragments'"
            >
              @if (showLocked()) {
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              } @else {
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              }
            </button>
          }
        </div>
      </div>
      <div class="palette-grid">
        @for (frag of fragmentStates(); track frag.id) {
          <button
            class="frag-btn"
            [class.locked]="!frag.unlocked"
            [disabled]="!frag.unlocked"
            (click)="frag.unlocked && fragmentSelected.emit(frag)"
            [title]="frag.unlocked ? frag.description : 'Discover ' + frag.unlockedByHint + ' to unlock'"
          >
            @if (frag.unlocked) {
              <span class="frag-dot" [style.background]="frag.anchorColor"></span>
            } @else {
              <span class="lock-icon">⬡</span>
            }
            <span class="frag-label">{{ frag.unlocked || showLocked() ? frag.label : '?' }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .palette {
      padding: 6px 0 8px;
      border-bottom: 1px solid rgba(255 255 255 / 0.06);
      flex-shrink: 0;
    }

    .palette-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px 5px;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255 255 255 / 0.25);
      font-weight: 600;
      user-select: none;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .unlock-count {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0;
      color: rgba(255 255 255 / 0.18);
    }

    .peek-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 1px solid rgba(255 255 255 / 0.1);
      border-radius: 4px;
      color: rgba(255 255 255 / 0.25);
      cursor: pointer;
      padding: 2px 3px;
      transition: all 0.15s;
      line-height: 0;

      &:hover { color: rgba(255 255 255 / 0.6); border-color: rgba(255 255 255 / 0.2); }

      &.active {
        color: rgba(255 255 255 / 0.7);
        border-color: rgba(255 255 255 / 0.25);
        background: rgba(255 255 255 / 0.07);
      }
    }

    .palette-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3px;
      padding: 0 8px;
    }

    .frag-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 6px 4px 5px;
      background: rgba(255 255 255 / 0.04);
      border: 1px solid rgba(255 255 255 / 0.07);
      border-radius: 6px;
      cursor: pointer;
      color: rgba(255 255 255 / 0.6);
      font-family: inherit;
      transition: all 0.12s;

      &:hover:not([disabled]) {
        background: rgba(255 255 255 / 0.09);
        border-color: rgba(255 255 255 / 0.18);
        color: rgba(255 255 255 / 0.9);
      }

      &:active:not([disabled]) {
        background: rgba(255 255 255 / 0.13);
      }

      &.locked {
        cursor: default;
        opacity: 0.28;
        filter: grayscale(1);
        border-style: dashed;
      }
    }

    .frag-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1px solid rgba(255 255 255 / 0.25);
    }

    .lock-icon {
      font-size: 9px;
      color: rgba(255 255 255 / 0.4);
      line-height: 1;
    }

    .frag-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: -0.01em;
      white-space: nowrap;
      line-height: 1;
    }
  `],
})
export class FragmentPaletteComponent {
  readonly fragmentSelected = output<FragmentDef>();

  readonly #store = inject(AppStateStore);
  readonly #rdkit = inject(RdkitService);
  readonly fragments = FRAGMENTS;
  readonly showLocked = signal(false);

  readonly #collectionSmiles = computed(() =>
    this.#store.collection().map(m => m.smiles).filter(Boolean)
  );

  readonly fragmentStates = computed(() => {
    const smiles = this.#collectionSmiles();
    const rdkitReady = this.#rdkit.isReady();
    return this.fragments.map(f => ({
      ...f,
      unlocked: f.unlockedBySmarts === null || (
        rdkitReady && smiles.some(s => this.#rdkit.hasSubstructure(s, f.unlockedBySmarts!))
      ),
    }));
  });

  readonly unlockedCount = computed(() =>
    this.fragmentStates().filter(f => f.unlocked).length
  );

  readonly lockedCount = computed(() =>
    this.fragmentStates().filter(f => !f.unlocked).length
  );
}
