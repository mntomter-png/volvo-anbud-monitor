/**
 * Kjernelogikk for å hente, filtrere og lagre nye anbud.
 * Brukes av både cron (/api/notifications) og manuell sync (/api/sync).
 */

import { DoffinClient, mapNoticeToTender } from "@/lib/doffin";
import { searchAllNotices } from "@/lib/doffin-paginated";
import { createServerSupabase, TENDERS_TABLE } from "@/lib/supabase";
import { CPV_CODES, SEARCH_KEYWORDS, isTruckRelevant } from "@/lib/keywords";
import { sendNotificationEmail } from "@/lib/email";
import { backfillTenderClassification } from "@/lib/backfill-classification";
import type { DoffinNotice, DoffinSearchParams, TenderInsert } from "@/lib/types";

export interface TenderSyncResult {
  ok: boolean;
  fetched: number;
  relevant: number;
  new: number;
  awardsFetched?: number;
  awardsNew?: number;
  emailSent: boolean;
  emailSkippedReason?: string;
  searchErrors: string[];
  durationMs: number;
  error?: string;
  details?: string;
}

const AWARD_NOTICE_TYPES = [
  "RESULT",
  "ANNOUNCEMENT_OF_CONCLUSION_OF_CONTRACT",
] as const;

const AWARD_STATUSES = ["AWARDED", "EXPIRED"] as const;

function log(message: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra !== undefined) {
    console.log(`[tender-sync] ${ts} ${message}`, extra);
  } else {
    console.log(`[tender-sync] ${ts} ${message}`);
  }
}

function issueDateFromYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function isTruckRelevantInRegion(notice: DoffinNotice): boolean {
  const text = `${notice.heading ?? ""} ${notice.description ?? ""}`;
  if (!isTruckRelevant(text, notice.cpvCodes)) return false;
  const tender = mapNoticeToTender(notice);
  return tender.region !== null;
}

/** Kjør ett paginert søk og legg treff i samlingen (deduplisert på id). */
async function collectFromSearch(
  doffin: DoffinClient,
  label: string,
  params: DoffinSearchParams,
  noticesById: Map<string, DoffinNotice>,
  searchErrors: string[],
): Promise<{ pages: number; hits: number }> {
  try {
    const { notices, pagesFetched, totalHits } = await searchAllNotices(
      doffin,
      params,
    );
    for (const hit of notices) {
      if (hit?.id) noticesById.set(hit.id, hit);
    }
    log(
      `Søk «${label}» ga ${notices.length} treff (${pagesFetched} sider, ${totalHits} totalt)`,
    );
    return { pages: pagesFetched, hits: notices.length };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "ukjent feil";
    searchErrors.push(`${label}: ${msg}`);
    log(`Søk «${label}» feilet`, msg);
    return { pages: 0, hits: 0 };
  }
}

function buildCompetitionSearches(): { label: string; params: DoffinSearchParams }[] {
  const keywordSearches = SEARCH_KEYWORDS.map((searchString) => ({
    label: `nøkkelord:${searchString}`,
    params: {
      searchString,
      status: "ACTIVE",
      sortBy: "PUBLICATION_DATE_DESC" as const,
    },
  }));

  const cpvSearch = {
    label: "cpv:alle",
    params: {
      cpvCode: CPV_CODES,
      status: "ACTIVE",
      sortBy: "PUBLICATION_DATE_DESC" as const,
    },
  };

  return [...keywordSearches, cpvSearch];
}

function buildAwardSearches(): { label: string; params: DoffinSearchParams }[] {
  const issueDateFrom = issueDateFromYearsAgo(4);
  const base = {
    type: [...AWARD_NOTICE_TYPES],
    status: [...AWARD_STATUSES],
    issueDateFrom,
    sortBy: "PUBLICATION_DATE_DESC" as const,
  };

  const keywordSearches = SEARCH_KEYWORDS.map((searchString) => ({
    label: `tildeling:${searchString}`,
    params: { ...base, searchString },
  }));

  const cpvSearch = {
    label: "tildeling:cpv",
    params: { ...base, cpvCode: CPV_CODES },
  };

  return [...keywordSearches, cpvSearch];
}

