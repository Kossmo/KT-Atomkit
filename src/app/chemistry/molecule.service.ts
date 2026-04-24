import { Injectable, inject } from '@angular/core';
import { RdkitService } from './rdkit.service';
import { PubchemService } from '../api/pubchem.service';
import { AppStateStore } from '../store/app-state.store';
import { AtomNode, DiscoveredMolecule } from '../models';

@Injectable({ providedIn: 'root' })
export class MoleculeService {
  readonly #rdkit = inject(RdkitService);
  readonly #pubchem = inject(PubchemService);
  readonly #store = inject(AppStateStore);

  getConnectedGroups(): AtomNode[][] {
    const atoms = [...this.#store.atoms().values()];
    const visited = new Set<string>();
    const groups: AtomNode[][] = [];

    for (const atom of atoms) {
      if (visited.has(atom.id)) continue;
      const group: AtomNode[] = [];
      const queue = [atom.id];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const a = this.#store.atoms().get(id);
        if (!a) continue;
        group.push(a);
        for (const bondId of a.bonds) {
          const bond = this.#store.bonds().get(bondId);
          if (bond) {
            if (!visited.has(bond.atomA)) queue.push(bond.atomA);
            if (!visited.has(bond.atomB)) queue.push(bond.atomB);
          }
        }
      }
      if (group.length > 0) groups.push(group);
    }
    return groups;
  }

  isGroupComplete(group: AtomNode[]): boolean {
    if (group.length < 2) return false;
    const fv = this.#store.freeValences();
    return group.every(a => (fv.get(a.id) ?? 0) === 0);
  }

  async discoverGroup(group: AtomNode[]): Promise<DiscoveredMolecule | null> {
    const ids = new Set(group.map(a => a.id));
    const bonds = [...this.#store.bonds().values()].filter(b => ids.has(b.atomA) && ids.has(b.atomB));

    const smiles = this.#rdkit.getCanonicalSmiles(group, bonds);
    if (!smiles) return null;

    const formula = this.#rdkit.getMolecularFormula(smiles) ?? this.#fallbackFormula(group);
    const weight = this.#rdkit.getMolecularWeight(smiles);

    let pubchem = null;
    let commonName: string | null = null;
    let description: string | null = null;

    try {
      pubchem = await this.#pubchem.lookupBySmiles(smiles);
      if (pubchem?.cid) {
        const desc = await this.#pubchem.getDescription(pubchem.cid);
        commonName = desc?.title ?? null;
        description = desc?.description ?? null;
      }
    } catch { /* network error — treat as exploratory */ }

    return {
      id: crypto.randomUUID(),
      smiles,
      formula,
      molecularWeight: weight,
      iupacName: pubchem?.iupacName ?? null,
      commonName,
      cid: pubchem?.cid ?? null,
      type: pubchem ? 'famous' : 'exploratory',
      discoveredAt: Date.now(),
      description,
      isomerCount: null,
    };
  }

  #fallbackFormula(group: AtomNode[]): string {
    const counts = new Map<string, number>();
    for (const a of group) counts.set(a.element.symbol, (counts.get(a.element.symbol) ?? 0) + 1);
    return [...counts.entries()].map(([s, n]) => `${s}${n > 1 ? n : ''}`).join('');
  }
}
