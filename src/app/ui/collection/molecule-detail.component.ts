import {
  Component, HostListener, OnInit, ChangeDetectionStrategy,
  inject, input, output, signal
} from '@angular/core';
import { WikipediaService, WikiSummary } from '../../api/wikipedia.service';
import { DiscoveredMolecule } from '../../models';

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
  selector: 'app-molecule-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="modal" [style.--accent]="accent()" (click)="$event.stopPropagation()">

        <div class="modal-header">
          <button class="close-btn" (click)="closed.emit()" aria-label="Close">×</button>
          <div class="formula">{{ fmt(molecule().formula) }}</div>
          @if (molecule().commonName; as name) {
            <div class="common-name">{{ name }}</div>
          }
          @if (showIupac(); as iupac) {
            <div class="iupac-name">{{ iupac }}</div>
          }
          <div class="meta">
            @if (molecule().molecularWeight) {
              <span>{{ molecule().molecularWeight!.toFixed(3) }} g/mol</span>
            }
            @if (molecule().cid) {
              <span>CID {{ molecule().cid }}</span>
            }
            <span>{{ molecule().type === 'famous' ? 'Famous' : 'Novel' }}</span>
          </div>
        </div>

        <div class="modal-body">

          @if (molecule().description; as desc) {
            <section>
              <h3>PubChem</h3>
              <p>{{ desc }}</p>
            </section>
          }

          @if (wikiLoading()) {
            <div class="wiki-loading">Fetching Wikipedia…</div>
          } @else if (wiki(); as w) {
            <section>
              <h3>Wikipedia</h3>
              <p>{{ firstParagraph(w.extract) }}</p>
              @if (w.pageUrl) {
                <a class="wiki-link" [href]="w.pageUrl" target="_blank" rel="noopener">
                  Read on Wikipedia ↗
                </a>
              }
            </section>
          }

          <section>
            <h3>SMILES</h3>
            <code class="smiles">{{ molecule().smiles }}</code>
          </section>

        </div>

        @if (molecule().cid) {
          <div class="modal-footer">
            <button class="btn-3d" (click)="view3d.emit(molecule())">View 3D structure</button>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0 0 0 / 0.65);
      backdrop-filter: blur(6px);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fade-in 0.2s ease;
    }

    @keyframes fade-in {
      from { opacity: 0; } to { opacity: 1; }
    }

    .modal {
      --accent: rgba(255 255 255 / 0.2);
      background: #111113;
      border: 1px solid rgba(255 255 255 / 0.1);
      border-radius: 12px;
      width: 100%;
      max-width: 540px;
      max-height: 82vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slide-up 0.25s ease;
    }

    @keyframes slide-up {
      from { transform: translateY(14px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    // ── Header ────────────────────────────────────────────────────────

    .modal-header {
      padding: 26px 28px 20px;
      border-left: 4px solid var(--accent);
      border-bottom: 1px solid rgba(255 255 255 / 0.06);
      position: relative;
      flex-shrink: 0;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--accent);
        opacity: 0.05;
        pointer-events: none;
      }
    }

    .close-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 28px;
      height: 28px;
      background: none;
      border: none;
      border-radius: 50%;
      color: rgba(255 255 255 / 0.4);
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      z-index: 1;
      &:hover { background: rgba(255 255 255 / 0.08); color: #fff; }
    }

    .formula {
      font-family: 'Courier New', monospace;
      font-size: 30px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.02em;
      line-height: 1;
      margin-bottom: 6px;
    }

    .common-name {
      font-size: 17px;
      color: rgba(255 255 255 / 0.72);
      margin-bottom: 3px;
    }

    .iupac-name {
      font-size: 12px;
      color: rgba(255 255 255 / 0.32);
      font-style: italic;
      margin-bottom: 10px;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
      font-size: 12px;
      color: rgba(255 255 255 / 0.28);
    }

    // ── Body ──────────────────────────────────────────────────────────

    .modal-body {
      overflow-y: auto;
      padding: 20px 28px;
      flex: 1;
      min-height: 0;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { background: rgba(255 255 255 / 0.1); border-radius: 2px; }

      section {
        margin-bottom: 22px;
        &:last-child { margin-bottom: 0; }
      }

      h3 {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: rgba(255 255 255 / 0.22);
        margin: 0 0 8px;
      }

      p {
        font-size: 14px;
        line-height: 1.7;
        color: rgba(255 255 255 / 0.58);
        margin: 0;
      }
    }

    .wiki-loading {
      font-size: 12px;
      color: rgba(255 255 255 / 0.18);
      letter-spacing: 0.04em;
      padding: 8px 0;
    }

    .wiki-link {
      display: inline-block;
      margin-top: 8px;
      font-size: 12px;
      color: rgba(255 255 255 / 0.3);
      text-decoration: none;
      letter-spacing: 0.02em;
      transition: color 0.15s;
      &:hover { color: rgba(255 255 255 / 0.6); }
    }

    .smiles {
      display: block;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: rgba(255 255 255 / 0.32);
      word-break: break-all;
      background: rgba(255 255 255 / 0.04);
      border-radius: 5px;
      padding: 9px 11px;
      line-height: 1.5;
    }

    // ── Footer ────────────────────────────────────────────────────────

    .modal-footer {
      padding: 14px 28px;
      border-top: 1px solid rgba(255 255 255 / 0.06);
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    .btn-3d {
      background: rgba(255 255 255 / 0.07);
      border: 1px solid rgba(255 255 255 / 0.14);
      border-radius: 7px;
      color: rgba(255 255 255 / 0.62);
      font-size: 13px;
      font-weight: 600;
      padding: 8px 18px;
      cursor: pointer;
      letter-spacing: 0.03em;
      transition: all 0.15s;
      &:hover { background: rgba(255 255 255 / 0.12); color: #fff; border-color: rgba(255 255 255 / 0.28); }
    }
  `],
})
export class MoleculeDetailComponent implements OnInit {
  readonly molecule = input.required<DiscoveredMolecule>();
  readonly closed = output<void>();
  readonly view3d = output<DiscoveredMolecule>();

  readonly #wikipedia = inject(WikipediaService);

  readonly wikiLoading = signal(false);
  readonly wiki = signal<WikiSummary | null>(null);

  readonly accent = () => FAMILY_COLORS[classify(this.molecule().formula)];

  readonly showIupac = () => {
    const { iupacName, commonName } = this.molecule();
    return iupacName && iupacName !== commonName ? iupacName : null;
  };

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closed.emit(); }

  async ngOnInit(): Promise<void> {
    const mol = this.molecule();
    const names = [mol.commonName, mol.iupacName].filter(Boolean) as string[];
    if (names.length === 0 || !mol.cid) return;

    this.wikiLoading.set(true);
    try {
      for (const name of names) {
        const summary = await this.#wikipedia.getSummary(name);
        if (summary) { this.wiki.set(summary); return; }
      }
    } finally {
      this.wikiLoading.set(false);
    }
  }

  fmt(formula: string): string {
    return formula.replace(/\d/g, d => SUB[d] ?? d);
  }

  firstParagraph(extract: string): string {
    return extract.split('\n\n')[0];
  }
}
