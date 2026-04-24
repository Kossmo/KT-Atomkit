export interface ElementData {
  atomicNumber: number;
  symbol: string;
  name: string;
  cpkColor: string;
  valences: number[];
  covalentRadius: number;
  atomicMass: number;
  electronegativity: number | null;
  category: ElementCategory;
}

export type ElementCategory =
  | 'nonmetal'
  | 'noble-gas'
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'metalloid'
  | 'halogen'
  | 'post-transition-metal'
  | 'transition-metal'
  | 'lanthanide'
  | 'actinide'
  | 'unknown';

export type BondType = 'single' | 'double' | 'triple';

export interface AtomNode {
  id: string;
  element: ElementData;
  x: number;
  y: number;
  vx: number;
  vy: number;
  usedValences: number;
  bonds: string[];
}

export interface Bond {
  id: string;
  atomA: string;
  atomB: string;
  type: BondType;
  order: number;
}

export interface DiscoveredMolecule {
  id: string;
  smiles: string;
  formula: string;
  molecularWeight: number | null;
  iupacName: string | null;
  commonName: string | null;
  cid: number | null;
  type: 'famous' | 'exploratory';
  discoveredAt: number;
  description: string | null;
  isomerCount: number | null;
}

export type AppMode = 'real' | 'exploratory';

export interface FragmentAtom { symbol: string; dx: number; dy: number; }
export interface FragmentBond { from: number; to: number; type: BondType; }
export interface FragmentDef {
  id: string;
  label: string;
  description: string;
  anchorColor: string;
  /** null = always unlocked; SMARTS pattern = substructure that must be present in any collected molecule */
  unlockedBySmarts: string | null;
  /** Human-readable hint shown in tooltip when locked */
  unlockedByHint: string;
  atoms: FragmentAtom[];
  bonds: FragmentBond[];
}
