import { Component, inject, computed, output, ChangeDetectionStrategy } from '@angular/core';
import { AppStateStore } from '../../store/app-state.store';
import { DiscoveredMolecule } from '../../models';

@Component({
  selector: 'app-molecule-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      @let m = molecule()!;
      <div class="toast" role="status">
        <div class="toast-top">
          <span class="badge" [class.famous]="m.type === 'famous'">
            {{ m.type === 'famous' ? '★ Famous' : '◇ Novel' }}
          </span>
          <button class="close-btn" (click)="dismiss()">×</button>
        </div>

        <div class="toast-body">
          <div class="mol-name">{{ displayName(m) }}</div>
          <div class="mol-formula">{{ m.formula }}</div>
        </div>

        <div class="toast-footer">
          @if (remaining() > 0) {
            <span class="more-badge">+{{ remaining() }} more</span>
          }
          <button class="view-btn" (click)="openCollection(m)">
            View in collection →
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .toast {
      position: fixed;
      bottom: 72px;
      right: 20px;
      width: 240px;
      background: #18181c;
      border: 1px solid rgba(255 255 255 / 0.1);
      border-radius: 10px;
      overflow: hidden;
      z-index: 150;
      animation: slide-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 8px 32px rgba(0 0 0 / 0.5);
    }

    @keyframes slide-in {
      from { transform: translateX(20px); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
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
  `],
})
export class MoleculeCardComponent {
  readonly store = inject(AppStateStore);
  readonly openInCollection = output<DiscoveredMolecule>();
  readonly show = computed(() => this.store.pendingDiscoveries().length > 0);
  readonly molecule = computed(() => this.store.pendingDiscoveries()[0] ?? null);
  readonly remaining = computed(() => Math.max(0, this.store.pendingDiscoveries().length - 1));

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
