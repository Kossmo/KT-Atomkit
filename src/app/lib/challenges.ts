import { ChapterDef, DailyChallengeDef } from '../models/challenge';

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'ch1',
    title: 'Essentials',
    icon: '⚗️',
    challenges: [
      {
        id: 'water',
        targetSmiles: 'O',
        targetCid: 962,
        name: 'Water',
        formula: 'H₂O',
        difficulty: 1,
        hints: [
          { label: 'Groups', content: 'Two O–H bonds. Oxygen sits at the center.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'ammonia',
        targetSmiles: 'N',
        targetCid: 222,
        name: 'Ammonia',
        formula: 'NH₃',
        difficulty: 1,
        hints: [
          { label: 'Groups', content: 'Three N–H bonds. Nitrogen at the center.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'methane',
        targetSmiles: 'C',
        targetCid: 297,
        name: 'Methane',
        formula: 'CH₄',
        difficulty: 1,
        hints: [
          { label: 'Groups', content: 'Four C–H bonds. Carbon at the center.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'hf',
        targetSmiles: 'F',
        targetCid: 14917,
        name: 'Hydrogen fluoride',
        formula: 'HF',
        difficulty: 1,
        hints: [
          { label: 'Groups', content: 'A single F–H bond. Fluorine is the most electronegative element.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'co2',
        targetSmiles: 'O=C=O',
        targetCid: 280,
        name: 'Carbon dioxide',
        formula: 'CO₂',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'Two C=O double bonds. Linear molecule.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'h2o2',
        targetSmiles: 'OO',
        targetCid: 784,
        name: 'Hydrogen peroxide',
        formula: 'H₂O₂',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'Two oxygen atoms bonded together, each carrying one –H.' },
          { label: 'Structure', content: 'img' },
        ],
      },
    ],
  },
  {
    id: 'ch2',
    title: 'Hydrocarbons',
    icon: '🔗',
    challenges: [
      {
        id: 'ethane',
        targetSmiles: 'CC',
        targetCid: 6324,
        name: 'Ethane',
        formula: 'C₂H₆',
        difficulty: 1,
        hints: [
          { label: 'Groups', content: 'Two –CH₃ groups joined by a single C–C bond.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'ethylene',
        targetSmiles: 'C=C',
        targetCid: 6325,
        name: 'Ethylene',
        formula: 'C₂H₄',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'One C=C double bond with two H on each carbon.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'acetylene',
        targetSmiles: 'C#C',
        targetCid: 6326,
        name: 'Acetylene',
        formula: 'C₂H₂',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'One C≡C triple bond with one H on each carbon.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'propane',
        targetSmiles: 'CCC',
        targetCid: 6334,
        name: 'Propane',
        formula: 'C₃H₈',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'Three carbons in a chain: CH₃–CH₂–CH₃.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'butane',
        targetSmiles: 'CCCC',
        targetCid: 7843,
        name: 'Butane',
        formula: 'C₄H₁₀',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'Four carbons in a straight chain: CH₃–CH₂–CH₂–CH₃.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'isobutane',
        targetSmiles: 'CC(C)C',
        targetCid: 6360,
        name: 'Isobutane',
        formula: 'C₄H₁₀',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'A central –CH– bonded to three –CH₃ groups.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'cyclopropane',
        targetSmiles: 'C1CC1',
        targetCid: 6378,
        name: 'Cyclopropane',
        formula: 'C₃H₆',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'Three carbons connected in a triangle ring.' },
          { label: 'Structure', content: 'img' },
        ],
      },
    ],
  },
  {
    id: 'ch3',
    title: 'Alcohols',
    icon: '🍷',
    challenges: [
      {
        id: 'methanol',
        targetSmiles: 'CO',
        targetCid: 887,
        name: 'Methanol',
        formula: 'CH₄O',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'One –CH₃ group and one –OH group.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'ethanol',
        targetSmiles: 'CCO',
        targetCid: 702,
        name: 'Ethanol',
        formula: 'C₂H₆O',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'Ethyl group (C–C) with a terminal –OH.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'propanol',
        targetSmiles: 'CCCO',
        targetCid: 1031,
        name: '1-Propanol',
        formula: 'C₃H₈O',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'Three-carbon chain with a terminal –OH.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'isopropanol',
        targetSmiles: 'CC(C)O',
        targetCid: 3776,
        name: 'Isopropanol',
        formula: 'C₃H₈O',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'A central carbon bonded to two –CH₃ groups and one –OH.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'phenol',
        targetSmiles: 'Oc1ccccc1',
        targetCid: 996,
        name: 'Phenol',
        formula: 'C₆H₆O',
        difficulty: 4,
        hints: [
          { label: 'Groups', content: 'A benzene ring with one –OH group attached.' },
          { label: 'Structure', content: 'img' },
        ],
      },
    ],
  },
  {
    id: 'ch4',
    title: 'Acids',
    icon: '🧪',
    challenges: [
      {
        id: 'formic-acid',
        targetSmiles: 'OC=O',
        targetCid: 284,
        name: 'Formic acid',
        formula: 'CH₂O₂',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'One –COOH group with a H attached to the carbon.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'acetic-acid',
        targetSmiles: 'CC(=O)O',
        targetCid: 176,
        name: 'Acetic acid',
        formula: 'C₂H₄O₂',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'A –CH₃ group bonded to a –COOH group.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'oxalic-acid',
        targetSmiles: 'OC(=O)C(=O)O',
        targetCid: 971,
        name: 'Oxalic acid',
        formula: 'C₂H₂O₄',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'Two –COOH groups bonded directly to each other.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'propionic-acid',
        targetSmiles: 'CCC(=O)O',
        targetCid: 1032,
        name: 'Propionic acid',
        formula: 'C₃H₆O₂',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'A two-carbon chain (CH₃–CH₂–) with a terminal –COOH.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'lactic-acid',
        targetSmiles: 'CC(O)C(=O)O',
        targetCid: 107689,
        name: 'Lactic acid',
        formula: 'C₃H₆O₃',
        difficulty: 4,
        hints: [
          { label: 'Groups', content: 'A –COOH group, one –OH group, and a –CH₃. Three carbons total.' },
          { label: 'Structure', content: 'img' },
        ],
      },
    ],
  },
  {
    id: 'ch5',
    title: 'Carbonyl Compounds',
    icon: '🔥',
    challenges: [
      {
        id: 'formaldehyde',
        targetSmiles: 'C=O',
        targetCid: 712,
        name: 'Formaldehyde',
        formula: 'CH₂O',
        difficulty: 1,
        hints: [
          { label: 'Groups', content: 'A single C=O double bond with two H on the carbon.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'acetaldehyde',
        targetSmiles: 'CC=O',
        targetCid: 177,
        name: 'Acetaldehyde',
        formula: 'C₂H₄O',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'A –CH₃ group attached to a –CHO aldehyde group.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'acetone',
        targetSmiles: 'CC(C)=O',
        targetCid: 180,
        name: 'Acetone',
        formula: 'C₃H₆O',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'A central carbon double-bonded to O and flanked by two –CH₃ groups.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'butanone',
        targetSmiles: 'CCC(C)=O',
        targetCid: 6569,
        name: 'Butanone',
        formula: 'C₄H₈O',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'Ketone C=O flanked by a –CH₃ and an –CH₂CH₃ chain.' },
          { label: 'Structure', content: 'img' },
        ],
      },
    ],
  },
  {
    id: 'ch6',
    title: 'Ethers & Esters',
    icon: '🏺',
    challenges: [
      {
        id: 'dimethyl-ether',
        targetSmiles: 'COC',
        targetCid: 8254,
        name: 'Dimethyl ether',
        formula: 'C₂H₆O',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'An oxygen atom bridging two –CH₃ groups: CH₃–O–CH₃.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'methyl-formate',
        targetSmiles: 'COC=O',
        targetCid: 7865,
        name: 'Methyl formate',
        formula: 'C₂H₄O₂',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'An ester: –CH₃ bonded to O, then a –CHO at the end.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'diethyl-ether',
        targetSmiles: 'CCOCC',
        targetCid: 3283,
        name: 'Diethyl ether',
        formula: 'C₄H₁₀O',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'An oxygen bridging two ethyl groups: C₂H₅–O–C₂H₅.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'ethyl-acetate',
        targetSmiles: 'CCOC(C)=O',
        targetCid: 8857,
        name: 'Ethyl acetate',
        formula: 'C₄H₈O₂',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'An ethyl group (–CH₂CH₃) bonded to the ester oxygen, and a –CH₃ on the carbonyl.' },
          { label: 'Structure', content: 'img' },
        ],
      },
    ],
  },
  {
    id: 'ch7',
    title: 'Nitrogen Compounds',
    icon: '🔷',
    challenges: [
      {
        id: 'methylamine',
        targetSmiles: 'CN',
        targetCid: 6329,
        name: 'Methylamine',
        formula: 'CH₅N',
        difficulty: 1,
        hints: [
          { label: 'Groups', content: 'A –CH₃ group bonded to –NH₂.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'dimethylamine',
        targetSmiles: 'CNC',
        targetCid: 674,
        name: 'Dimethylamine',
        formula: 'C₂H₇N',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'Nitrogen bonded to two –CH₃ groups and one –H.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'urea',
        targetSmiles: 'NC(N)=O',
        targetCid: 1176,
        name: 'Urea',
        formula: 'CH₄N₂O',
        difficulty: 2,
        hints: [
          { label: 'Groups', content: 'A C=O double bond with two –NH₂ groups on the carbon.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'glycine',
        targetSmiles: 'NCC(=O)O',
        targetCid: 750,
        name: 'Glycine',
        formula: 'C₂H₅NO₂',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'An –NH₂ group, a –CH₂–, and a –COOH. The simplest amino acid.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'aniline',
        targetSmiles: 'Nc1ccccc1',
        targetCid: 6115,
        name: 'Aniline',
        formula: 'C₆H₇N',
        difficulty: 4,
        hints: [
          { label: 'Groups', content: 'A benzene ring with an –NH₂ group directly attached.' },
          { label: 'Structure', content: 'img' },
        ],
      },
    ],
  },
  {
    id: 'ch8',
    title: 'Boss Molecules',
    icon: '☠️',
    challenges: [
      {
        id: 'benzene',
        targetSmiles: 'c1ccccc1',
        targetCid: 241,
        name: 'Benzene',
        formula: 'C₆H₆',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'Six carbons in a ring with alternating single and double bonds.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'toluene',
        targetSmiles: 'Cc1ccccc1',
        targetCid: 1140,
        name: 'Toluene',
        formula: 'C₇H₈',
        difficulty: 3,
        hints: [
          { label: 'Groups', content: 'A benzene ring with a single –CH₃ group attached.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'paracetamol',
        targetSmiles: 'CC(=O)Nc1ccc(O)cc1',
        targetCid: 1983,
        name: 'Paracetamol',
        formula: 'C₈H₉NO₂',
        difficulty: 4,
        hints: [
          { label: 'Groups', content: 'Benzene ring with an –OH at para position and an amide (N–C=O) on the other side.' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'aspirin',
        targetSmiles: 'CC(=O)Oc1ccccc1C(=O)O',
        targetCid: 2244,
        name: 'Aspirin',
        formula: 'C₉H₈O₄',
        difficulty: 5,
        hints: [
          { label: 'Groups', content: 'Benzene ring with a –COOH and an acetyl ester (–OC(=O)CH₃).' },
          { label: 'Structure', content: 'img' },
        ],
      },
      {
        id: 'caffeine',
        targetSmiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C',
        targetCid: 2519,
        name: 'Caffeine',
        formula: 'C₈H₁₀N₄O₂',
        difficulty: 5,
        hints: [
          { label: 'Groups', content: 'Fused 5- and 6-membered rings with 4 nitrogen atoms, 2 C=O, and 3 N-methyl groups.' },
          { label: 'Structure', content: 'img' },
        ],
      },
    ],
  },
];

export const DAILY_CHALLENGES: DailyChallengeDef[] = [
  { theme: 'Simple Hydrides', description: 'Build a molecule made only of hydrogen and one other element.', constraints: [{ smarts: '[!#6;!#1][H]', label: 'non-carbon atom bonded to H' }], difficulty: 1 },
  { theme: 'Alcohols', description: 'Build any molecule containing an O–H group.', constraints: [{ smarts: '[OH]', label: 'O–H group' }], difficulty: 1 },
  { theme: 'Amines', description: 'Build any molecule with a nitrogen–hydrogen bond.', constraints: [{ smarts: '[NH]', label: 'N–H bond' }], difficulty: 1 },
  { theme: 'Alkanes', description: 'Build a saturated hydrocarbon (carbons and hydrogens only, no double bonds).', constraints: [{ smarts: '[CX4]', label: 'sp3 carbon' }, { smarts: '[CH3,CH2,CH]', label: 'alkyl group' }], difficulty: 1 },
  { theme: 'Carbonyl Compounds', description: 'Build any molecule with a C=O double bond.', constraints: [{ smarts: '[#6]=[#8]', label: 'C=O bond' }], difficulty: 2 },
  { theme: 'Carboxylic Acids', description: 'Build any molecule with a –COOH group.', constraints: [{ smarts: '[CX3](=[OX1])[OX2H1]', label: '–COOH group' }], difficulty: 2 },
  { theme: 'Alkenes', description: 'Build a molecule with at least one C=C double bond.', constraints: [{ smarts: 'C=C', label: 'C=C double bond' }], difficulty: 2 },
  { theme: 'Alkynes', description: 'Build a molecule with a C≡C triple bond.', constraints: [{ smarts: 'C#C', label: 'C≡C triple bond' }], difficulty: 2 },
  { theme: 'Nitriles', description: 'Build a molecule with a C≡N triple bond.', constraints: [{ smarts: 'C#N', label: 'C≡N triple bond' }], difficulty: 2 },
  { theme: 'Thiols', description: 'Build any molecule with an S–H group.', constraints: [{ smarts: '[SH]', label: 'S–H group' }], difficulty: 2 },
  { theme: 'Amino Alcohols', description: 'Build a molecule containing both an –OH and an –NH₂ group.', constraints: [{ smarts: '[OH]', label: 'O–H group' }, { smarts: '[NH2]', label: 'N–H₂ group' }], difficulty: 3 },
  { theme: 'Hydroxy Acids', description: 'Build a molecule with both a –COOH and an –OH group.', constraints: [{ smarts: '[CX3](=[OX1])[OX2H1]', label: '–COOH' }, { smarts: '[OX2H1][CX4]', label: 'alcohol –OH' }], difficulty: 3 },
  { theme: 'Sulfur Compounds', description: 'Build any molecule containing sulfur.', constraints: [{ smarts: '[#16]', label: 'sulfur atom' }], difficulty: 2 },
  { theme: 'Aromatic Rings', description: 'Build any molecule containing an aromatic ring.', constraints: [{ smarts: 'c1ccccc1', label: 'benzene ring' }], difficulty: 4 },
  { theme: 'Carbon Chains', description: 'Build a molecule with at least 3 carbons in a chain.', constraints: [{ smarts: '[CH3][CH2][CH3,CH2,CH]', label: 'C–C–C chain' }], difficulty: 2 },
  { theme: 'Esters', description: 'Build a molecule with an ester linkage (C(=O)O–C).', constraints: [{ smarts: '[CX3](=[OX1])[OX2][CX4]', label: 'ester group' }], difficulty: 4 },
  { theme: 'Amides', description: 'Build a molecule with a C(=O)–N amide bond.', constraints: [{ smarts: '[CX3](=[OX1])[NX3]', label: 'amide bond' }], difficulty: 4 },
  { theme: 'Diols', description: 'Build a molecule with two –OH groups.', constraints: [{ smarts: '[OH].[OH]', label: 'two O–H groups' }], difficulty: 3 },
  { theme: 'Nitrogen Heterocycles', description: 'Build a molecule with nitrogen in a ring.', constraints: [{ smarts: '[nX2]', label: 'aromatic N in ring' }], difficulty: 5 },
  { theme: 'Unsaturated Acids', description: 'Build a molecule with both a C=C and a –COOH.', constraints: [{ smarts: 'C=C', label: 'C=C bond' }, { smarts: '[CX3](=[OX1])[OX2H1]', label: '–COOH group' }], difficulty: 4 },
  { theme: 'Methyl Groups', description: 'Build a molecule with two –CH₃ groups.', constraints: [{ smarts: '[CH3][CH3,CH2,CH,C]', label: 'two methyl groups' }], difficulty: 2 },
  { theme: 'Aldehydes', description: 'Build a molecule with an aldehyde (HC=O) group.', constraints: [{ smarts: '[CX3H1](=[OX1])', label: '–CHO group' }], difficulty: 3 },
  { theme: 'Phenols', description: 'Build a molecule with an –OH directly on an aromatic ring.', constraints: [{ smarts: '[OX2H1]c', label: '–OH on aromatic' }], difficulty: 4 },
  { theme: 'Disulfides', description: 'Build a molecule containing an S–S bond.', constraints: [{ smarts: '[#16][#16]', label: 'S–S bond' }], difficulty: 3 },
  { theme: 'Cyclic Molecules', description: 'Build any cyclic molecule (ring structure).', constraints: [{ smarts: '[R]', label: 'ring atom' }], difficulty: 3 },
  { theme: 'Organic Oxides', description: 'Build a molecule containing C and O (no N, S, or halogens).', constraints: [{ smarts: '[#6][#8]', label: 'C–O bond' }], difficulty: 2 },
  { theme: 'Triple Bond Molecules', description: 'Build any molecule with a triple bond.', constraints: [{ smarts: '[*]#[*]', label: 'triple bond' }], difficulty: 2 },
  { theme: 'Secondary Amines', description: 'Build a molecule with a secondary amine (N bonded to 2 carbons).', constraints: [{ smarts: '[NX3H1](C)C', label: 'N with 2 carbons and 1 H' }], difficulty: 3 },
  { theme: 'Branched Hydrocarbons', description: 'Build a branched carbon compound (a carbon bonded to 3+ carbons).', constraints: [{ smarts: '[CX4](C)(C)C', label: 'branching carbon' }], difficulty: 3 },
  { theme: 'Mixed Heteroatoms', description: 'Build a molecule containing both N and O.', constraints: [{ smarts: '[#7]', label: 'nitrogen atom' }, { smarts: '[#8]', label: 'oxygen atom' }], difficulty: 2 },
];

export function getDailyChallenge(): DailyChallengeDef {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return DAILY_CHALLENGES[dayIndex % DAILY_CHALLENGES.length];
}

export function findChallengeById(id: string): import('../models/challenge').ChallengeDef | null {
  for (const chapter of CHAPTERS) {
    const found = chapter.challenges.find(c => c.id === id);
    if (found) return found;
  }
  return null;
}

export function isDailyCompleted(completedDate: string | null): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return completedDate === today;
}
