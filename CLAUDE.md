# Projet : Atomkit

*(Bac à sable de chimie 2D)*

## Concept
Expérience web où l'utilisateur assemble librement des atomes dans un espace 2D. Les atomes ont une "affinité" et se lient automatiquement quand ils sont compatibles, comme un moteur physique chimique. Chaque molécule construite est validée par RDKit (plausibilité chimique) et enrichie par PubChem (si elle existe vraiment : nom, propriétés, usages, histoire). L'objectif est de rendre la chimie **tangible, ludique et juste** — un bac à sable grand public où l'on découvre la matière en jouant, sans objectifs imposés.

## Intention et ton
- **Bac à sable libre**, pas un jeu à objectifs — les défis sont optionnels et non bloquants
- **Grand public**, aucun prérequis en chimie
- **Pédagogiquement juste** : ce qu'on affiche est vrai, pas simplifié jusqu'à la fausseté
- Esthétique : minimaliste, contemplative, le focus est la beauté des structures moléculaires

## Stack technique
- **Build** : Angular CLI (esbuild)
- **Framework** : Angular 21 (standalone components, signals, OnPush)
- **Workspace** : SVG 2D (atomes = cercles CPK, liaisons = lignes, drag uniquement — fond fixe)
- **Prévisualisation molécule** : Three.js (modal 3D pour les molécules découvertes, lazy-loadé via `@defer`)
- **Physique** : moteur force-directed 2D custom (`WorkspaceService`) — pas de cannon-es
- **Validation chimique** : `@rdkit/rdkit` (WebAssembly, ~10 MB, lazy-load via script tag)
- **API chimie** : PubChem REST (`https://pubchem.ncbi.nlm.nih.gov/rest/pug/`)
- **API enrichissement** : Wikipedia REST (`https://en.wikipedia.org/api/rest_v1/page/summary/`)
- **Audio** : Web Audio API native (pas de Tone.js pour le moment)
- **Persistence** : LocalStorage (collection + préférences + cache Wikipedia + progression défis)
- **Pas de backend** — 100% statique.

## Layout
- **Side panel gauche** (260px) : visible uniquement en vue Lab — palette de fragments débloquables + liste scrollable des 118 éléments groupés par catégorie (accordéon, noble gaz en dernier, seul Nonmetals ouvert par défaut)
- **Playground central** : workspace SVG 2D plein écran, fond fixe (pas de pan/zoom), seuls les atomes sont draggables
- **Navigation flottante** : pill glassmorphism centré en haut de la page — `Lab | Challenges | Collection`
- **Vue Challenges** : liste des chapitres + banner défi du jour (side panel masqué)
- **Vue Collection** : grille de cards plein écran (side panel masqué)

## Mécaniques centrales

### Navigation principale
- Signal `mainView: 'workspace' | 'challenges' | 'collection'` dans `LabComponent`
- **Lab** : workspace SVG + side panel éléments visible
- **Challenges** : liste des chapitres et défi quotidien
- **Collection** : grille de cards plein écran
- Le workspace reste toujours monté (`[class.hidden]`) pour préserver l'état des atomes

