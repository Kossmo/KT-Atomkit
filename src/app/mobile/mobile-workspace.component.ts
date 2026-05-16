import {
  Component, OnInit, OnDestroy, inject, ElementRef, ViewChild,
  ChangeDetectionStrategy, computed, signal, output
} from '@angular/core';
import { WorkspaceService } from '../workspace/workspace.service';
import { AppStateStore } from '../store/app-state.store';
import { AtomNode, Bond } from '../models';

// ViewBox geometry constants — tighter than desktop (portrait phones need closer view)
interface ViewBox { x: number; y: number; w: number; h: number; }
const INITIAL_VB: ViewBox = { x: -185, y: -260, w: 370, h: 520 };

// Zoom limits — w shrinks when zooming in (closer view)
const MIN_VIEW_W = 200;
const MAX_VIEW_W = 2400;
const ZOOM_STEP = 1.35;

// Gesture thresholds (in CSS pixels)
const TAP_MOVE_THRESHOLD = 6;
const DOUBLE_TAP_MS = 320;

interface PointerState {
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  // What was hit when this pointer went down
  target: { kind: 'atom'; atom: AtomNode } | { kind: 'bond'; bond: Bond } | { kind: 'bg' };
  // For 'atom' targets: SVG-space offset (atom center − pointer)
  // For 'bg'   targets: initial viewBox origin snapshot
  dragRef?: { x: number; y: number };
  // For 'bond' targets: an atom whose hit zone overlaps the touch — used to
  // promote the gesture to an atom-drag if the user starts moving.
  fallbackAtom?: AtomNode;
  moved: boolean;
}

interface PinchState {
  startDist: number;
  startCenterSvg: { x: number; y: number };
  startVB: ViewBox;
}

