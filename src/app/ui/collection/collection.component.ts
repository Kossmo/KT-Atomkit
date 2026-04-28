import { Component, inject, signal, computed, output, input, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStateStore } from '../../store/app-state.store';
import { DiscoveredMolecule } from '../../models';
import { MoleculeDetailComponent } from './molecule-detail.component';


type Family = 'hydrocarbon'|'organic-o'|'amine'|'halide'|'noble-gas'|'oxide'|'sulfur'|'other';

const FAMILY_COLORS: Record<Family, string> = {
  'hydrocarbon': '#f4a261', 'organic-o': '#4cc9f0', 'amine': '#a78bfa',
  'halide': '#f472b6', 'noble-gas': '#94a3b8', 'oxide': '#fb923c',
  'sulfur': '#fbbf24', 'other': '#6b7280',
};

const SUB: Record<string, string> = {
  '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
};

function classify(formula: string): Family {
  const el = new Set<string>();
  const re = /([A-Z][a-z]?)\d*/g; let m: RegExpExecArray | null;
  while ((m = re.exec(formula))) el.add(m[1]);
  const nobles = new Set(['He','Ne','Ar','Kr','Xe','Rn']);
  if ([...el].every(e => nobles.has(e))) return 'noble-gas';
  const C = el.has('C'), H = el.has('H'), O = el.has('O'), N = el.has('N'), S = el.has('S');
  const hal = el.has('F')||el.has('Cl')||el.has('Br')||el.has('I');
  if (hal) return 'halide'; if (S) return 'sulfur'; if (N) return 'amine';
  if (C && H && O) return 'organic-o'; if (C && H) return 'hydrocarbon';
  if (O && !C) return 'oxide'; return 'other';
}

