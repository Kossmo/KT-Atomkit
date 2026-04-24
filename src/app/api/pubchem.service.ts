import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const CACHE_PREFIX = 'atomkit_pubchem_';

export interface PubchemCompound {
  cid: number;
  formula: string;
  molecularWeight: number;
  iupacName: string;
  canonicalSmiles: string;
}

export interface PubchemDescription {
  title: string;
  description: string | null;
}

export interface Pubchem3dAtom {
  id: number;
  atomicNumber: number;
  x: number;
  y: number;
  z: number;
}

export interface Pubchem3dBond {
  aid1: number;
  aid2: number;
  order: number;
}

export interface Pubchem3dConformer {
  atoms: Pubchem3dAtom[];
  bonds: Pubchem3dBond[];
}

@Injectable({ providedIn: 'root' })
export class PubchemService {
  readonly #http = inject(HttpClient);
  #queue: Array<() => Promise<void>> = [];
  #processing = false;

  async lookupBySmiles(smiles: string): Promise<PubchemCompound | null> {
    const cacheKey = CACHE_PREFIX + btoa(smiles).slice(0, 40);
    const cached = this.#fromCache<PubchemCompound>(cacheKey);
    if (cached !== undefined) return cached;

    return this.#enqueue(async () => {
      try {
        const encoded = encodeURIComponent(smiles);
        const url = `${BASE}/compound/smiles/${encoded}/property/MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES/JSON`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await firstValueFrom(this.#http.get<any>(url));
        const props = res?.PropertyTable?.Properties?.[0];
        if (!props) {
          this.#toCache(cacheKey, null);
          return null;
        }
        const compound: PubchemCompound = {
          cid: props.CID,
          formula: props.MolecularFormula,
          molecularWeight: parseFloat(props.MolecularWeight),
          iupacName: props.IUPACName,
          canonicalSmiles: props.CanonicalSMILES,
        };
        this.#toCache(cacheKey, compound);
        return compound;
      } catch {
        return null;
      }
    });
  }

  async getDescription(cid: number): Promise<PubchemDescription | null> {
    const cacheKey = CACHE_PREFIX + 'desc_' + cid;
    const cached = this.#fromCache<PubchemDescription>(cacheKey);
    if (cached !== undefined) return cached;

    return this.#enqueue(async () => {
      try {
        const url = `${BASE}/compound/cid/${cid}/description/JSON`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await firstValueFrom(this.#http.get<any>(url));
        const info = res?.InformationList?.Information;
        const title = info?.[0]?.Title ?? null;
        const desc = info?.find((i: { Description: string }) => i.Description)?.Description ?? null;
        const result: PubchemDescription = { title, description: desc };
        this.#toCache(cacheKey, result);
        return result;
      } catch {
        return null;
      }
    });
  }

  async get3dConformer(cid: number): Promise<Pubchem3dConformer | null> {
    const cacheKey = CACHE_PREFIX + '3d_' + cid;
    const cached = this.#fromCache<Pubchem3dConformer>(cacheKey);
    if (cached !== undefined) return cached;

    return this.#enqueue(async () => {
      try {
        const url = `${BASE}/compound/cid/${cid}/JSON?record_type=3d`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await firstValueFrom(this.#http.get<any>(url));
        const compound = res?.PC_Compounds?.[0];
        if (!compound) { this.#toCache(cacheKey, null); return null; }

        const aids: number[] = compound.atoms?.aid ?? [];
        const elements: number[] = compound.atoms?.element ?? [];
        const coordsBlock = compound.coords?.[0];
        const conformer = coordsBlock?.conformers?.[0];
        const coordAids: number[] = coordsBlock?.aid ?? [];

        if (!conformer?.x) { this.#toCache(cacheKey, null); return null; }

        const atomMap = new Map<number, { atomicNumber: number; x: number; y: number; z: number }>();
        for (let i = 0; i < aids.length; i++) {
          atomMap.set(aids[i], { atomicNumber: elements[i], x: 0, y: 0, z: 0 });
        }
        for (let i = 0; i < coordAids.length; i++) {
          const a = atomMap.get(coordAids[i]);
          if (a) { a.x = conformer.x[i]; a.y = conformer.y[i]; a.z = conformer.z[i]; }
        }

        const atoms: Pubchem3dAtom[] = [...atomMap.entries()].map(([id, a]) => ({ id, ...a }));
        const bondsRaw = compound.bonds ?? {};
        const aid1Arr: number[] = bondsRaw.aid1 ?? [];
        const bonds: Pubchem3dBond[] = aid1Arr.map((a1, i) => ({
          aid1: a1,
          aid2: bondsRaw.aid2[i],
          order: bondsRaw.order[i],
        }));

        const result: Pubchem3dConformer = { atoms, bonds };
        this.#toCache(cacheKey, result);
        return result;
      } catch {
        return null;
      }
    });
  }

  async getIsomerCount(formula: string): Promise<number | null> {
    const cacheKey = CACHE_PREFIX + 'isocount_' + formula;
    const cached = this.#fromCache<number>(cacheKey);
    if (cached !== undefined) return cached;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractCount = (res: any): number | null => {
      const il = res?.IdentifierList;
      if (!il) return null;
      if (typeof il.Size === 'number') return il.Size;
      if (Array.isArray(il.CID)) return il.CID.length;
      return null;
    };

    // Initial request through rate-limited queue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initial = await this.#enqueue<any>(async () => {
      try {
        const url = `${BASE}/compound/formula/${encodeURIComponent(formula)}/cids/JSON`;
        return await firstValueFrom(this.#http.get<any>(url));
      } catch { return null; }
    });

    if (!initial) return null;

    // Direct result
    const directCount = extractCount(initial);
    if (directCount !== null) {
      this.#toCache(cacheKey, directCount);
      return directCount;
    }

    // Async result — poll listkey outside rate-limit queue
    const key = initial?.Waiting?.ListKey;
    if (!key) return null;

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const pollUrl = `${BASE}/compound/listkey/${key}/cids/JSON`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const poll = await firstValueFrom(this.#http.get<any>(pollUrl));
        const pollCount = extractCount(poll);
        if (pollCount !== null) {
          this.#toCache(cacheKey, pollCount);
          return pollCount;
        }
      } catch { /* still processing */ }
    }

    return null;
  }

  #enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.#queue.push(async () => {
        try { resolve(await fn()); } catch (e) { reject(e); }
      });
      this.#processQueue();
    });
  }

  async #processQueue(): Promise<void> {
    if (this.#processing) return;
    this.#processing = true;
    while (this.#queue.length > 0) {
      const task = this.#queue.shift()!;
      await task();
      await new Promise(r => setTimeout(r, 210)); // ~5 req/s
    }
    this.#processing = false;
  }

  #fromCache<T>(key: string): T | null | undefined {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    try { return JSON.parse(raw) as T; } catch { return undefined; }
  }

  #toCache<T>(key: string, value: T | null): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
  }
}
