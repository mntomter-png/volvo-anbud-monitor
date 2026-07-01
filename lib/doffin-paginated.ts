/**
 * Paginert søk mot Doffin – henter alle tilgjengelige sider (maks 1000 treff).
 */

import type { DoffinClient } from "@/lib/doffin";
import type { DoffinNotice, DoffinSearchParams } from "@/lib/types";

export const HITS_PER_PAGE = 50;
/** Doffin begrenser antall tilgjengelige treff per søk. */
export const MAX_ACCESSIBLE_HITS = 1000;
export const MAX_PAGES = Math.ceil(MAX_ACCESSIBLE_HITS / HITS_PER_PAGE);

export interface PaginatedSearchResult {
  notices: DoffinNotice[];
  pagesFetched: number;
  totalHits: number;
}

/**
 * Hent alle sider for ett søk. Stopper når det ikke er flere treff,
 * siden er tom, eller Doffin-grensen (1000) er nådd.
 */
export async function searchAllNotices(
  client: DoffinClient,
  baseParams: DoffinSearchParams,
  options?: { maxPages?: number },
): Promise<PaginatedSearchResult> {
  const maxPages = options?.maxPages ?? MAX_PAGES;
  const perPage = baseParams.numHitsPerPage ?? HITS_PER_PAGE;
  const notices: DoffinNotice[] = [];
  const seen = new Set<string>();
  let page = 1;
  let totalHits = 0;
  let pagesFetched = 0;

  while (page <= maxPages) {
    const result = await client.searchNotices({
      ...baseParams,
      numHitsPerPage: perPage,
      page,
    });

    if (page === 1) {
      totalHits = result.numHitsAccessible ?? result.numHitsTotal ?? 0;
    }

    for (const hit of result.hits) {
      if (hit?.id && !seen.has(hit.id)) {
        seen.add(hit.id);
        notices.push(hit);
      }
    }

    pagesFetched = page;

    if (result.hits.length === 0) break;
    if (notices.length >= totalHits) break;
    if (result.hits.length < perPage) break;

    page += 1;
  }

  return { notices, pagesFetched, totalHits };
}
