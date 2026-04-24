import { Injectable, NgZone, inject, signal } from '@angular/core';
import { AppStateStore } from '../store/app-state.store';
import { AudioService } from '../audio/audio.service';
import { ElementData, AtomNode, Bond, BondType, FragmentDef } from '../models';
import { ELEMENTS } from '../lib/atom-data';

const ATOM_RADIUS_BASE = 14;
const BOND_DIST = 52;
const REPEL_FORCE = 2800;
const SPRING_K = 0.12;
const DAMPING = 0.78;
const BOND_COOLDOWN_MS = 1200;
const BREAK_IMPULSE = 4;

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly #store = inject(AppStateStore);
  readonly #audio = inject(AudioService);
  readonly #zone = inject(NgZone);

  readonly selectedAtomId = signal<string | null>(null);

  #frameId = 0;
  #running = false;
  readonly #cooldownPairs = new Map<string, number>(); // key: "idA_idB", value: expiry timestamp

  start(): void {
    if (this.#running) return;
    this.#running = true;
    this.#zone.runOutsideAngular(() => this.#tick());
  }

  stop(): void {
    this.#running = false;
    cancelAnimationFrame(this.#frameId);
  }

  spawnAtom(element: ElementData, x?: number, y?: number): string {
    const id = crypto.randomUUID();
    const cx = x ?? (Math.random() - 0.5) * 300;
    const cy = y ?? (Math.random() - 0.5) * 200;

    const atom: AtomNode = {
      id, element,
      x: cx, y: cy,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      usedValences: 0,
      bonds: [],
    };
    this.#store.addAtom(atom);
    return id;
  }

  removeAtom(atomId: string): void {
    const atom = this.#store.atoms().get(atomId);
    if (!atom) return;
    for (const bondId of [...atom.bonds]) this.removeBond(bondId);
    this.#store.removeAtom(atomId);
    if (this.selectedAtomId() === atomId) this.selectedAtomId.set(null);
  }

  removeBond(bondId: string): void {
    const bond = this.#store.bonds().get(bondId);
    if (!bond) return;

    const atomA = this.#store.atoms().get(bond.atomA);
    const atomB = this.#store.atoms().get(bond.atomB);

    // Cooldown — prevent immediate re-bonding
    const expiry = Date.now() + BOND_COOLDOWN_MS;
    this.#cooldownPairs.set(`${bond.atomA}_${bond.atomB}`, expiry);
    this.#cooldownPairs.set(`${bond.atomB}_${bond.atomA}`, expiry);

    // Separation impulse so atoms drift apart after bond break
    if (atomA && atomB) {
      const dx = atomB.x - atomA.x;
      const dy = atomB.y - atomA.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      this.#store.updateAtom(atomA.id, {
        usedValences: Math.max(0, atomA.usedValences - bond.order),
        bonds: atomA.bonds.filter(b => b !== bondId),
        vx: -nx * BREAK_IMPULSE,
        vy: -ny * BREAK_IMPULSE,
      });
      this.#store.updateAtom(atomB.id, {
        usedValences: Math.max(0, atomB.usedValences - bond.order),
        bonds: atomB.bonds.filter(b => b !== bondId),
        vx: nx * BREAK_IMPULSE,
        vy: ny * BREAK_IMPULSE,
      });
    } else {
      if (atomA) this.#store.updateAtom(atomA.id, {
        usedValences: Math.max(0, atomA.usedValences - bond.order),
        bonds: atomA.bonds.filter(b => b !== bondId),
      });
      if (atomB) this.#store.updateAtom(atomB.id, {
        usedValences: Math.max(0, atomB.usedValences - bond.order),
        bonds: atomB.bonds.filter(b => b !== bondId),
      });
    }
    this.#store.removeBond(bondId);
  }

  moveAtom(atomId: string, x: number, y: number): void {
    this.#store.updateAtom(atomId, { x, y, vx: 0, vy: 0 });
  }

  toggleSelect(atomId: string): void {
    this.selectedAtomId.update(id => id === atomId ? null : atomId);
  }

  spawnFragment(def: FragmentDef, cx = (Math.random() - 0.5) * 200, cy = (Math.random() - 0.5) * 150): void {
    const ids: string[] = [];
    for (const a of def.atoms) {
      const el = ELEMENTS.find(e => e.symbol === a.symbol);
      ids.push(el ? this.spawnAtom(el, cx + a.dx, cy + a.dy) : '');
    }
    for (const b of def.bonds) {
      const aId = ids[b.from];
      const bId = ids[b.to];
      if (aId && bId) this.#createBond(aId, bId, b.type, true);
    }
  }

  clearScene(): void {
    this.#store.clearScene();
    this.selectedAtomId.set(null);
  }

  atomRadius(atom: AtomNode): number {
    return Math.max(10, atom.element.covalentRadius * ATOM_RADIUS_BASE);
  }

  #upgradeBond(bond: Bond): void {
    const atomA = this.#store.atoms().get(bond.atomA);
    const atomB = this.#store.atoms().get(bond.atomB);
    if (!atomA || !atomB) return;

    // Re-check current free valences — snapshot in tick loop may be stale
    const fvA = (atomA.element.valences[0] ?? 0) - atomA.usedValences;
    const fvB = (atomB.element.valences[0] ?? 0) - atomB.usedValences;
    if (fvA < 1 || fvB < 1) return;

    // Guard against double-call in same tick
    const currentBond = this.#store.bonds().get(bond.id);
    if (!currentBond || currentBond.order !== bond.order) return;

    const newOrder = bond.order + 1;
    const newType: BondType = newOrder <= 1 ? 'single' : newOrder === 2 ? 'double' : 'triple';

    this.#store.bonds.update(m => {
      const next = new Map(m);
      next.set(bond.id, { ...bond, type: newType, order: newOrder });
      return next;
    });
    this.#store.updateAtom(atomA.id, { usedValences: atomA.usedValences + 1 });
    this.#store.updateAtom(atomB.id, { usedValences: atomB.usedValences + 1 });
    this.#audio.playBondSound();
  }

  #createBond(atomAId: string, atomBId: string, type: BondType = 'single', silent = false): void {
    const atomA = this.#store.atoms().get(atomAId);
    const atomB = this.#store.atoms().get(atomBId);
    if (!atomA || !atomB) return;

    // Re-check current free valences — tick snapshot may be stale
    const fvA = (atomA.element.valences[0] ?? 0) - atomA.usedValences;
    const fvB = (atomB.element.valences[0] ?? 0) - atomB.usedValences;
    if (fvA <= 0 || fvB <= 0) return;

    const id = crypto.randomUUID();
    const order = type === 'single' ? 1 : type === 'double' ? 2 : 3;
    const bond: Bond = { id, atomA: atomAId, atomB: atomBId, type, order };
    this.#store.addBond(bond);
    this.#store.updateAtom(atomAId, {
      usedValences: atomA.usedValences + order,
      bonds: [...atomA.bonds, id],
    });
    this.#store.updateAtom(atomBId, {
      usedValences: atomB.usedValences + order,
      bonds: [...atomB.bonds, id],
    });
    if (!silent) this.#zone.run(() => this.#audio.playBondSound());
  }

  #tick(): void {
    if (!this.#running) return;
    this.#frameId = requestAnimationFrame(() => this.#tick());

    const atoms = [...this.#store.atoms().values()];
    if (atoms.length < 1) return;

    // Purge expired cooldowns
    if (this.#cooldownPairs.size > 0) {
      const now = Date.now();
      for (const [key, expiry] of this.#cooldownPairs) {
        if (now > expiry) this.#cooldownPairs.delete(key);
      }
    }

    const freeValences = this.#store.freeValences();
    const forces = new Map<string, { fx: number; fy: number }>();
    for (const a of atoms) forces.set(a.id, { fx: 0, fy: 0 });

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const a = atoms[i];
        const b = atoms[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const nx = dx / dist;
        const ny = dy / dist;

        const fvA = freeValences.get(a.id) ?? 0;
        const fvB = freeValences.get(b.id) ?? 0;

        // Find existing bond between a and b (if any)
        let existingBond: Bond | undefined;
        const alreadyBonded = a.bonds.some(bId => {
          const bd = this.#store.bonds().get(bId);
          if (bd && (bd.atomA === b.id || bd.atomB === b.id)) {
            existingBond = bd;
            return true;
          }
          return false;
        });

        // Auto-bond when close enough, valences available, and not in cooldown
        const pairKey = `${a.id}_${b.id}`;
        const cooldownExpiry = this.#cooldownPairs.get(pairKey) ?? 0;
        if (dist < BOND_DIST && fvA > 0 && fvB > 0 && !alreadyBonded && Date.now() > cooldownExpiry) {
          this.#zone.run(() => this.#createBond(a.id, b.id));
          continue;
        }

        // Spring force if bonded (maintain bond distance)
        if (alreadyBonded) {
          // Upgrade bond order (single→double→triple→…) while both atoms have free valences
          if (fvA > 0 && fvB > 0 && existingBond) {
            this.#zone.run(() => this.#upgradeBond(existingBond!));
          }

          const stretch = dist - BOND_DIST;
          const f = SPRING_K * stretch;
          forces.get(a.id)!.fx += nx * f;
          forces.get(a.id)!.fy += ny * f;
          forces.get(b.id)!.fx -= nx * f;
          forces.get(b.id)!.fy -= ny * f;
          continue;
        }

        // Repulsion between all atoms
        if (dist < ATOM_RADIUS_BASE * 5) {
          const f = REPEL_FORCE / (dist * dist);
          forces.get(a.id)!.fx -= nx * f;
          forces.get(a.id)!.fy -= ny * f;
          forces.get(b.id)!.fx += nx * f;
          forces.get(b.id)!.fy += ny * f;
        }
      }
    }

    // Compute position deltas — keep bonds/usedValences from current store state
    const deltas = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    let anyMoved = false;
    for (const atom of atoms) {
      const f = forces.get(atom.id)!;
      const vx = (atom.vx + f.fx) * DAMPING;
      const vy = (atom.vy + f.fy) * DAMPING;
      const nx = atom.x + vx;
      const ny = atom.y + vy;
      if (Math.abs(nx - atom.x) > 0.01 || Math.abs(ny - atom.y) > 0.01) anyMoved = true;
      deltas.set(atom.id, { x: nx, y: ny, vx, vy });
    }

    if (anyMoved) {
      this.#zone.run(() => {
        // Merge only position/velocity — preserve bonds & usedValences set by #createBond
        this.#store.atoms.update(m => {
          const next = new Map(m);
          for (const [id, d] of deltas) {
            const cur = next.get(id);
            if (cur) next.set(id, { ...cur, ...d });
          }
          return next;
        });
      });
    }
  }
}
