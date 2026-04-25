import { Injectable, signal } from '@angular/core';
import { AtomNode, Bond } from '../models';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initRDKitModule: (opts?: any) => Promise<any>;
  }
}

@Injectable({ providedIn: 'root' })
export class RdkitService {
  readonly isReady = signal(false);
  readonly loadProgress = signal(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #rdkit: any = null;

  async load(): Promise<void> {
    if (this.#rdkit) return;
    await this.#injectScript('/rdkit/RDKit_minimal.js');
    this.loadProgress.set(50);

    this.#rdkit = await window.initRDKitModule({
      locateFile: () => '/rdkit/RDKit_minimal.wasm',
    });
    this.loadProgress.set(100);
    this.isReady.set(true);
  }

  getCanonicalSmiles(atoms: AtomNode[], bonds: Bond[]): string | null {
    if (!this.#rdkit) return null;
    try {
      const smiles = this.#buildSmiles(atoms, bonds);
      if (!smiles) return null;
      const mol = this.#rdkit.get_mol(smiles);
      if (!mol || !mol.is_valid()) return null;
      const canonical = mol.get_smiles();
      mol.delete();
      return canonical;
    } catch {
      return null;
    }
  }

  isValidMolecule(smiles: string): boolean {
    if (!this.#rdkit) return false;
    try {
      const mol = this.#rdkit.get_mol(smiles);
      const valid = mol?.is_valid() ?? false;
      mol?.delete();
      return valid;
    } catch {
      return false;
    }
  }

  getMolecularFormula(smiles: string): string | null {
    if (!this.#rdkit) return null;
    try {
      const mol = this.#rdkit.get_mol(smiles);
      if (!mol?.is_valid()) return null;
      const desc = JSON.parse(mol.get_descriptors());
      mol.delete();
      return desc.MolecularFormula ?? null;
    } catch {
      return null;
    }
  }

  getMolecularWeight(smiles: string): number | null {
    if (!this.#rdkit) return null;
    try {
      const mol = this.#rdkit.get_mol(smiles);
      if (!mol?.is_valid()) return null;
      const desc = JSON.parse(mol.get_descriptors());
      mol.delete();
      return desc.MolWt ?? null;
    } catch {
      return null;
    }
  }

  hasSubstructure(molSmiles: string, smarts: string): boolean {
    if (!this.#rdkit) return false;
    try {
      const mol = this.#rdkit.get_mol(molSmiles);
      if (!mol?.is_valid()) { mol?.delete(); return false; }
      const query = this.#rdkit.get_qmol(smarts);
      if (!query?.is_valid()) { mol.delete(); query?.delete(); return false; }
      const match = mol.get_substruct_match(query);
      mol.delete();
      query.delete();
      return match !== '{}';
    } catch {
      return false;
    }
  }

  #buildSmiles(atoms: AtomNode[], bonds: Bond[]): string {
    if (atoms.length === 0) return '';
    if (atoms.length === 1) return `[${atoms[0].element.symbol}]`;

    type AdjEntry = { neighbor: string; bond: Bond };
    const adj = new Map<string, AdjEntry[]>();
    for (const atom of atoms) adj.set(atom.id, []);
    for (const bond of bonds) {
      adj.get(bond.atomA)?.push({ neighbor: bond.atomB, bond });
      adj.get(bond.atomB)?.push({ neighbor: bond.atomA, bond });
    }

    // Pre-pass: detect ring-closure back-edges, assign ring closure numbers.
    // For each back-edge (descendant → ancestor), put bond char at the ancestor
    // (opening digit) so the ring closure bond type is encoded there.
    const backEdgeIds = new Set<string>();
    const ringOpens = new Map<string, { num: number; bondChar: string }[]>();
    let ringCounter = 0;
    const preVisited = new Set<string>();
    const inStack = new Set<string>();

    const findRings = (id: string, parentId: string | null) => {
      preVisited.add(id);
      inStack.add(id);
      for (const { neighbor, bond } of adj.get(id) ?? []) {
        if (neighbor === parentId) continue;
        if (inStack.has(neighbor) && !backEdgeIds.has(bond.id)) {
          backEdgeIds.add(bond.id);
          ringCounter++;
          const bc = bond.type === 'double' ? '=' : bond.type === 'triple' ? '#' : '';
          if (!ringOpens.has(neighbor)) ringOpens.set(neighbor, []);
          if (!ringOpens.has(id)) ringOpens.set(id, []);
          ringOpens.get(neighbor)!.push({ num: ringCounter, bondChar: bc });
          ringOpens.get(id)!.push({ num: ringCounter, bondChar: '' });
        } else if (!preVisited.has(neighbor)) {
          findRings(neighbor, id);
        }
      }
      inStack.delete(id);
    };

    findRings(atoms[0].id, null);

    // Lookup maps to avoid repeated linear scans in the DFS
    const atomById = new Map(atoms.map(a => [a.id, a]));
    const bondByPair = new Map<string, Bond>();
    for (const bond of bonds) {
      bondByPair.set(`${bond.atomA}|${bond.atomB}`, bond);
      bondByPair.set(`${bond.atomB}|${bond.atomA}`, bond);
    }

    // Main DFS: build SMILES string, skipping back-edges (already encoded as ring closures)
    const visited = new Set<string>();
    const dfs = (id: string, parentId: string | null): string => {
      visited.add(id);
      const atom = atomById.get(id)!;
      const parentBond = parentId ? bondByPair.get(`${id}|${parentId}`) : null;
      const bondChar = parentBond?.type === 'double' ? '=' : parentBond?.type === 'triple' ? '#' : '';
      const closureSuffix = (ringOpens.get(id) ?? [])
        .map(c => c.bondChar + (c.num > 9 ? `%${c.num}` : `${c.num}`))
        .join('');

      // All atoms in brackets = no implicit H added by RDKit (we specify bonds explicitly)
      let smi = bondChar + '[' + atom.element.symbol + ']' + closureSuffix;
      // Branches before main-chain continuation — otherwise "OH(H)" instead of "O(H)H"
      const unvisited = (adj.get(id) ?? [])
        .filter(({ neighbor, bond }) => !visited.has(neighbor) && !backEdgeIds.has(bond.id));
      if (!unvisited.length) return smi;
      const [first, ...rest] = unvisited;
      for (const { neighbor } of rest) smi += `(${dfs(neighbor, id)})`;
      smi += dfs(first.neighbor, id);
      return smi;
    };

    return dfs(atoms[0].id, null);
  }

  #injectScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}
