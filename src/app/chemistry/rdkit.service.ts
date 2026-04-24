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
    if (atoms.length === 1) return atoms[0].element.symbol;

    const adjacency = new Map<string, string[]>();
    for (const atom of atoms) adjacency.set(atom.id, []);
    for (const bond of bonds) {
      adjacency.get(bond.atomA)?.push(bond.atomB);
      adjacency.get(bond.atomB)?.push(bond.atomA);
    }

    const visited = new Set<string>();

    const dfs = (atomId: string, parentId: string | null): string => {
      visited.add(atomId);
      const atom = atoms.find(a => a.id === atomId)!;
      const neighbors = (adjacency.get(atomId) ?? []).filter(n => !visited.has(n));
      const bond = parentId ? bonds.find(b =>
        (b.atomA === atomId && b.atomB === parentId) ||
        (b.atomB === atomId && b.atomA === parentId)
      ) : null;

      const bondChar = bond?.type === 'double' ? '=' : bond?.type === 'triple' ? '#' : '';
      // All atoms in brackets = no implicit H added by RDKit (we specify bonds explicitly)
      let smi = bondChar + '[' + atom.element.symbol + ']';

      if (neighbors.length === 0) return smi;
      const [first, ...rest] = neighbors;
      // Branches before main-chain continuation — otherwise "OH(H)" instead of "O(H)H"
      for (const n of rest) smi += `(${dfs(n, atomId)})`;
      smi += dfs(first, atomId);
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