@Component({
  selector: 'app-mobile-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      #svgEl
      class="workspace-svg"
      [attr.viewBox]="viewBoxStr()"
      (pointerdown)="onSvgPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd($event)"
      (touchcancel)="onTouchEnd($event)"
    >
      <!-- Visible bond decoration (no hit handler — hit layer is on top) -->
      <g class="bonds-layer">
        @for (bond of visibleBonds(); track bond.id) {
          <g class="bond-deco">
            @for (path of bondPaths(bond); track $index) {
              <path class="bond-line" [attr.d]="path" />
            }
          </g>
        }
      </g>

      <g class="atoms-layer">
        @for (atom of visibleAtoms(); track atom.id) {
          <g
            class="atom-group"
            [attr.data-atom-id]="atom.id"
            [attr.transform]="'translate(' + atom.x + ',' + atom.y + ')'"
            (pointerdown)="onAtomPointerDown($event, atom)"
          >
            <circle class="atom-hit" [attr.r]="hitRadius(atom)" />
            <circle
              class="atom-circle"
              [attr.r]="atomRadius(atom)"
              [attr.fill]="atom.element.cpkColor"
            />
            <text class="atom-label" dy="0.35em" [attr.fill]="labelColor(atom)">{{ atom.element.symbol }}</text>
          </g>
        }
      </g>

      <!-- Bond hit layer — rendered last so its hit area sits ABOVE the atom hits -->
      <g class="bonds-hit-layer">
        @for (bond of visibleBonds(); track bond.id) {
          <path
            class="bond-hit"
            [attr.d]="bondHitPath(bond)"
            [attr.data-bond-id]="bond.id"
            (pointerdown)="onBondPointerDown($event, bond)"
          />
        }
      </g>
    </svg>

    @if (atomList().length === 0) {
      <div class="empty-hint">
        <span>Tap an element to place it here</span>
        <span class="sub">Drag atoms · Pinch to zoom · Tap bond to break it</span>
      </div>
    }

    <div class="zoom-controls">
      <button class="zoom-btn" (click)="zoomBy(1 / ZOOM_STEP)" aria-label="Zoom in">+</button>
      <button class="zoom-btn" (click)="zoomBy(ZOOM_STEP)" aria-label="Zoom out">−</button>
      <button class="zoom-btn reset" (click)="resetView()" aria-label="Reset view">⊙</button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }

    .workspace-svg {
      width: 100%;
      height: 100%;
      background: #0d0d0f;
      user-select: none;
      touch-action: none;          /* CRITICAL: lets us handle pinch + pan ourselves */
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }

    .bond-line {
      fill: none;
      stroke: rgba(255 255 255 / 0.4);
      stroke-width: 2;
      stroke-linecap: round;
      pointer-events: none;          /* visible deco — never catches taps */
    }

    .bond-hit {
      fill: none;
      stroke: transparent;
      stroke-width: 22;
      stroke-linecap: butt;
      pointer-events: stroke;        /* only the stroke area counts as hit */
      cursor: pointer;
      touch-action: none;

      &:active { stroke: rgba(255 100 100 / 0.22); }
    }

    .atom-group {
      cursor: grab;
      touch-action: none;
    }

    .atom-hit {
      fill: transparent;
    }

    .atom-circle {
      stroke: rgba(255 255 255 / 0.18);
      stroke-width: 1;
      filter: saturate(0.55) brightness(0.85);
    }

    .atom-label {
      text-anchor: middle;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 12px;
      font-weight: 700;
      pointer-events: none;
      letter-spacing: -0.02em;
    }

    .empty-hint {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      pointer-events: none;
      color: rgba(255 255 255 / 0.15);
      font-size: 14px;
      text-align: center;
      padding: 0 24px;

      .sub {
        font-size: 11px;
        color: rgba(255 255 255 / 0.08);
      }
    }

    /* Zoom controls — sit above the bottom-sheet peek (72px + margin) and clear the iOS home indicator */
    .zoom-controls {
      position: absolute;
      right: 10px;
      bottom: calc(env(safe-area-inset-bottom, 0) + 88px);
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 5;
    }

    .zoom-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid rgba(255 255 255 / 0.1);
      background: rgba(10 10 14 / 0.78);
      color: rgba(255 255 255 / 0.75);
      font-size: 18px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      touch-action: manipulation;

      &:active { background: rgba(255 255 255 / 0.12); }

      &.reset { font-size: 14px; }
    }
  `],
})
export class MobileWorkspaceComponent implements OnInit, OnDestroy {
  @ViewChild('svgEl', { static: true }) svgRef!: ElementRef<SVGSVGElement>;

  readonly ws = inject(WorkspaceService);
  readonly store = inject(AppStateStore);

  readonly viewBox = signal({ ...INITIAL_VB });
  readonly viewBoxStr = computed(() => {
    const v = this.viewBox();
    return `${v.x} ${v.y} ${v.w} ${v.h}`;
  });

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

  /** Emitted on a tap (no drag, no atom/bond) on empty SVG — used to close hint panel. */
  readonly bgTap = output<void>();

  readonly #pointers = new Map<number, PointerState>();
  #pinch: PinchState | null = null;
  #lastTap: { atomId: string; time: number } | null = null;

  /** When true, a TouchEvent-driven pinch is in progress — pointer events must defer. */
  #touchPinchActive = false;

  // Exposed for template
  readonly ZOOM_STEP = ZOOM_STEP;

  ngOnInit(): void { this.ws.start(); }
  ngOnDestroy(): void { this.ws.stop(); }

  /** factor > 1 = zoom out, factor < 1 = zoom in. Anchored on viewBox center. */
  zoomBy(factor: number): void {
    const vb = this.viewBox();
    const cx = vb.x + vb.w / 2;
    const cy = vb.y + vb.h / 2;
    let newW = vb.w * factor;
    newW = Math.max(MIN_VIEW_W, Math.min(MAX_VIEW_W, newW));
    const aspect = vb.h / vb.w;
    const newH = newW * aspect;
    this.viewBox.set({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH });
  }

  resetView(): void {
    this.viewBox.set({ ...INITIAL_VB });
  }

  atomRadius(atom: AtomNode): number { return this.ws.atomRadius(atom); }

  /** Expanded tactile hit radius — at least 24 SVG units, scales with atom size. */
  hitRadius(atom: AtomNode): number {
    return Math.max(24, this.atomRadius(atom) + 10);
  }

  /** Single straight line from atom A to atom B (trimmed to their surfaces) for hit detection. */
  bondHitPath(bond: Bond): string {
    const a = this.store.atoms().get(bond.atomA);
    const b = this.store.atoms().get(bond.atomB);
    if (!a || !b) return '';
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const rA = this.atomRadius(a);
    const rB = this.atomRadius(b);
    if (len <= rA + rB + 1) return '';
    return `M ${a.x + nx * rA} ${a.y + ny * rA} L ${b.x - nx * rB} ${b.y - ny * rB}`;
  }

  labelColor(atom: AtomNode): string {
    const hex = atom.element.cpkColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) * 0.85;
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
    const rA = this.atomRadius(a);
    const rB = this.atomRadius(b);
    if (len <= rA + rB + 1) return [];
    const x1 = a.x + nx * rA;
    const y1 = a.y + ny * rA;
    const x2 = b.x - nx * rB;
    const y2 = b.y - ny * rB;
    const px = -ny;
    const py = nx;
    const spacing = 3.5;
    const n = bond.order;
    const line = (offset: number) =>
      `M ${x1 + px * offset} ${y1 + py * offset} L ${x2 + px * offset} ${y2 + py * offset}`;
    return Array.from({ length: n }, (_, i) => line((i - (n - 1) / 2) * spacing));
  }

  // ── Pointer handlers ──────────────────────────────────────────────────

  onAtomPointerDown(e: PointerEvent, atom: AtomNode): void {
    if (this.#touchPinchActive) return;
    e.stopPropagation();
    this.#registerPointer(e, { kind: 'atom', atom });
  }

  onBondPointerDown(e: PointerEvent, bond: Bond): void {
    if (this.#touchPinchActive) return;
    e.stopPropagation();
    this.#registerPointer(e, { kind: 'bond', bond });
    // If the touch also falls inside an atom's hit zone, remember it — a
    // subsequent drag will promote the gesture to an atom drag instead of
    // deleting the bond.
    const p = this.#pointers.get(e.pointerId);
    if (!p) return;
    const svg = this.#toSvg(e.clientX, e.clientY);
    for (const atom of this.store.atoms().values()) {
      const dx = atom.x - svg.x;
      const dy = atom.y - svg.y;
      if (Math.hypot(dx, dy) <= this.hitRadius(atom)) {
        p.fallbackAtom = atom;
        break;
      }
    }
  }

  onSvgPointerDown(e: PointerEvent): void {
    if (this.#touchPinchActive) return;
    this.#registerPointer(e, { kind: 'bg' });
  }

  onPointerMove(e: PointerEvent): void {
    if (this.#touchPinchActive) return;
    const p = this.#pointers.get(e.pointerId);
    if (!p) return;

    p.clientX = e.clientX;
    p.clientY = e.clientY;

    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD) p.moved = true;

    // 2-pointer pinch always takes over single-pointer actions
    if (this.#pointers.size >= 2) {
      this.#updatePinch();
      return;
    }

    if (!p.moved) return;

    // Bond + drag, with an atom underneath → switch to atom drag
    if (p.target.kind === 'bond' && p.fallbackAtom && !p.dragRef) {
      const atom = p.fallbackAtom;
      p.target = { kind: 'atom', atom };
      const svgStart = this.#toSvg(p.startX, p.startY);
      p.dragRef = { x: atom.x - svgStart.x, y: atom.y - svgStart.y };
    }

    if (!p.dragRef) return;

    if (p.target.kind === 'atom') {
      const svg = this.#toSvg(e.clientX, e.clientY);
      this.ws.moveAtom(p.target.atom.id, svg.x + p.dragRef.x, svg.y + p.dragRef.y);
    } else if (p.target.kind === 'bg') {
      // Pan: translate viewBox so the gesture's start point stays under the finger.
      const { sx, sy } = this.#svgUnitsPerClientPx();
      const vb = this.viewBox();
      this.viewBox.set({ ...vb, x: p.dragRef.x - dx * sx, y: p.dragRef.y - dy * sy });
    }
  }

  onPointerUp(e: PointerEvent): void {
    if (this.#touchPinchActive) return;
    const p = this.#pointers.get(e.pointerId);
    if (!p) return;
    this.#pointers.delete(e.pointerId);

    try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }

    // Coming out of pinch: re-anchor the remaining pointer to avoid a jump,
    // then ignore this lift (no tap/drag action).
    if (this.#pinch !== null) {
      if (this.#pointers.size < 2) {
        this.#pinch = null;
        // Re-baseline the surviving pointer so subsequent moves don't snap
        for (const survivor of this.#pointers.values()) {
          survivor.startX = survivor.clientX;
          survivor.startY = survivor.clientY;
          survivor.moved = false;
          // Switch its action to a fresh pan (forget original atom/bond target)
          survivor.target = { kind: 'bg' };
          survivor.dragRef = { x: this.viewBox().x, y: this.viewBox().y };
        }
      }
      return;
    }

    // Tap (no significant movement) → trigger action
    if (!p.moved) {
      if (p.target.kind === 'atom') {
        const now = performance.now();
        const atomId = p.target.atom.id;
        if (this.#lastTap && this.#lastTap.atomId === atomId &&
            now - this.#lastTap.time < DOUBLE_TAP_MS) {
          this.ws.removeAtom(atomId);
          this.#lastTap = null;
        } else {
          this.ws.toggleSelect(atomId);
          this.#lastTap = { atomId, time: now };
        }
      } else if (p.target.kind === 'bond') {
        this.ws.removeBond(p.target.bond.id);
      } else {
        // Background tap — deselect + notify parent (close hints, etc.)
        this.ws.selectedAtomId.set(null);
        this.bgTap.emit();
      }
    }
  }

  // ── TouchEvent fallback (Chrome DevTools shift+drag, robust multi-touch) ──

  onTouchStart(e: TouchEvent): void {
    if (e.touches.length < 2) return;
    e.preventDefault();
    this.#touchPinchActive = true;
    // Cancel any single-pointer drag in progress to avoid mid-gesture jumps
    this.#pointers.clear();
    this.#beginTouchPinch(e.touches);
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.#touchPinchActive || e.touches.length < 2) return;
    e.preventDefault();
    this.#updateTouchPinch(e.touches);
  }

  onTouchEnd(e: TouchEvent): void {
    if (!this.#touchPinchActive) return;
    if (e.touches.length < 2) {
      this.#touchPinchActive = false;
      this.#pinch = null;
    }
  }

  #beginTouchPinch(touches: TouchList): void {
    const t1 = touches[0], t2 = touches[1];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY) || 1;
    const cx = (t1.clientX + t2.clientX) / 2;
    const cy = (t1.clientY + t2.clientY) / 2;
    this.#pinch = {
      startDist: dist,
      startCenterSvg: this.#toSvg(cx, cy),
      startVB: { ...this.viewBox() },
    };
  }

  #updateTouchPinch(touches: TouchList): void {
    if (!this.#pinch) return;
    const t1 = touches[0], t2 = touches[1];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY) || 1;
    const scale = dist / this.#pinch.startDist;
    let newW = this.#pinch.startVB.w / scale;
    newW = Math.max(MIN_VIEW_W, Math.min(MAX_VIEW_W, newW));
    const aspect = this.#pinch.startVB.h / this.#pinch.startVB.w;
    const newH = newW * aspect;

    const cxNow = (t1.clientX + t2.clientX) / 2;
    const cyNow = (t1.clientY + t2.clientY) / 2;
    const rect = this.svgRef.nativeElement.getBoundingClientRect();
    const fracX = (cxNow - rect.left) / rect.width;
    const fracY = (cyNow - rect.top) / rect.height;
    const newX = this.#pinch.startCenterSvg.x - fracX * newW;
    const newY = this.#pinch.startCenterSvg.y - fracY * newH;

    this.viewBox.set({ x: newX, y: newY, w: newW, h: newH });
  }

  // ── Internal helpers ─────────────────────────────────────────────────

  #registerPointer(e: PointerEvent, target: PointerState['target']): void {
    const svg = this.#toSvg(e.clientX, e.clientY);
    const p: PointerState = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      target,
      moved: false,
    };
    if (target.kind === 'atom') {
      p.dragRef = { x: target.atom.x - svg.x, y: target.atom.y - svg.y };
    } else if (target.kind === 'bg') {
      // Snapshot the viewBox so pan computes from a stable origin
      p.dragRef = { x: this.viewBox().x, y: this.viewBox().y };
    }
    this.#pointers.set(e.pointerId, p);

    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }

    // Going from 1 → 2 pointers: start pinch
    if (this.#pointers.size === 2) this.#beginPinch();
  }

  #beginPinch(): void {
    const ps = [...this.#pointers.values()];
    if (ps.length < 2) return;
    const [a, b] = ps;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    const cx = (a.clientX + b.clientX) / 2;
    const cy = (a.clientY + b.clientY) / 2;
    const svgCenter = this.#toSvg(cx, cy);
    this.#pinch = {
      startDist: dist,
      startCenterSvg: svgCenter,
      startVB: { ...this.viewBox() },
    };
  }

  #updatePinch(): void {
    if (!this.#pinch) return;
    const ps = [...this.#pointers.values()];
    if (ps.length < 2) return;
    const [a, b] = ps;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
    const scale = dist / this.#pinch.startDist;

    // New viewBox size = inverse of zoom (zoom in → smaller viewBox)
    let newW = this.#pinch.startVB.w / scale;
    newW = Math.max(MIN_VIEW_W, Math.min(MAX_VIEW_W, newW));
    const aspect = this.#pinch.startVB.h / this.#pinch.startVB.w;
    const newH = newW * aspect;

    // Translate so the SVG point under the gesture centroid stays under the (moved) centroid
    const cxNow = (a.clientX + b.clientX) / 2;
    const cyNow = (a.clientY + b.clientY) / 2;
    const rect = this.svgRef.nativeElement.getBoundingClientRect();
    const fracX = (cxNow - rect.left) / rect.width;
    const fracY = (cyNow - rect.top) / rect.height;

    // Anchor: keep the original SVG-space center fixed at the current client centroid
    const newX = this.#pinch.startCenterSvg.x - fracX * newW;
    const newY = this.#pinch.startCenterSvg.y - fracY * newH;

    this.viewBox.set({ x: newX, y: newY, w: newW, h: newH });
  }

  #svgUnitsPerClientPx(): { sx: number; sy: number } {
    const rect = this.svgRef.nativeElement.getBoundingClientRect();
    const vb = this.viewBox();
    return { sx: vb.w / rect.width, sy: vb.h / rect.height };
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
    const vb = this.viewBox();
    return {
      x: vb.x + (clientX - rect.left) / rect.width * vb.w,
      y: vb.y + (clientY - rect.top) / rect.height * vb.h,
    };
  }
}