@Component({
  selector: 'app-collection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoleculeDetailComponent, FormsModule],
  template: `
    <div class="collection">

      <div class="header">
        <div class="tabs">
          <button class="tab" [class.active]="tab() === 'famous'" (click)="tab.set('famous')">
            Famous <span class="count">{{ store.famousCount() }}</span>
          </button>
          <button class="tab" [class.active]="tab() === 'exploratory'" (click)="tab.set('exploratory')">
            Novel <span class="count">{{ store.exploratoryCount() }}</span>
          </button>
        </div>
      </div>

      <div class="stats-wrap">
        <div class="stat-block">
          <span class="stat-value">{{ store.famousCount() }}</span>
          <span class="stat-label">famous</span>
        </div>
        <div class="stat-sep">·</div>
        <div class="stat-block">
          <span class="stat-value">{{ store.exploratoryCount() }}</span>
          <span class="stat-label">novel</span>
        </div>
        <div class="stat-sep">·</div>
        <div class="stat-block">
          <span class="stat-value pct">{{ pctFormulas() }}<span class="pct-sign">%</span></span>
          <span class="stat-label">of ~1M formulas</span>
        </div>
        <div class="stat-sep">·</div>
        <div class="stat-block">
          <span class="stat-value pct">{{ pctStructures() }}<span class="pct-sign">%</span></span>
          <span class="stat-label">of ~100M structures</span>
        </div>
      </div>

      <div class="search-row">
        <div class="search-wrap">
          <input
            type="search"
            class="search-input"
            placeholder="Search by name or formula…"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            autocomplete="off"
            spellcheck="false"
          />
          @if (searchQuery()) {
            <button class="search-clear" type="button" (click)="searchQuery.set('')">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
              </svg>
            </button>
          }
        </div>
      </div>

      <div class="grid-wrap">
        @if (list().length === 0) {
          <div class="empty">
            @if (searchQuery()) {
              <span class="empty-icon">⬡</span>
              <span>No results for "{{ searchQuery() }}"</span>
              <span class="sub">Try a different name or formula.</span>
            } @else {
              <span class="empty-icon">{{ tab() === 'famous' ? '⬡' : '◇' }}</span>
              <span>Nothing here yet.</span>
              <span class="sub">Build molecules and scan to discover.</span>
            }
          </div>
        } @else {
          <div class="grid">
            @for (m of list(); track m.id) {
              <div class="card" [style.--accent]="accentColor(m)" (click)="selected.set(m)">
                <div class="card-top">
                  <span class="card-formula">{{ fmt(m.formula) }}</span>
                  @if (m.molecularWeight) {
                    <span class="card-mw">{{ m.molecularWeight.toFixed(1) }}&thinsp;g/mol</span>
                  }
                </div>
                @if (cardName(m); as name) {
                  <div class="card-name">{{ name }}</div>
                }
                @if (m.description) {
                  <p class="card-desc">{{ m.description }}</p>
                }
                @if (m.isomerCount && m.isomerCount > 1) {
                  <div class="card-isomers" title="Includes constitutional isomers, stereoisomers, and radical forms — not all are buildable in this sandbox">
                    {{ discoveredIsomers(m.formula) }} of {{ m.isomerCount.toLocaleString() }} known {{ m.formula }} structures*
                  </div>
                }
                <div class="card-hint">
                  @if (m.cid) { <span class="has-3d">3D</span> }
                  <span class="open-label">Click to explore →</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

    </div>

    @if (selected(); as mol) {
      <app-molecule-detail
        [molecule]="mol"
        (closed)="selected.set(null)"
        (view3d)="onView3d($event)"
      />
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    .collection { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    // ── Header ────────────────────────────────────────────────────────

    .header {
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      padding: 20px 24px 0;
    }

    .tabs {
      display: flex;
      gap: 2px;
      background: rgba(255 255 255 / 0.04);
      border: 1px solid rgba(255 255 255 / 0.08);
      border-radius: 10px;
      padding: 3px;
    }

    .tab {
      background: none;
      border: none;
      border-radius: 7px;
      color: rgba(255 255 255 / 0.35);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 6px 18px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 7px;
      &:hover { color: rgba(255 255 255 / 0.6); }
      &.active { background: rgba(255 255 255 / 0.1); color: rgba(255 255 255 / 0.9); }
    }

    .count {
      font-size: 10px;
      font-weight: 700;
      background: rgba(255 255 255 / 0.1);
      border-radius: 8px;
      padding: 1px 6px;
      letter-spacing: 0;
    }

    // ── Stats ─────────────────────────────────────────────────────────

    .stats-wrap {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px 16px;
      padding: 16px 24px 16px;
    }

    .stat-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: rgba(255 255 255 / 0.85);
      line-height: 1;

      &.pct {
        font-size: 15px;
        color: rgba(255 255 255 / 0.4);
        letter-spacing: -0.02em;
      }
    }

    .pct-sign {
      font-size: 11px;
      font-weight: 400;
      color: rgba(255 255 255 / 0.25);
    }

    .stat-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
      color: rgba(255 255 255 / 0.18);
      white-space: nowrap;
    }

    .stat-sep {
      color: rgba(255 255 255 / 0.08);
      font-size: 18px;
      align-self: center;
      padding-bottom: 14px;
    }

    // ── Search ────────────────────────────────────────────────────────

    .search-row {
      flex-shrink: 0;
      padding: 0 24px 12px;
    }

    .search-wrap {
      position: relative;
      max-width: 360px;
      margin: 0 auto;
    }

    .search-input {
      width: 100%;
      box-sizing: border-box;
      background: rgba(255 255 255 / 0.04);
      border: 1px solid rgba(255 255 255 / 0.08);
      border-radius: 8px;
      padding: 8px 30px 8px 12px;
      color: rgba(255 255 255 / 0.85);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;

      &::placeholder { color: rgba(255 255 255 / 0.2); }
      &:focus { border-color: rgba(255 255 255 / 0.2); }
      &::-webkit-search-cancel-button { display: none; }
    }

    .search-clear {
      position: absolute;
      right: 8px;
      top: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      background: none;
      border: none;
      color: rgba(255 255 255 / 0.25);
      font-size: 0;
      cursor: pointer;
      padding: 0 2px;
      transition: color 0.15s;

      &:hover { color: rgba(255 255 255 / 0.65); }
    }

    // ── Grid ──────────────────────────────────────────────────────────

    .grid-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px 24px;
      min-height: 0;
      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { background: rgba(255 255 255 / 0.08); border-radius: 2px; }
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      max-width: 1100px;
      margin: 0 auto;
    }

    // ── Card ──────────────────────────────────────────────────────────

    .card {
      --accent: rgba(255 255 255 / 0.15);
      background: rgba(255 255 255 / 0.03);
      border: 1px solid rgba(255 255 255 / 0.08);
      border-left: 3px solid var(--accent);
      border-radius: 8px;
      padding: 14px 16px 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: pointer;
      transition: background 0.15s, transform 0.15s, box-shadow 0.15s;

      &:hover {
        background: rgba(255 255 255 / 0.06);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0 0 0 / 0.3);
      }
    }

    .card-top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }

    .card-formula {
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: 700;
      color: rgba(255 255 255 / 0.88);
      letter-spacing: -0.01em;
      line-height: 1;
    }

    .card-mw {
      font-size: 11px;
      color: rgba(255 255 255 / 0.22);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .card-name {
      font-size: 13px;
      color: rgba(255 255 255 / 0.48);
      line-height: 1.3;
    }

    .card-desc {
      font-size: 12px;
      color: rgba(255 255 255 / 0.25);
      line-height: 1.5;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-hint {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 2px;
    }

    .has-3d {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: rgba(255 255 255 / 0.25);
      background: rgba(255 255 255 / 0.06);
      border-radius: 3px;
      padding: 2px 5px;
    }

    .card-isomers {
      font-size: 11px;
      color: rgba(255 255 255 / 0.2);
      font-style: italic;
      letter-spacing: 0.01em;
      cursor: help;
    }

    .open-label {
      font-size: 10px;
      color: rgba(255 255 255 / 0.15);
      letter-spacing: 0.03em;
      margin-left: auto;
      transition: color 0.15s;
    }

    .card:hover .open-label { color: rgba(255 255 255 / 0.35); }

    // ── Empty ─────────────────────────────────────────────────────────

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 60px 24px;
      color: rgba(255 255 255 / 0.18);
      font-size: 14px;
      text-align: center;

      .empty-icon { font-size: 32px; margin-bottom: 4px; opacity: 0.3; }
      .sub { font-size: 12px; color: rgba(255 255 255 / 0.1); }
    }
  `],
})
export class CollectionComponent {
  readonly store = inject(AppStateStore);
  readonly tab = signal<'famous' | 'exploratory'>('famous');
  readonly selected = signal<DiscoveredMolecule | null>(null);
  readonly searchQuery = signal('');
  readonly view3d = output<DiscoveredMolecule>();
  readonly pendingOpen = input<DiscoveredMolecule | null>(null);

