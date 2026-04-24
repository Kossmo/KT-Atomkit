import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const CACHE_PREFIX = 'atomkit_wiki_';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface WikiSummary {
  extract: string;
  description: string | null;
  pageUrl: string | null;
}

interface CacheEntry { data: WikiSummary | null; cachedAt: number; }

@Injectable({ providedIn: 'root' })
export class WikipediaService {
  readonly #http = inject(HttpClient);

  async getSummary(title: string): Promise<WikiSummary | null> {
    const key = CACHE_PREFIX + title.toLowerCase().replace(/\s+/g, '_');
    const cached = this.#fromCache(key);
    if (cached !== undefined) return cached;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await firstValueFrom(this.#http.get<any>(`${API}/${encodeURIComponent(title)}`));
      if (!res?.extract) { this.#toCache(key, null); return null; }
      const result: WikiSummary = {
        extract: res.extract,
        description: res.description ?? null,
        pageUrl: res.content_urls?.desktop?.page ?? null,
      };
      this.#toCache(key, result);
      return result;
    } catch {
      this.#toCache(key, null);
      return null;
    }
  }

  #fromCache(key: string): WikiSummary | null | undefined {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    try {
      const entry = JSON.parse(raw) as CacheEntry;
      if (Date.now() - entry.cachedAt > TTL_MS) { localStorage.removeItem(key); return undefined; }
      return entry.data;
    } catch { return undefined; }
  }

  #toCache(key: string, data: WikiSummary | null): void {
    try { localStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() })); } catch { /* quota */ }
  }
}