### Workspace 2D (SVG)
- Fond sombre (#0d0d0f), minimaliste, **fixe** — pas de pan ni de zoom
- Plusieurs molécules peuvent coexister dans l'espace
- Conversion screen → SVG via `svg.getScreenCTM().inverse()` (précis, gère le viewBox)
- ViewBox statique `'-600 -400 1200 800'` (constante, plus un signal)

### Palette d'atomes
- **Tous les 118 éléments** disponibles dès le début
- Panel latéral en liste scrollable, groupée par catégorie avec **accordéon** (clic header → expand/collapse)
- Ordre des catégories : Nonmetals en premier, Noble Gases en dernier (peu utiles pour la chimie)
- **Par défaut** : seuls les Nonmetals sont ouverts, toutes les autres catégories sont fermées
- Animation accordéon via CSS grid : `grid-template-rows: 0fr → 1fr`, chevron tourne à 0°/−90°
- Barre de recherche (symbole, nom, numéro atomique) — résultats triés : **symboles en priorité** avant les noms
- Chaque élément affiche son badge de valence (nombre de liaisons) entre le nom et le numéro atomique
- Clic sur un élément → spawn au centre du workspace
- Couleurs **CPK standard** avec ajustements : H = `#FFFFFF` (blanc pur), C = `#3C3C3C` (charbon foncé) pour les différencier sur fond sombre
- **Labels des atomes** : couleur calculée dynamiquement via luminance CPK — texte noir si la couleur est claire, blanc si sombre (`labelColor()` dans `WorkspaceComponent`)

### Fragments pré-faits débloquables
- Grille **3×4** (12 fragments) dans la palette, au-dessus de la liste des éléments
- Déverrouillage par **SMARTS substructure matching** sur la collection (pas par CID) : `rdkit.hasSubstructure(smiles, smarts)`
- Fragments verrouillés : toujours visibles, label `?` (opacity 0.28, bordure pointillée)
- **Bouton œil** dans le header : révèle temporairement les vrais labels des fragments verrouillés
- Compteur `N/12` dans le header de la palette
- `fragmentStates` = `computed()` réactif à `rdkit.isReady()` et `store.collection()`
- `spawnFragment(def)` dans `WorkspaceService` : crée les atomes + liaisons en une passe (`silent = true`)
- Benzène spawne avec structure Kekulé, circumradius = BOND_DIST = 52 px
- Fragments : `-OH`, `-CH₃`, `-NH₂`, `C=O`, `-COOH`, `C₆H₆`, `-SH`, `-CH₂-`, `-NH-`, `C=C`, `C≡C`, `-C≡N`

### Construction par affinité physique 2D
- Quand deux atomes compatibles sont suffisamment proches (< BOND_DIST), une liaison se crée automatiquement
- Compatibilité = valences disponibles des deux atomes
- **Pas de force d'attraction inter-atomique** — seul le spring des liaisons existantes et la répulsion courte portée existent
- **Cooldown après séparation** (`BOND_COOLDOWN_MS = 1200`) : quand une liaison est rompue, les deux atomes ne peuvent pas se re-lier pendant 1,2 s. La rupture applique aussi une impulsion de séparation (`BREAK_IMPULSE = 4`)
- Liaisons multiples (N lignes parallèles) : offset `(i - (N-1)/2) × spacing` — générique, supporte au-delà du triple
- Clic sur une liaison → suppression
- **Double-clic sur un atome → suppression** (via `onAtomDblClick`)
- Sélection d'un atome + Delete → suppression

### Deux modes de validation (togglables)
- **Mode réel** (strict) : seules les molécules présentes dans PubChem sont "acceptées". Pédagogique.
- **Mode exploratoire** (permissif) : toute molécule chimiquement plausible selon les valences est acceptée. Créatif.

### Hydrogènes
- **Toggle visible/invisible**
- Auto-complétion par défaut via RDKit

### Découverte et fiches
- **Scan automatique** : `effect()` dans `LabComponent` observe `store.bonds()` et `store.mode()`, déclenche `scanMolecules()` avec un debounce de 1,2 s — pas de bouton Scan manuel
- À chaque scan :
  1. **Détection des défis** (passive, tous les challenges, indépendamment d'un challenge actif) — voir section Défis
  2. **Découverte collection** : RDKit → PubChem → ajout si nouvelle molécule
  - Molécule "célèbre" : fiche riche (nom, IUPAC, formule, poids moléculaire, usages)
  - Molécule "exploratoire" : fiche minimale (formule, SMILES)
- Après ajout : `#fetchIsomerCount` fire-and-forget, wrappé dans `NgZone.run()`
- **Stack de notifications** (`MoleculeCardComponent`) : jusqu'à 5 toasts empilées `bottom: 72px; right: 20px`, 240px, `z-index: 200`
  - Container `position: fixed; display: flex; flex-direction: column-reverse; gap: 8px` — premier élément DOM = position visuelle basse
  - Toutes les cartes affichent badge + nom + formule ; seule la carte active (i=0, en bas) a le bouton close et le footer "View in collection →"
  - Dégradé d'opacité bas→haut : `1.0 → 0.82 → 0.65 → 0.50 → 0.38`
  - Bouton **"Clear all (N)"** : premier dans le DOM (donc visuellement en dessous de toutes les toasts), visible dès 2+ notifications en attente — appelle `store.clearDiscoveries()`
  - `z-index: 200` obligatoire : `.lab-layout` a `position: relative; overflow: hidden` ce qui crée un stacking context qui peindrait par-dessus le container sans z-index explicite

### Mode Défis
- **Tab "Challenges"** dans la navigation principale (3ème onglet)
- **8 chapitres** progressifs, chacun déverrouillé quand le précédent est complété à 100% :
  | # | Titre | Molécules |
  |---|-------|-----------|
  | 1 | ⚗️ Essentials | H₂O, NH₃, CH₄, HF, CO₂, H₂O₂ |
  | 2 | 🔗 Hydrocarbons | Ethane, Ethylene, Acetylene, Propane, Butane, Isobutane, Cyclopropane |
  | 3 | 🍷 Alcohols | Methanol, Ethanol, 1-Propanol, Isopropanol, Phenol |
  | 4 | 🧪 Acids | Formic, Acetic, Oxalic, Propionic, Lactic |
  | 5 | 🔥 Carbonyl Compounds | Formaldehyde, Acetaldehyde, Acetone, Butanone |
  | 6 | 🏺 Ethers & Esters | Dimethyl ether, Methyl formate, Diethyl ether, Ethyl acetate |
  | 7 | 🔷 Nitrogen Compounds | Methylamine, Dimethylamine, Urea, Glycine, Aniline |
  | 8 | ☠️ Boss Molecules | Benzene, Toluene, Paracetamol, Aspirin, Caffeine |
- **38 challenges** au total, chacun avec : `targetSmiles`, `targetCid`, `formula`, `difficulty` (1–5 étoiles), 2 hints progressifs (texte groupes fonctionnels + image 2D PubChem)
- **Défi quotidien** : 30 entrées en rotation (index par `dayOfYear % 30`), validé par contraintes SMARTS via `rdkit.hasSubstructure()`
- **Détection passive** : `scanMolecules()` vérifie TOUS les challenges à chaque scan, que l'utilisateur en ait sélectionné un ou non. Si match → `store.completeChallenge(id)`. La fanfare + barre de succès n'apparaissent que si le challenge détecté est celui actif
- **Overlay `ChallengePlayerComponent`** : flottant sous la nav pill, visible uniquement en vue `workspace`, affiché si `activeChallengeId() || activeDailyMode()`
  - Barre active : nom du challenge, formule ou contraintes, boutons hints
  - État succès : bordure verte, 🎉, bouton "Back to Challenges"
  - Hints : état **éphémère** (signal local, réinitialisé à chaque changement de challenge, non persisté). `hintsOpen` est un `model()` two-way bindé depuis `LabComponent` : **clic dans le workspace ferme le panel hints**, clic sur un bouton hint déjà utilisé le réouvre
- **Page Challenges** : s'ouvre automatiquement sur le **dernier chapitre débloqué** au montage du composant (`ngOnInit` + `chapterStates().reverse().find(ch => ch.unlocked)`)
- Progression persistée en LocalStorage : `completedChallengeIds[]`, `dailyCompletedDate`

### Collection (vue pleine page)
- **Grille de cards** `repeat(auto-fill, minmax(220px, 1fr))`, max 1100px centré
- Deux onglets : **Famous** et **Novel**
- Chaque card : formule subscriptée, nom commun, poids moléculaire, description tronquée, bordure gauche colorée par famille chimique, badge `3D` si CID disponible
- **Compteur d'isomères** sur chaque card : `N of X known Formula isomers`
- **Stats en header** : famous count · novel count · `X.XXXX% of ~1M formulas` · `X.XXXXX% of ~100M structures`
- **Clic sur une card → `MoleculeDetailComponent`** (overlay modal)
- Familles chimiques : hydrocarbons, organic oxides, nitrogen, halides, noble gases, oxides, sulfur, other

### Fiches enrichies (`MoleculeDetailComponent`)
- Overlay modal avec animation slide-up + backdrop blur
- **Header** : formule (30px, subscript), nom commun, nom IUPAC (si différent), MW, CID, type — bande latérale colorée par famille
- **Section Wikipedia** : chargée à l'ouverture, premier paragraphe + lien "Read on Wikipedia ↗"
- **Section SMILES** : monospace grisé
- **Footer** : bouton "View 3D structure" si CID disponible
- Fermeture : clic backdrop ou touche Escape

### Prévisualisation 3D
- Modal Three.js (`Molecule3dViewerComponent`), lazy-loadé via `@defer (when …)`
- Données : coordonnées 3D fetched depuis PubChem `/cid/{CID}/JSON?record_type=3d`
- Rendu : sphères CPK + cylindres de liaisons, `OrbitControls` avec damping + auto-rotation
- `ResizeObserver` pour le responsive, cleanup complet `ngOnDestroy`
- Cache LocalStorage des conformers 3D

### Sons (Web Audio API)
- **Apparition d'atome** : pop subtil
- **Liaison créée** : clic cristallin (supprimé en mode `silent` pour les fragments)
- **Découverte célèbre** : accord musical (4 notes ascendantes)
- **Découverte exploratoire** : note unique discrète
- **Succès challenge** : fanfare 5 notes ascendantes (523→659→784→1047→1319 Hz, 70 ms apart)
- Toggle mute global + volume

## Roadmap

### MVP (v1) — terminé ✅
- ✅ Workspace SVG 2D avec pan/zoom
- ✅ Liste 118 éléments avec recherche par catégorie
- ✅ Spawn d'atomes au clic
- ✅ Physique d'affinité 2D + liaisons auto (simple → double → triple)
- ✅ Drag atomes, suppression liaison au clic
- ✅ RDKit-WASM validation + SMILES canonique
- ✅ PubChem lookup sur molécule finalisée
- ✅ Fiche molécule découverte (overlay animé, célèbre / exploratoire)
- ✅ Collection LocalStorage
- ✅ Toggle hydrogènes visibles/invisibles
- ✅ Modes réel / exploratoire

### V2 — terminé ✅
- ✅ Prévisualisation 3D des molécules découvertes (Three.js, modal lazy-loadé)
- ✅ Fragments pré-faits débloquables
- ✅ Navigation Lab / Collection (pills flottantes)
- ✅ Collection redesignée en grille de cards
- ✅ Fiches enrichies : Wikipedia API + PubChem + SMILES + 3D

### V3 — terminé ✅
- ✅ Scan automatique (effect + debounce 1,2 s)
- ✅ Fond fixe — plus de pan/zoom
- ✅ Liaisons N-ième ordre (pas de cap à triple)
- ✅ Accordéon sur le panel périodique
- ✅ Stats collection + compteur d'isomères PubChem

### V4 — terminé ✅
- ✅ Mode défis : 8 chapitres progressifs, 38 challenges, détection passive
- ✅ Défi quotidien par contraintes SMARTS (rotation 30 entrées)
- ✅ Fragments SMARTS-based unlock, 12 fragments en grille 3×4, bouton œil
- ✅ Physique : suppression attraction inter-atomique, cooldown après rupture de liaison
- ✅ Navigation 3 tabs (Lab / Challenges / Collection)
- ✅ Correction SMILES cycliques (ring closure DFS deux passes) — benzène, cyclopropane, hétérocycles
- ✅ Toast de découverte en bas à droite (remplace la popup modale plein écran)
- ✅ Stack de notifications : jusqu'à 5 toasts empilées avec dégradé d'opacité + bouton "Clear all"
- ✅ Hints défis masquables via clic workspace, réouvrables au clic sur le bouton hint
- ✅ Page Challenges auto-ouvre le dernier chapitre débloqué
- ✅ Double-clic atome → suppression
- ✅ Recherche éléments priorise les symboles avant les noms
- ✅ Couleurs H/C ajustées (H blanc pur, C charbon foncé) + labels atomes couleur dynamique par luminance

### V5
- Partage de constructions via URL
- Mode galerie

### V6 — Idées futures
- **Support des radicaux / spin** : certaines molécules (O₂, S₂, NO) ont un état fondamental biradical non représentable en Lewis classique. Permettre aux atomes d'avoir des électrons libres visibles (·), ce qui ouvrirait la construction de formes radicalaires. Implique : modifier le modèle de valence, l'UI (placement d'électrons libres), la génération SMILES radicalaires (`[S]`, `[O]`, `[CH2]`…), et la détection de challenges. Le compteur d'isomères PubChem deviendrait alors exact pour ces cas (actuellement affiché avec `*` + tooltip pour indiquer l'inclusion de radicaux et stéréoisomères).

## Points d'attention techniques

### RDKit-WASM
- **Taille** : ~10 MB — chargé via script tag injection (évite les problèmes esbuild avec `fs`/`crypto`)
- Fichiers copiés dans `public/rdkit/` (RDKit_minimal.js + RDKit_minimal.wasm)
- `window.initRDKitModule({ locateFile: () => '/rdkit/RDKit_minimal.wasm' })`
- Initialisation asynchrone avec progress signal, écran de chargement
- **SMILES builder** : tous les atomes en notation brackettée `[Symbol]` — les atomes hors organic subset OpenSMILES (ex: `H`, `Na`) ne sont pas valides sans crochets
- **Ordre DFS** : écrire les branches `(...)` AVANT la continuation de la chaîne principale
- **SMILES cycliques** : algorithme deux passes dans `#buildSmiles` — (1) pre-pass DFS détecte les back-edges et assigne les numéros de ring closure (`ringOpens` Map), (2) DFS principale saute les back-edges et ajoute les suffixes de fermeture. Le bond char de la liaison est placé à l'atome ancêtre (ouverture du ring). Corrige benzène, cyclopropane, pyridine, caféine, et toute molécule cyclique
- **`hasSubstructure(molSmiles, smarts)`** : utilise `get_qmol()` + `get_substruct_match()`, retourne `match !== '{}'` — utilisé pour fragments unlock et daily challenges

### Moteur de physique 2D
- `WorkspaceService` : loop rAF hors zone Angular (`runOutsideAngular`)
- Forces : répulsion courte portée + spring sur liaisons existantes (**pas d'attraction inter-atomique**)
- **Cooldown après rupture** : `#cooldownPairs = Map<string, number>()`, clé `${idA}-${idB}` dans les deux sens. `removeBond()` set le cooldown + applique une impulsion de séparation sur les deux atomes
- **Guard stale snapshot** : `#createBond` et `#upgradeBond` relisent les valences depuis le store courant
- **`spawnFragment`** : crée atomes + liaisons en une passe, `silent = true` sur `#createBond`

### Three.js (viewer 3D)
- Import : `three/examples/jsm/controls/OrbitControls.js`
- Lazy-load via `@defer (when viewing3dMolecule() !== null)`
- PubChem 3D endpoint : `/compound/cid/{CID}/JSON?record_type=3d`
- Atom spheres : rayon = `Math.max(0.18, covalentRadius * 0.45)`
- Bond cylinders : `CylinderGeometry` orienté via `Quaternion.setFromUnitVectors(Y, dir)`
- Cleanup `ngOnDestroy` : `cancelAnimationFrame` + `dispose()` sur chaque geo/mat + renderer + controls

### Coordonnées SVG
- Toujours convertir via `svg.getScreenCTM().inverse()` — gère le viewBox automatiquement
- Ne jamais utiliser `getBoundingClientRect()` + calcul manuel pour les interactions

### PubChem API
- Pas de clé API, rate limit ~5 req/s par IP
- Cache agressif dans LocalStorage (SMILES lookup, descriptions, conformers 3D, isomer counts)
- Caractères SMILES à URL-encoder : `#`, `/`, `\`
- **`getIsomerCount(formula)`** : réponse directe (`IdentifierList.Size`) ou asynchrone (`Waiting.ListKey` → polling)
- `updateIsomerCount` matche par **SMILES** (pas par UUID)
- Mise à jour wrappée dans `NgZone.run()` (Promise hors zone → CD OnPush sinon ignoré)
- **Images 2D hints** : URL directe `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/PNG?record_type=2d&image_size=200x150` — pas d'appel API supplémentaire

### Wikipedia API
- Endpoint : `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` — CORS autorisé, pas de clé
- Cache LocalStorage 7 jours : clé `atomkit_wiki_{title_normalized}`
- Stratégie : `commonName` d'abord, puis `iupacName` en fallback
- Affichage : premier paragraphe uniquement (`extract.split('\n\n')[0]`)

### Fragments débloquables
- Condition de déverrouillage : **SMARTS substructure matching** sur les SMILES de la collection (`rdkit.hasSubstructure`)
- `fragmentStates` = `computed()` réactif à `rdkit.isReady()` et `store.collection()`
- Tous les 12 fragments toujours visibles dans la grille, `?` si verrouillé
- `FragmentDef` : champs `unlockedBySmarts: string | null` et `unlockedByHint: string`

### Mode Défis — détails techniques
- `src/app/models/challenge.ts` : interfaces `ChallengeDef`, `ChapterDef`, `DailyChallengeDef`, `DailyConstraint`
- `src/app/lib/challenges.ts` : données statiques — `CHAPTERS[]`, `DAILY_CHALLENGES[]`, `getDailyChallenge()`, `findChallengeById()`, `isDailyCompleted()`
- Store (`app-state.store.ts`) : `completedChallengeIds signal<string[]>` + `dailyCompletedDate signal<string|null>` persistés en LocalStorage. **Hints non persistés** — état éphémère local au `ChallengePlayerComponent`. `pendingDiscoveries` : `pushDiscovery()` / `dismissDiscovery()` / `clearDiscoveries()` pour la pile de notifications
- `ChallengePlayerComponent` : `challengeId`, `dailyActive`, `dailyDef`, `success` comme `input()` signals. `hintsOpen` comme `model()` two-way bindé depuis `LabComponent`. Hints : `signal(0)` local + `effect({ allowSignalWrites: true })` pour reset + fermeture du panel sur changement de challenge
- Détection dans `scanMolecules()` : boucle séparée AVANT la collection, calcule `getCanonicalSmiles()` directement sur chaque groupe complet, compare avec tous les `targetSmiles` et toutes les contraintes daily — indépendant de `alreadyKnown`

### Emojis et compatibilité Windows 10
- Éviter les emojis Unicode 14+ (ex: 🫙 non supporté sur Windows 10)
- Préférer Unicode ≤ 12 pour les icônes de chapitres

### Accessibilité
- Navigation clavier pour la liste d'éléments
- `aria-live` pour les découvertes

## Structure du projet (réelle)
```
src/app/
  models/
    index.ts          → AtomNode, Bond, ElementData, FragmentDef (unlockedBySmarts/unlockedByHint)
    challenge.ts      → ChallengeDef, ChapterDef, DailyChallengeDef, DailyConstraint
  lib/
    atom-data.ts      → 118 éléments (CPK, valences, covalentRadius)
    fragments.ts      → 12 fragments, unlock par SMARTS
    challenges.ts     → 8 chapitres (38 challenges) + 30 daily challenges
  store/              → app-state.store.ts (signals + LocalStorage : collection, challenges, daily)
  workspace/          → workspace.service.ts (physique 2D, cooldown, spawnFragment) + workspace.component (SVG)
  chemistry/
    rdkit.service.ts     → wrapper WASM (SMILES builder, get_mol, hasSubstructure)
    molecule.service.ts  → BFS groupes connexes + pipeline discovery (RDKit → PubChem)
  api/
    pubchem.service.ts   → HTTP + cache LocalStorage, rate-limit 5 req/s + get3dConformer
    wikipedia.service.ts → résumés Wikipedia, cache LocalStorage 7j
  audio/              → audio.service.ts (Web Audio API, playChallengeSuccessSound)
  ui/
    periodic-table/   → liste scrollable par catégorie + recherche + badge valence
    fragments/        → fragment-palette.component (grille 3×4, unlock SMARTS, bouton œil)
    molecule-card/    → stack de notifications (bas-droite, 240px, max 5, dégradé opacité, clear all)
    molecule-3d/      → molecule-3d-viewer.component (Three.js, lazy via @defer)
    challenges/
      challenges.component       → banner daily + liste chapitres accordéon + cards challenges
      challenge-player.component → overlay flottant workspace (barre active + succès + hints)
    collection/
      collection.component      → grille cards Famous/Novel
      molecule-detail.component → overlay fiche enrichie
    loading/          → écran de chargement RDKit
    lab/              → layout principal, navigation 3 tabs, pipeline scan, challenge detection
public/
  rdkit/              → RDKit_minimal.js + RDKit_minimal.wasm
```

## Ressources
- RDKit JS : https://www.npmjs.com/package/@rdkit/rdkit
- PubChem REST API : https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
- Three.js : https://threejs.org/
- Wikipedia REST API : https://en.wikipedia.org/api/rest_v1/
- CPK colors : https://en.wikipedia.org/wiki/CPK_coloring
- Valences standard : https://en.wikipedia.org/wiki/Valence_(chemistry)
