/**
 * Kjernelogikk for å hente, filtrere og lagre nye anbud.
 * Brukes av både cron (/api/notifications) og manuell sync (/api/sync).
 */

import { DoffinClient, mapNoticeToTender } from "@/lib/doffin";
import { createServerSupabase, TENDERS_TABLE } from "@/lib/supabase";
import { SEARCH_KEYWORDS, matchVolvoKeywords } from "@/lib/keywords";
import { sendNotificationEmail } from "@/lib/email";
import { backfillTenderClassification } from "@/lib/backfill-classification";
import type { DoffinNotice, TenderInsert } from "@/lib/types";

export interface TenderSyncResult {
  ok: boolean;
  fetched: number;
  relevant: number;
  new: number;
  emailSent: boolean;
  emailSkippedReason?: string;
  searchErrors: string[];
  durationMs: number;
  error?: string;
  details?: string;
}

function log(message: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra !== undefined) {
    console.log(`[tender-sync] ${ts} ${message}`, extra);
  } else {
    console.log(`[tender-sync] ${ts} ${message}`);
  }
}

/** Hent nye relevante anbud fra Doffin, lagre i Supabase og send e-post ved nye treff. */
export async function runTenderSync(): Promise<TenderSyncResult> {
  const startedAt = Date.now();

  try {
    const doffin = new DoffinClient();
    const supabase = createServerSupabase();
    const noticesById = new Map<string, DoffinNotice>();
    const searchErrors: string[] = [];

    for (const keyword of SEARCH_KEYWORDS) {
      try {
        const result = await doffin.searchNotices({
          searchString: keyword,
          status: "ACTIVE",
          numHitsPerPage: 50,
          sortBy: "PUBLICATION_DATE_DESC",
        });
        for (const hit of result.hits) {
          if (hit?.id) noticesById.set(hit.id, hit);
        }
        log(`Søk «${keyword}» ga ${result.hits.length} treff`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "ukjent feil";
        searchErrors.push(`${keyword}: ${msg}`);
        log(`Søk «${keyword}» feilet`, msg);
      }
    }

    const allNotices = Array.from(noticesById.values());
    log(`Totalt ${allNotices.length} unike treff fra Doffin`);

    const relevant: TenderInsert[] = allNotices
      .filter((notice) => {
        const text = `${notice.heading ?? ""} ${notice.description ?? ""}`;
        return matchVolvoKeywords(text).length > 0;
      })
      .map(mapNoticeToTender)
      .filter((tender) => tender.region !== null);

    log(`${relevant.length} anbud er Volvo-relevante i målregionene`);

    if (relevant.length === 0) {
      return {
        ok: true,
        fetched: allNotices.length,
        relevant: 0,
        new: 0,
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
      fetched: allNotices.length,
      relevant: relevant.length,
      new: newTenders.length,
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
