import {
  Component, ChangeDetectionStrategy, ElementRef, ViewChild,
  signal, computed, input, effect, output
} from '@angular/core';

export type SheetSnap = 'peek' | 'half' | 'full';

const PEEK_PX = 72;            // visible height when collapsed (handle + a hint)
const HALF_FRACTION = 0.5;     // 50dvh
const FULL_FRACTION = 0.92;    // ~92dvh — leaves room for top nav
const VELOCITY_SNAP = 0.5;     // px/ms threshold to snap in flick direction

@Component({
  selector: 'app-mobile-bottom-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (snap() !== 'peek') {
      <div
        class="sheet-backdrop"
        [style.opacity]="backdropOpacity()"
        (pointerdown)="onBackdropTap($event)"
      ></div>
    }

    <div
      #sheet
      class="sheet"
      [style.height.px]="fullHeight()"
      [style.transform]="'translateY(' + translateY() + 'px)'"
      [class.dragging]="dragging()"
    >
      <div
        class="sheet-handle-zone"
        (pointerdown)="onHandleDown($event)"
        (pointermove)="onHandleMove($event)"
        (pointerup)="onHandleUp($event)"
        (pointercancel)="onHandleUp($event)"
      >
        <div class="sheet-handle"></div>
      </div>

      <div class="sheet-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 25;
    }

    .sheet-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0 0 0 / 0.45);
      pointer-events: auto;
      transition: opacity 0.2s ease;
    }

    .sheet {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(14 14 18 / 0.96);
      backdrop-filter: blur(24px);
      border-top: 1px solid rgba(255 255 255 / 0.08);
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -8px 32px rgba(0 0 0 / 0.5);
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      transition: transform 0.28s cubic-bezier(0.32, 0.72, 0.18, 1);
      padding-bottom: env(safe-area-inset-bottom, 0);
      will-change: transform;

      &.dragging { transition: none; }
    }

    .sheet-handle-zone {
      flex-shrink: 0;
      padding: 8px 0 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      touch-action: none;

      &:active { cursor: grabbing; }
    }

    .sheet-handle {
      width: 40px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255 255 255 / 0.25);
    }

    .sheet-content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: rgba(255 255 255 / 0.1); border-radius: 2px; }
    }
  `],
})
export class MobileBottomSheetComponent {
  @ViewChild('sheet', { static: true }) sheetRef!: ElementRef<HTMLDivElement>;

  // Inputs / outputs
  readonly initialSnap = input<SheetSnap>('peek');
  readonly snapChange = output<SheetSnap>();

  // Internal state
  readonly snap = signal<SheetSnap>('peek');
  readonly dragging = signal(false);
  readonly #dragDelta = signal(0);                // px offset added during a drag (positive = drag down)
  readonly #viewportHeight = signal(window.innerHeight);

  #pointerId: number | null = null;
  #dragStartY = 0;
  #lastMoveY = 0;
  #lastMoveT = 0;
  #velocity = 0;

  readonly fullHeight = computed(() => Math.round(this.#viewportHeight() * FULL_FRACTION));
  readonly halfHeight = computed(() => Math.round(this.#viewportHeight() * HALF_FRACTION));

  /** Y translation from the natural (fully-up) position. Positive = moved down. */
  readonly translateY = computed(() => {
    const full = this.fullHeight();
    let base: number;
    switch (this.snap()) {
      case 'full': base = 0; break;
      case 'half': base = full - this.halfHeight(); break;
      case 'peek': base = full - PEEK_PX; break;
    }
    // Clamp drag so user can't pull beyond peek or above full
    const max = full - PEEK_PX;
    return Math.max(0, Math.min(max, base + this.#dragDelta()));
  });

  readonly backdropOpacity = computed(() => {
    const full = this.fullHeight();
    const visible = full - this.translateY();
    const progress = Math.max(0, Math.min(1, (visible - PEEK_PX) / (this.halfHeight() - PEEK_PX)));
    return (progress * 0.5).toFixed(2);
  });

  readonly #initSnap = effect(() => {
    this.snap.set(this.initialSnap());
  }, { allowSignalWrites: true });

  readonly #resize = (() => {
    window.addEventListener('resize', () => this.#viewportHeight.set(window.innerHeight));
    return null;
  })();

  setSnap(s: SheetSnap): void {
    this.snap.set(s);
    this.snapChange.emit(s);
  }

  onBackdropTap(_e: PointerEvent): void {
    this.setSnap('peek');
  }

  onHandleDown(e: PointerEvent): void {
    this.#pointerId = e.pointerId;
    this.#dragStartY = e.clientY;
    this.#lastMoveY = e.clientY;
    this.#lastMoveT = performance.now();
    this.#velocity = 0;
    this.dragging.set(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  onHandleMove(e: PointerEvent): void {
    if (this.#pointerId !== e.pointerId) return;
    const dy = e.clientY - this.#dragStartY;
    this.#dragDelta.set(dy);

    const now = performance.now();
    const dt = now - this.#lastMoveT;
    if (dt > 0) this.#velocity = (e.clientY - this.#lastMoveY) / dt;
    this.#lastMoveY = e.clientY;
    this.#lastMoveT = now;
  }

  onHandleUp(e: PointerEvent): void {
    if (this.#pointerId !== e.pointerId) return;
    this.#pointerId = null;
    this.dragging.set(false);

    const delta = this.#dragDelta();
    this.#dragDelta.set(0);

    // Velocity flick → snap in direction
    if (Math.abs(this.#velocity) > VELOCITY_SNAP) {
      const flickDown = this.#velocity > 0;
      const next = this.#nextSnap(this.snap(), flickDown ? +1 : -1);
      this.setSnap(next);
      return;
    }

    // Otherwise: snap to nearest by final position
    const full = this.fullHeight();
    const finalVisible = full - (this.#baseFor(this.snap()) + delta);
    this.setSnap(this.#nearestSnap(finalVisible));
  }

  #baseFor(s: SheetSnap): number {
    const full = this.fullHeight();
    if (s === 'full') return 0;
    if (s === 'half') return full - this.halfHeight();
    return full - PEEK_PX;
  }

  #nearestSnap(visiblePx: number): SheetSnap {
    const candidates: { s: SheetSnap; v: number }[] = [
      { s: 'peek', v: PEEK_PX },
      { s: 'half', v: this.halfHeight() },
      { s: 'full', v: this.fullHeight() },
    ];
    let best = candidates[0];
    let bestDist = Math.abs(visiblePx - best.v);
    for (const c of candidates.slice(1)) {
      const d = Math.abs(visiblePx - c.v);
      if (d < bestDist) { best = c; bestDist = d; }
    }
    return best.s;
  }

  #nextSnap(current: SheetSnap, dir: 1 | -1): SheetSnap {
    const order: SheetSnap[] = ['peek', 'half', 'full'];
    const idx = order.indexOf(current);
    const next = Math.max(0, Math.min(order.length - 1, idx + (dir === 1 ? -1 : +1)));
    return order[next];
  }
}
