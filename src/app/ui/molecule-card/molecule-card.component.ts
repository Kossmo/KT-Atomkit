import { Component, inject, computed, output, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AppStateStore } from '../../store/app-state.store';
import { DiscoveredMolecule } from '../../models';

@Component({
  selector: 'app-molecule-card',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      <div class="overlay" (click)="dismiss()">
        <div class="card" (click)="$event.stopPropagation()">
          @let m = molecule()!;

          <div class="card-header">
            <span class="badge" [class.famous]="m.type === 'famous'">
              {{ m.type === 'famous' ? '★ Famous compound' : '◇ Novel compound' }}
            </span>
            <button class="close-btn" (click)="dismiss()">×</button>
          </div>

          <div class="card-body">
            <h2 class="mol-name">{{ displayName(m) }}</h2>
            @if (m.commonName && m.iupacName && m.commonName !== m.iupacName) {
              <div class="iupac">{{ m.iupacName }}</div>
            }

            <div class="props-grid">
              <div class="prop">
                <span class="prop-label">Formula</span>
                <span class="prop-value formula">{{ m.formula }}</span>
              </div>
              @if (m.molecularWeight) {
                <div class="prop">
                  <span class="prop-label">Mol. weight</span>
                  <span class="prop-value">{{ m.molecularWeight | number:'1.2-2' }} g/mol</span>
                </div>
              }
              @if (m.cid) {
                <div class="prop">
                  <span class="prop-label">PubChem CID</span>
                  <span class="prop-value">{{ m.cid }}</span>
                </div>
              }
            </div>

            @if (m.description) {
              <p class="description">{{ m.description }}</p>
            }

            <code class="smiles">{{ m.smiles }}</code>
          </div>

          <div class="card-footer">
            @if (remaining() > 0) {
              <span class="more-badge">+{{ remaining() }} more</span>
            }
            @if (m.cid) {
              <button class="view3d-btn" (click)="view3d.emit(m)">View 3D</button>
            }
            <button class="dismiss-btn" (click)="dismiss()">Continue exploring →</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0 0 0 / 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      animation: fade-in 0.2s ease;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .card {
      background: #131317;
      border: 1px solid rgba(255 255 255 / 0.1);
      border-radius: 12px;
      width: min(480px, calc(100vw - 32px));
      animation: slide-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }

    @keyframes slide-up {
      from { transform: translateY(20px) scale(0.97); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 0;
    }

    .badge {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
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
      color: rgba(255 255 255 / 0.3);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      transition: color 0.15s;

      &:hover { color: rgba(255 255 255 / 0.7); }
    }

    .card-body {
      padding: 20px 20px 16px;
    }

    .mol-name {
      font-size: 1.6rem;
      font-weight: 300;
      color: #fff;
      margin: 0 0 4px;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }

    .iupac {
      font-size: 11px;
      color: rgba(255 255 255 / 0.35);
      margin-bottom: 16px;
      font-style: italic;
    }

    .props-grid {
      display: flex;
      gap: 20px;
      margin: 14px 0;
      flex-wrap: wrap;
    }

    .prop {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .prop-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255 255 255 / 0.3);
      font-weight: 600;
    }

    .prop-value {
      font-size: 13px;
      color: rgba(255 255 255 / 0.85);
      font-weight: 500;

      &.formula {
        font-family: 'Courier New', monospace;
        font-size: 14px;
        color: #fff;
      }
    }

    .description {
      font-size: 12px;
      color: rgba(255 255 255 / 0.5);
      line-height: 1.6;
      margin: 12px 0;
      max-height: 80px;
      overflow: hidden;
      -webkit-line-clamp: 4;
      display: -webkit-box;
      -webkit-box-orient: vertical;
    }

    .smiles {
      display: block;
      font-size: 10px;
      font-family: 'Courier New', monospace;
      color: rgba(255 255 255 / 0.2);
      word-break: break-all;
      margin-top: 12px;
      padding: 8px 10px;
      background: rgba(255 255 255 / 0.03);
      border-radius: 4px;
      border: 1px solid rgba(255 255 255 / 0.06);
    }

    .card-footer {
      padding: 12px 20px 16px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid rgba(255 255 255 / 0.06);
    }

    .more-badge {
      font-size: 10px;
      color: rgba(255 255 255 / 0.3);
      letter-spacing: 0.04em;
    }

    .view3d-btn {
      background: rgba(100 160 255 / 0.08);
      border: 1px solid rgba(100 160 255 / 0.2);
      border-radius: 6px;
      color: rgba(140 190 255 / 0.8);
      font-size: 12px;
      padding: 8px 16px;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: 0.02em;

      &:hover {
        background: rgba(100 160 255 / 0.15);
        color: #aad4ff;
        border-color: rgba(100 160 255 / 0.4);
      }
    }

    .dismiss-btn {
      background: rgba(255 255 255 / 0.06);
      border: 1px solid rgba(255 255 255 / 0.12);
      border-radius: 6px;
      color: rgba(255 255 255 / 0.7);
      font-size: 12px;
      padding: 8px 16px;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: 0.02em;

      &:hover {
        background: rgba(255 255 255 / 0.1);
        color: #fff;
      }
    }
  `],
})
export class MoleculeCardComponent {
  readonly store = inject(AppStateStore);
  readonly view3d = output<DiscoveredMolecule>();
  readonly show = computed(() => this.store.pendingDiscoveries().length > 0);
  readonly molecule = computed(() => this.store.pendingDiscoveries()[0] ?? null);
  readonly remaining = computed(() => Math.max(0, this.store.pendingDiscoveries().length - 1));

  displayName(m: DiscoveredMolecule): string {
    return m.commonName ?? m.iupacName ?? m.formula;
  }

  dismiss(): void {
    this.store.dismissDiscovery();
  }
}
