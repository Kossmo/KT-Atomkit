import { Component, NgZone, OnInit, effect, inject, signal } from '@angular/core';
import { WorkspaceComponent } from '../../workspace/workspace.component';
import { PeriodicTableComponent } from '../periodic-table/periodic-table.component';
import { LoadingComponent } from '../loading/loading.component';
import { MoleculeCardComponent } from '../molecule-card/molecule-card.component';
import { CollectionComponent } from '../collection/collection.component';
import { Molecule3dViewerComponent } from '../molecule-3d/molecule-3d-viewer.component';
import { FragmentPaletteComponent } from '../fragments/fragment-palette.component';
import { ChallengesComponent } from '../challenges/challenges.component';
import { ChallengePlayerComponent } from '../challenges/challenge-player.component';
import { RdkitService } from '../../chemistry/rdkit.service';
import { MoleculeService } from '../../chemistry/molecule.service';
import { WorkspaceService } from '../../workspace/workspace.service';
import { AppStateStore } from '../../store/app-state.store';
import { AudioService } from '../../audio/audio.service';
import { PubchemService } from '../../api/pubchem.service';
import { ChallengeDef } from '../../models/challenge';
import { DiscoveredMolecule, ElementData, FragmentDef } from '../../models';
import { CHAPTERS, findChallengeById, getDailyChallenge, isDailyCompleted } from '../../lib/challenges';

@Component({
  selector: 'app-lab',
  imports: [WorkspaceComponent, PeriodicTableComponent,
            LoadingComponent, MoleculeCardComponent, CollectionComponent,
            Molecule3dViewerComponent, FragmentPaletteComponent,
            ChallengesComponent, ChallengePlayerComponent],
  templateUrl: './lab.component.html',
  styleUrl: './lab.component.scss',
})
export class LabComponent implements OnInit {
  readonly rdkit = inject(RdkitService);
  readonly store = inject(AppStateStore);
  readonly mainView = signal<'workspace' | 'challenges' | 'collection'>('workspace');
  readonly viewing3dMolecule = signal<DiscoveredMolecule | null>(null);
  readonly showInfo = signal(false);

  readonly activeChallengeId = signal<string | null>(null);
  readonly activeDailyMode = signal(false);
  readonly challengeSuccess = signal(false);
  readonly dailyDef = getDailyChallenge();

  readonly #ws = inject(WorkspaceService);
  readonly #audio = inject(AudioService);
  readonly #molecule = inject(MoleculeService);
  readonly #pubchem = inject(PubchemService);
  readonly #zone = inject(NgZone);

  #scanTimer: ReturnType<typeof setTimeout> | null = null;

  readonly #autoScan = effect(() => {
    this.store.bonds();
    this.store.mode();
    if (this.#scanTimer !== null) clearTimeout(this.#scanTimer);
    this.#scanTimer = setTimeout(() => this.scanMolecules(), 1200);
  });

  async ngOnInit(): Promise<void> {
    await this.rdkit.load();
  }

  onElementSelected(element: ElementData): void {
    this.#ws.spawnAtom(element);
    this.#audio.playAtomSpawnSound();
  }

  clearScene(): void { this.#ws.clearScene(); }

  onFragmentSelected(def: FragmentDef): void {
    this.#ws.spawnFragment(def);
    this.#audio.playAtomSpawnSound();
  }

  startChallenge(def: ChallengeDef): void {
    this.#ws.clearScene();
    this.activeChallengeId.set(def.id);
    this.activeDailyMode.set(false);
    this.challengeSuccess.set(false);
    this.mainView.set('workspace');
  }

  startDailyChallenge(): void {
    this.#ws.clearScene();
    this.activeDailyMode.set(true);
    this.activeChallengeId.set(null);
    this.challengeSuccess.set(false);
    this.mainView.set('workspace');
  }

  quitChallenge(): void {
    this.activeChallengeId.set(null);
    this.activeDailyMode.set(false);
    this.challengeSuccess.set(false);
    this.mainView.set('challenges');
  }

  #fetchIsomerCount(mol: DiscoveredMolecule): void {
    if (mol.type !== 'famous') return;
    this.#pubchem.getIsomerCount(mol.formula).then(count => {
      if (count !== null) this.#zone.run(() => this.store.updateIsomerCount(mol.smiles, count));
    });
  }

  async scanMolecules(): Promise<void> {
    if (!this.rdkit.isReady() || this.store.isDiscovering()) return;
    this.store.isDiscovering.set(true);

    try {
      const groups = this.#molecule.getConnectedGroups();
      const complete = groups.filter(g => this.#molecule.isGroupComplete(g));
      const alreadyKnown = new Set(this.store.collection().map(m => m.smiles));
      const realModeOnly = this.store.mode() === 'real';

      // ── Challenge detection (passive — runs regardless of active challenge) ──
      for (const group of complete) {
        const groupIds = new Set(group.map(a => a.id));
        const groupBonds = [...this.store.bonds().values()].filter(
          b => groupIds.has(b.atomA) && groupIds.has(b.atomB)
        );
        const smiles = this.rdkit.getCanonicalSmiles(group, groupBonds);
        if (!smiles) continue;

        // Daily challenge
        if (!isDailyCompleted(this.store.dailyCompletedDate())) {
          if (this.dailyDef.constraints.every(c => this.rdkit.hasSubstructure(smiles, c.smarts))) {
            this.store.completeDailyChallenge();
            if (this.activeDailyMode() && !this.challengeSuccess()) {
              this.challengeSuccess.set(true);
              this.#audio.playChallengeSuccessSound();
            }
          }
        }

        // Chapter challenges
        for (const chapter of CHAPTERS) {
          for (const challenge of chapter.challenges) {
            if (!this.store.completedChallengeIds().includes(challenge.id) && smiles === challenge.targetSmiles) {
              this.store.completeChallenge(challenge.id);
              if (this.activeChallengeId() === challenge.id && !this.challengeSuccess()) {
                this.challengeSuccess.set(true);
                this.#audio.playChallengeSuccessSound();
              }
            }
          }
        }
      }

      // ── Collection discovery ──────────────────────────────────────────────
      for (const group of complete) {
        const discovered = await this.#molecule.discoverGroup(group);
        if (!discovered) continue;
        if (alreadyKnown.has(discovered.smiles)) continue;
        if (realModeOnly && discovered.type === 'exploratory') continue;

        this.store.addToCollection(discovered);
        this.store.pushDiscovery(discovered);
        this.#fetchIsomerCount(discovered);

        if (discovered.type === 'famous') {
          this.#audio.playDiscoveryFamousSound();
        } else {
          this.#audio.playDiscoveryExploratorySound();
        }
      }
    } finally {
      this.store.isDiscovering.set(false);
    }
  }
}