  readonly #openEffect = effect(() => {
    const mol = this.pendingOpen();
    if (!mol) return;
    this.tab.set(mol.type === 'famous' ? 'famous' : 'exploratory');
    this.selected.set(mol);
  });

  readonly list = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const base = this.store.collection().filter(m => m.type === this.tab());
    if (!q) return base;
    return base.filter(m =>
      m.formula.toLowerCase().includes(q) ||
      m.commonName?.toLowerCase().includes(q) ||
      m.iupacName?.toLowerCase().includes(q)
    );
  });

  readonly pctFormulas = computed(() =>
    (this.store.famousCount() / 1_000_000 * 100).toFixed(4)
  );
  readonly pctStructures = computed(() =>
    (this.store.famousCount() / 100_000_000 * 100).toFixed(5)
  );

  onView3d(mol: DiscoveredMolecule): void {
    this.selected.set(null);
    this.view3d.emit(mol);
  }

  cardName(m: DiscoveredMolecule): string {
    const name = m.commonName ?? m.iupacName;
    return name && name !== m.formula ? name : '';
  }

  fmt(formula: string): string {
    return formula.replace(/\d/g, d => SUB[d] ?? d);
  }

  accentColor(m: DiscoveredMolecule): string {
    return FAMILY_COLORS[classify(m.formula)];
  }

  discoveredIsomers(formula: string): number {
    return this.store.collection().filter(m => m.formula === formula).length;
  }
}
