import {
  Component, OnInit, OnDestroy, inject, HostListener,
  ChangeDetectionStrategy, computed, ViewChild, ElementRef
} from '@angular/core';
import { WorkspaceService } from './workspace.service';
import { AppStateStore } from '../store/app-state.store';
import { AtomNode, Bond } from '../models';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent implements OnInit, OnDestroy {
  @ViewChild('svgEl', { static: true }) svgRef!: ElementRef<SVGSVGElement>;

  readonly ws = inject(WorkspaceService);
  readonly store = inject(AppStateStore);

  readonly viewBoxStr = '-600 -400 1200 800';

  #draggingAtomId: string | null = null;
  #dragOffset = { x: 0, y: 0 };

  readonly atomList = computed(() => [...this.store.atoms().values()]);
  readonly bondList = computed(() => [...this.store.bonds().values()]);

  readonly visibleAtoms = computed(() => {
    const list = this.atomList();
    return this.store.showHydrogens() ? list : list.filter(a => a.element.symbol !== 'H');
  });

  readonly visibleBonds = computed(() => {
    if (this.store.showHydrogens()) return this.bondList();
    const hiddenIds = new Set(
      this.atomList().filter(a => a.element.symbol === 'H').map(a => a.id)
    );
    return this.bondList().filter(b => !hiddenIds.has(b.atomA) && !hiddenIds.has(b.atomB));
  });

  ngOnInit(): void { this.ws.start(); }
  ngOnDestroy(): void { this.ws.stop(); }

  atomRadius(atom: AtomNode): number { return this.ws.atomRadius(atom); }

  labelColor(atom: AtomNode): string {
    const hex = atom.element.cpkColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) * 0.85; // account for brightness filter
    return lum > 0.45 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)';
  }

  bondPaths(bond: Bond): string[] {
    const a = this.store.atoms().get(bond.atomA);
    const b = this.store.atoms().get(bond.atomB);
    if (!a || !b) return [];

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    // Trim line endpoints to atom surfaces so bonds are visible on large atoms
    const rA = this.atomRadius(a);
    const rB = this.atomRadius(b);
    if (len <= rA + rB + 1) return [];

    const x1 = a.x + nx * rA;
    const y1 = a.y + ny * rA;
    const x2 = b.x - nx * rB;
    const y2 = b.y - ny * rB;

    const px = -ny;
    const py =  nx;
    const spacing = 3.5;
    const n = bond.order;

    const line = (offset: number) =>
      `M ${x1 + px * offset} ${y1 + py * offset} L ${x2 + px * offset} ${y2 + py * offset}`;

    return Array.from({ length: n }, (_, i) => line((i - (n - 1) / 2) * spacing));
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.#draggingAtomId) return;
    const pt = this.#toSvg(e.clientX, e.clientY);
    this.ws.moveAtom(this.#draggingAtomId, pt.x + this.#dragOffset.x, pt.y + this.#dragOffset.y);
  }

  onMouseUp(): void {
    this.#draggingAtomId = null;
  }

  onAtomMouseDown(e: MouseEvent, atom: AtomNode): void {
    e.stopPropagation();
    this.#draggingAtomId = atom.id;
    const pt = this.#toSvg(e.clientX, e.clientY);
    this.#dragOffset = { x: atom.x - pt.x, y: atom.y - pt.y };
  }

  onAtomClick(e: MouseEvent, atom: AtomNode): void {
    e.stopPropagation();
    // Only treat as click if barely moved (not a drag)
    const pt = this.#toSvg(e.clientX, e.clientY);
    const dx = (pt.x + this.#dragOffset.x) - atom.x;
    const dy = (pt.y + this.#dragOffset.y) - atom.y;
    if (Math.hypot(dx, dy) < 5) this.ws.toggleSelect(atom.id);
  }

  onAtomDblClick(e: MouseEvent, atom: AtomNode): void {
    e.stopPropagation();
    this.ws.removeAtom(atom.id);
  }

  onBondClick(e: MouseEvent, bond: Bond): void {
    e.stopPropagation();
    this.ws.removeBond(bond.id);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.ws.selectedAtomId()) {
      this.ws.removeAtom(this.ws.selectedAtomId()!);
    }
  }

  #toSvg(clientX: number, clientY: number): { x: number; y: number } {
    const svg = this.svgRef.nativeElement;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      return pt.matrixTransform(ctm.inverse());
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: -600 + (clientX - rect.left) / rect.width * 1200,
      y: -400 + (clientY - rect.top) / rect.height * 800,
    };
  }
}
