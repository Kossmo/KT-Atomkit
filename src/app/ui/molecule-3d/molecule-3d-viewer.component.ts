import {
  Component, input, output, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, signal, computed, inject, NgZone,
  ChangeDetectionStrategy,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PubchemService, Pubchem3dConformer } from '../../api/pubchem.service';
import { DiscoveredMolecule } from '../../models';
import { ELEMENTS } from '../../lib/atom-data';

const EL_MAP = new Map(ELEMENTS.map(e => [e.atomicNumber, e]));

@Component({
  selector: 'app-molecule-3d-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">

        <div class="modal-header">
          <div class="mol-info">
            <span class="mol-name">{{ displayName() }}</span>
            <span class="mol-formula">{{ molecule().formula }}</span>
          </div>
          <button class="close-btn" (click)="closed.emit()">×</button>
        </div>

        <div class="canvas-wrap" #canvasWrap>
          <canvas #canvas></canvas>
          @if (loading()) {
            <div class="state">
              <div class="spinner"></div>
              <span>Loading 3D structure…</span>
            </div>
          } @else if (!conformer()) {
            <div class="state unavailable">
              <span>3D preview not available</span>
              <small>No conformer data on PubChem</small>
            </div>
          }
        </div>

        <div class="modal-footer">
          <span class="hint">Drag to rotate · Scroll to zoom · Right-click to pan</span>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0 0 0 / 0.85);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 300;
      animation: fade-in 0.2s ease;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .modal {
      background: #0e0e12;
      border: 1px solid rgba(255 255 255 / 0.08);
      border-radius: 14px;
      width: min(720px, calc(100vw - 32px));
      height: min(560px, calc(100vh - 60px));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slide-up 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
    }

    @keyframes slide-up {
      from { transform: translateY(24px) scale(0.96); opacity: 0; }
      to   { transform: translateY(0)     scale(1);   opacity: 1; }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px 12px;
      border-bottom: 1px solid rgba(255 255 255 / 0.06);
      flex-shrink: 0;
    }

    .mol-info {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .mol-name {
      font-size: 16px;
      font-weight: 300;
      color: rgba(255 255 255 / 0.9);
      letter-spacing: -0.01em;
    }

    .mol-formula {
      font-size: 12px;
      font-family: 'Courier New', monospace;
      color: rgba(255 255 255 / 0.35);
    }

    .close-btn {
      background: none;
      border: none;
      color: rgba(255 255 255 / 0.3);
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      transition: color 0.15s;
      &:hover { color: rgba(255 255 255 / 0.7); }
    }

    .canvas-wrap {
      flex: 1;
      position: relative;
      min-height: 0;

      canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
    }

    .state {
      position: absolute;
      inset: 0;
      background: #0d0d0f;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: rgba(255 255 255 / 0.35);
      font-size: 13px;

      &.unavailable { gap: 6px; }

      small {
        font-size: 11px;
        color: rgba(255 255 255 / 0.18);
      }
    }

    .spinner {
      width: 22px;
      height: 22px;
      border: 2px solid rgba(255 255 255 / 0.1);
      border-top-color: rgba(255 255 255 / 0.45);
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .modal-footer {
      padding: 8px 18px;
      border-top: 1px solid rgba(255 255 255 / 0.05);
      flex-shrink: 0;
    }

    .hint {
      font-size: 10px;
      color: rgba(255 255 255 / 0.18);
      letter-spacing: 0.04em;
    }
  `],
})
export class Molecule3dViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasWrap') wrapRef!: ElementRef<HTMLDivElement>;

  readonly molecule = input.required<DiscoveredMolecule>();
  readonly closed = output<void>();

  readonly loading = signal(true);
  readonly conformer = signal<Pubchem3dConformer | null>(null);
  readonly displayName = computed(() => {
    const m = this.molecule();
    return m.commonName ?? m.iupacName ?? m.formula;
  });

  readonly #pubchem = inject(PubchemService);
  readonly #zone = inject(NgZone);

  #renderer?: THREE.WebGLRenderer;
  #scene!: THREE.Scene;
  #camera!: THREE.PerspectiveCamera;
  #controls?: OrbitControls;
  #running = false;
  #frameId = 0;
  #disposables: Array<{ dispose(): void }> = [];
  #resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.#initThree();
      this.#loadConformer();
    });
  }

  ngOnDestroy(): void {
    this.#running = false;
    cancelAnimationFrame(this.#frameId);
    this.#resizeObserver?.disconnect();
    this.#controls?.dispose();
    for (const d of this.#disposables) d.dispose();
    this.#renderer?.dispose();
  }

  #initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const wrap = this.wrapRef.nativeElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;

    this.#renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.setSize(w, h, false);
    this.#renderer.setClearColor(0x0d0d0f);

    this.#scene = new THREE.Scene();
    this.#camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    this.#camera.position.set(0, 0, 8);

    this.#scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dl = new THREE.DirectionalLight(0xffffff, 0.9);
    dl.position.set(5, 10, 7);
    this.#scene.add(dl);
    const fill = new THREE.DirectionalLight(0x8899ff, 0.2);
    fill.position.set(-5, -3, -5);
    this.#scene.add(fill);

    this.#controls = new OrbitControls(this.#camera, canvas);
    this.#controls.enableDamping = true;
    this.#controls.dampingFactor = 0.08;
    this.#controls.autoRotate = true;
    this.#controls.autoRotateSpeed = 1.0;

    this.#resizeObserver = new ResizeObserver(() => {
      const nw = wrap.clientWidth;
      const nh = wrap.clientHeight;
      this.#renderer!.setSize(nw, nh, false);
      this.#camera.aspect = nw / nh;
      this.#camera.updateProjectionMatrix();
    });
    this.#resizeObserver.observe(wrap);

    this.#running = true;
    this.#zone.runOutsideAngular(() => this.#animate());
  }

  async #loadConformer(): Promise<void> {
    const mol = this.molecule();
    if (!mol.cid) { this.loading.set(false); return; }
    const conf = await this.#pubchem.get3dConformer(mol.cid);
    this.loading.set(false);
    if (conf) {
      this.conformer.set(conf);
      this.#buildMolecule(conf);
    }
  }

  #buildMolecule(conformer: Pubchem3dConformer): void {
    const posMap = new Map<number, THREE.Vector3>();

    for (const atom of conformer.atoms) {
      const el = EL_MAP.get(atom.atomicNumber);
      const color = new THREE.Color(el?.cpkColor ?? '#cccccc');
      const r = el ? Math.max(0.18, el.covalentRadius * 0.45) : 0.28;

      const geo = new THREE.SphereGeometry(r, 20, 20);
      const mat = new THREE.MeshPhongMaterial({ color, shininess: 90 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(atom.x, atom.y, atom.z);
      this.#scene.add(mesh);
      posMap.set(atom.id, mesh.position.clone());
      this.#disposables.push(geo, mat);
    }

    for (const bond of conformer.bonds) {
      if (bond.order > 3) continue;
      const pA = posMap.get(bond.aid1);
      const pB = posMap.get(bond.aid2);
      if (!pA || !pB) continue;
      this.#addBond(pA, pB, bond.order);
    }

    this.#fitCamera(conformer);
  }

  #addBond(pA: THREE.Vector3, pB: THREE.Vector3, order: number): void {
    const dir = new THREE.Vector3().subVectors(pB, pA);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), dir.clone().normalize()
    );
    const bondR = order > 1 ? 0.045 : 0.06;

    for (const offset of this.#bondOffsets(order, dir)) {
      const geo = new THREE.CylinderGeometry(bondR, bondR, len, 8);
      const mat = new THREE.MeshPhongMaterial({ color: 0xbbbbbb, shininess: 30 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(mid).add(offset);
      mesh.quaternion.copy(quat);
      this.#scene.add(mesh);
      this.#disposables.push(geo, mat);
    }
  }

  #bondOffsets(order: number, dir: THREE.Vector3): THREE.Vector3[] {
    if (order === 1) return [new THREE.Vector3()];
    const perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (perp.length() < 0.001) perp.crossVectors(dir, new THREE.Vector3(1, 0, 0));
    perp.normalize().multiplyScalar(0.11);
    if (order === 2) return [perp.clone(), perp.clone().negate()];
    return [perp.clone().negate(), new THREE.Vector3(), perp.clone()];
  }

  #fitCamera(conformer: Pubchem3dConformer): void {
    const n = conformer.atoms.length;
    if (n === 0) return;

    const center = conformer.atoms.reduce(
      (acc, a) => acc.add(new THREE.Vector3(a.x, a.y, a.z)),
      new THREE.Vector3()
    ).divideScalar(n);

    const maxDist = conformer.atoms.reduce(
      (mx, a) => Math.max(mx, new THREE.Vector3(a.x, a.y, a.z).distanceTo(center)),
      1
    );

    this.#controls!.target.copy(center);
    this.#camera.position.copy(center).add(new THREE.Vector3(0, 0, maxDist * 3.2 + 2));
    this.#controls!.update();
  }

  #animate(): void {
    if (!this.#running) return;
    this.#frameId = requestAnimationFrame(() => this.#animate());
    this.#controls?.update();
    this.#renderer?.render(this.#scene, this.#camera);
  }
}