/** Hent nye relevante anbud fra Doffin, lagre i Supabase og send e-post ved nye treff. */
export async function runTenderSync(): Promise<TenderSyncResult> {
  const startedAt = Date.now();

  try {
    const doffin = new DoffinClient();
    const supabase = createServerSupabase();
    const competitionById = new Map<string, DoffinNotice>();
    const awardById = new Map<string, DoffinNotice>();
    const searchErrors: string[] = [];

    for (const { label, params } of buildCompetitionSearches()) {
      await collectFromSearch(doffin, label, params, competitionById, searchErrors);
    }

    for (const { label, params } of buildAwardSearches()) {
      await collectFromSearch(doffin, label, params, awardById, searchErrors);
    }

    const allCompetitionNotices = Array.from(competitionById.values());
    const allAwardNotices = Array.from(awardById.values());
    log(
      `Totalt ${allCompetitionNotices.length} konkurranser + ${allAwardNotices.length} tildelinger fra Doffin`,
    );

    const relevantCompetitions: TenderInsert[] = allCompetitionNotices
      .filter(isTruckRelevantInRegion)
      .map(mapNoticeToTender);

    const relevantAwards: TenderInsert[] = allAwardNotices
      .filter(isTruckRelevantInRegion)
      .map(mapNoticeToTender);

    const relevant = [...relevantCompetitions, ...relevantAwards];
    log(
      `${relevantCompetitions.length} konkurranser + ${relevantAwards.length} tildelinger er truck-relevante i målregionene`,
    );

    if (relevant.length === 0) {
      return {
        ok: true,
        fetched: allCompetitionNotices.length + allAwardNotices.length,
        relevant: 0,
        new: 0,
        awardsFetched: allAwardNotices.length,
        awardsNew: 0,
        emailSent: false,
        searchErrors,
        durationMs: Date.now() - startedAt,
      };
    }

    const ids = relevant.map((t) => t.doffin_id);
    const { data: existing, error: existingError } = await supabase
      .from(TENDERS_TABLE)
      .select("doffin_id")
      .in("doffin_id", ids);

    if (existingError) {
      throw new Error(`Kunne ikke lese eksisterende anbud: ${existingError.message}`);
    }

    const existingIds = new Set((existing ?? []).map((r) => r.doffin_id));
    const newTenders = relevant.filter((t) => !existingIds.has(t.doffin_id));
    const newAwards = newTenders.filter((t) => t.notice_kind === "award");
    log(`${newTenders.length} av ${relevant.length} anbud er nye`);

    if (newTenders.length > 0) {
      const { error: insertError } = await supabase
        .from(TENDERS_TABLE)
        .upsert(newTenders, { onConflict: "doffin_id", ignoreDuplicates: true });

      if (insertError) {
        throw new Error(`Kunne ikke lagre nye anbud: ${insertError.message}`);
      }
    }

    let emailResult = { sent: false, skippedReason: "Ingen nye anbud" } as Awaited<
      ReturnType<typeof sendNotificationEmail>
    >;

    if (newTenders.length > 0) {
      try {
        emailResult = await sendNotificationEmail(newTenders);
        log(
          emailResult.sent
            ? `E-post sendt (id: ${emailResult.id})`
            : `E-post hoppet over: ${emailResult.skippedReason}`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : "ukjent feil";
        log("E-postsending feilet", msg);
        searchErrors.push(`e-post: ${msg}`);
      }
    }

    await backfillTenderClassification();

    return {
      ok: true,
      fetched: allCompetitionNotices.length + allAwardNotices.length,
      relevant: relevant.length,
      new: newTenders.length,
      awardsFetched: allAwardNotices.length,
      awardsNew: newAwards.length,
      emailSent: emailResult.sent,
      emailSkippedReason: emailResult.skippedReason,
      searchErrors,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    console.error("[tender-sync] Uventet feil:", message);
    return {
      ok: false,
      fetched: 0,
      relevant: 0,
      new: 0,
      emailSent: false,
      searchErrors: [],
      durationMs: Date.now() - startedAt,
      error: "Jobben feilet",
      details: message,
    };
  }
}
