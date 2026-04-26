import { Component, inject, computed, output, ChangeDetectionStrategy } from '@angular/core';
import { AppStateStore } from '../../store/app-state.store';
import { DiscoveredMolecule } from '../../models';

@Component({
  selector: 'app-molecule-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      <div class="toast-stack">
        @for (item of stackItems(); track item.id; let i = $index) {
          <div class="toast" [style.opacity]="cardOpacity(i)" [style.pointer-events]="i === 0 ? 'auto' : 'none'">
            <div class="toast-top">
              <span class="badge" [class.famous]="item.type === 'famous'">
                {{ item.type === 'famous' ? '★ Famous' : '◇ Novel' }}
              </span>
              @if (i === 0) {
                <button class="close-btn" (click)="dismiss()">×</button>
              }
            </div>

            <div class="toast-body">
              <div class="mol-name">{{ displayName(item) }}</div>
              <div class="mol-formula">{{ item.formula }}</div>
            </div>

            @if (i === 0) {
              <div class="toast-footer">
                @if (extra() > 0) {
                  <span class="more-badge">+{{ extra() }} more</span>
                }
                <button class="view-btn" (click)="openCollection(item)">
                  View in collection →
                </button>
              </div>
            }
          </div>
        }
        @if (stackItems().length > 1) {
          <button class="clear-btn" (click)="store.clearDiscoveries()">
            Clear all ({{ store.pendingDiscoveries().length }})
          </button>
        }
      </div>
    }
  `,
  styles: [`
    /* column-reverse: newest (i=0, active) anchors at bottom, older items stack upward, clear-btn floats at top */
    .toast-stack {
      position: fixed;
      bottom: 72px;
      right: 20px;
      width: 240px;
      z-index: 200;
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
      animation: stack-enter 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes stack-enter {
      from { translate: 16px 0; opacity: 0; }
    }

    .toast {
      background: #18181c;
      border: 1px solid rgba(255 255 255 / 0.1);
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0 0 0 / 0.5);
      transition: opacity 0.3s ease;
    }

    .toast-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px 0;
    }

    .badge {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 3px;
      background: rgba(136 136 255 / 0.15);
      color: #8888ff;
      border: 1px solid rgba(136 136 255 / 0.25);

      &.famous {
        background: rgba(80 200 120 / 0.12);
        color: #50c878;
        border-color: rgba(80 200 120 / 0.25);
      }
    }

    .close-btn {
      background: none;
      border: none;
      color: rgba(255 255 255 / 0.25);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      transition: color 0.15s;

      &:hover { color: rgba(255 255 255 / 0.6); }
    }

    .toast-body {
      padding: 8px 12px 10px;
    }

    .mol-name {
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mol-formula {
      font-size: 11px;
      font-family: 'Courier New', monospace;
      color: rgba(255 255 255 / 0.4);
      margin-top: 2px;
    }

    .toast-footer {
      padding: 8px 12px;
      border-top: 1px solid rgba(255 255 255 / 0.06);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }

    .more-badge {
      font-size: 9px;
      color: rgba(255 255 255 / 0.25);
      letter-spacing: 0.04em;
      margin-right: auto;
    }

    .view-btn {
      background: none;
      border: none;
      color: rgba(140 190 255 / 0.7);
      font-size: 11px;
      cursor: pointer;
      padding: 0;
      transition: color 0.15s;
      letter-spacing: 0.01em;

      &:hover { color: #aad4ff; }
    }

    .clear-btn {
      width: 100%;
      padding: 6px 0;
      background: none;
      border: 1px solid rgba(255 255 255 / 0.08);
      border-radius: 8px;
      color: rgba(255 255 255 / 0.3);
      font-size: 10px;
      font-family: inherit;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;

      &:hover {
        background: rgba(255 255 255 / 0.06);
        border-color: rgba(255 255 255 / 0.15);
        color: rgba(255 255 255 / 0.6);
      }
    }
  `],
})
export class MoleculeCardComponent {
  readonly store = inject(AppStateStore);
  readonly openInCollection = output<DiscoveredMolecule>();

  readonly show = computed(() => this.store.pendingDiscoveries().length > 0);
  readonly stackItems = computed(() => this.store.pendingDiscoveries().slice(0, 5));
  readonly extra = computed(() => Math.max(0, this.store.pendingDiscoveries().length - 5));

  cardOpacity(i: number): number {
    return ([1, 0.82, 0.65, 0.5, 0.38] as const)[i] ?? 0.38;
  }

  displayName(m: DiscoveredMolecule): string {
    return m.commonName ?? m.iupacName ?? m.formula;
  }

  dismiss(): void {
    this.store.dismissDiscovery();
  }

  openCollection(m: DiscoveredMolecule): void {
    this.dismiss();
    this.openInCollection.emit(m);
  }
}
