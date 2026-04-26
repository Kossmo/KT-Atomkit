import { Injectable, signal, computed } from '@angular/core';
import { AppMode, AtomNode, Bond, DiscoveredMolecule } from '../models';

const STORAGE_KEY = 'atomkit_collection';
const CHALLENGES_KEY = 'atomkit_challenges';
const DAILY_KEY = 'atomkit_daily';

@Injectable({ providedIn: 'root' })
export class AppStateStore {
  readonly mode = signal<AppMode>('real');
  readonly showHydrogens = signal(true);
  readonly muted = signal(false);
  readonly volume = signal(0.6);
  readonly sidebarOpen = signal(true);

  readonly atoms = signal<Map<string, AtomNode>>(new Map());
  readonly bonds = signal<Map<string, Bond>>(new Map());

  readonly collection = signal<DiscoveredMolecule[]>(this.#loadCollection());

  readonly completedChallengeIds = signal<string[]>(this.#load<string[]>(CHALLENGES_KEY, []));
  readonly dailyCompletedDate = signal<string | null>(this.#load<string | null>(DAILY_KEY, null));

  readonly famousCount = computed(() => this.collection().filter(m => m.type === 'famous').length);
  readonly exploratoryCount = computed(() => this.collection().filter(m => m.type === 'exploratory').length);

  readonly freeValences = computed(() => {
    const result = new Map<string, number>();
    for (const [id, atom] of this.atoms()) {
      const maxValence = atom.element.valences[0] ?? 0;
      result.set(id, maxValence - atom.usedValences);
    }
    return result;
  });

  toggleMode(): void { this.mode.update(m => m === 'real' ? 'exploratory' : 'real'); }
  toggleHydrogens(): void { this.showHydrogens.update(v => !v); }
  toggleMuted(): void { this.muted.update(v => !v); }
  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }

  addAtom(atom: AtomNode): void {
    this.atoms.update(m => new Map(m).set(atom.id, atom));
  }

  removeAtom(id: string): void {
    this.atoms.update(m => { const n = new Map(m); n.delete(id); return n; });
  }

  updateAtom(id: string, patch: Partial<AtomNode>): void {
    this.atoms.update(m => {
      const atom = m.get(id);
      if (!atom) return m;
      return new Map(m).set(id, { ...atom, ...patch });
    });
  }

  addBond(bond: Bond): void {
    this.bonds.update(m => new Map(m).set(bond.id, bond));
  }

  removeBond(id: string): void {
    this.bonds.update(m => { const n = new Map(m); n.delete(id); return n; });
  }

  clearScene(): void {
    this.atoms.set(new Map());
    this.bonds.set(new Map());
  }

  readonly pendingDiscoveries = signal<DiscoveredMolecule[]>([]);
  readonly isDiscovering = signal(false);

  pushDiscovery(m: DiscoveredMolecule): void {
    this.pendingDiscoveries.update(list => [m, ...list]);
  }

  dismissDiscovery(): void {
    this.pendingDiscoveries.update(list => list.slice(1));
  }

  clearDiscoveries(): void {
    this.pendingDiscoveries.set([]);
  }

  addToCollection(molecule: DiscoveredMolecule): void {
    if (this.collection().some(m => m.smiles === molecule.smiles)) return;
    this.collection.update(list => [molecule, ...list]);
    this.#saveCollection();
  }

  updateIsomerCount(smiles: string, count: number): void {
    this.collection.update(list =>
      list.map(m => m.smiles === smiles ? { ...m, isomerCount: count } : m)
    );
    this.#saveCollection();
  }

  completeChallenge(id: string): void {
    if (this.completedChallengeIds().includes(id)) return;
    this.completedChallengeIds.update(ids => [...ids, id]);
    try { localStorage.setItem(CHALLENGES_KEY, JSON.stringify(this.completedChallengeIds())); } catch { /* quota */ }
  }

  completeDailyChallenge(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.dailyCompletedDate.set(today);
    try { localStorage.setItem(DAILY_KEY, JSON.stringify(today)); } catch { /* quota */ }
  }

  #loadCollection(): DiscoveredMolecule[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  #load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  #saveCollection(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.collection())); } catch { /* quota */ }
  }
}
