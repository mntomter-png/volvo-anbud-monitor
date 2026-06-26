import { NextResponse, type NextRequest } from "next/server";

import { DoffinClient, mapNoticeToTender } from "@/lib/doffin";
import { createServerSupabase, TENDERS_TABLE } from "@/lib/supabase";
import {
  SEARCH_KEYWORDS,
  matchVolvoKeywords,
} from "@/lib/keywords";
import { sendNotificationEmail } from "@/lib/email";
import type { DoffinNotice, TenderInsert } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Jobben kan ta noen sekunder pga. flere API-kall.
export const maxDuration = 60;

/**
 * Sjekk valgfri beskyttelse av endepunktet. Hvis CRON_SECRET er satt,
 * må kallet inkludere `Authorization: Bearer <secret>` eller `?secret=`.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // ingen beskyttelse konfigurert
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (request.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

/** Logg med tidsstempel og fast prefiks for enkel filtrering i hosting-logg. */
function log(message: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra !== undefined) {
    console.log(`[notifications] ${ts} ${message}`, extra);
  } else {
    console.log(`[notifications] ${ts} ${message}`);
  }
}

/**
 * POST /api/notifications
 *
 * Hoved-logikken for den daglige jobben:
 *  1. Søk i Doffin på Volvo-relevante nøkkelord
 *  2. Filtrer til de fire regionene (Oslo, Akershus, Buskerud, Innlandet)
 *  3. Finn hvilke anbud som er nye (ikke allerede i databasen)
 *  4. Lagre de nye i Supabase
 *  5. Send HTML-e-post via Resend kun hvis det finnes nye relevante anbud
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  try {
    const doffin = new DoffinClient();
    const supabase = createServerSupabase();

    // 1) Søk i Doffin på hvert nøkkelord og samle unike treff.
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

    // 2) Filtrer til Volvo-relevante anbud i en av de fire regionene.
    const relevant: TenderInsert[] = allNotices
      .filter((notice) => {
        const text = `${notice.heading ?? ""} ${notice.description ?? ""}`;
        return matchVolvoKeywords(text).length > 0;
      })
      .map(mapNoticeToTender)
      .filter((tender) => tender.region !== null);

    log(`${relevant.length} anbud er Volvo-relevante i målregionene`);

    if (relevant.length === 0) {
      return NextResponse.json({
        ok: true,
        fetched: allNotices.length,
        relevant: 0,
        new: 0,
        emailSent: false,
        searchErrors,
        durationMs: Date.now() - startedAt,
      });
    }

    // 3) Finn hvilke som allerede finnes i databasen.
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

    // 4) Lagre nye anbud (upsert for å være robust mot race conditions).
    if (newTenders.length > 0) {
      const { error: insertError } = await supabase
        .from(TENDERS_TABLE)
        .upsert(newTenders, { onConflict: "doffin_id", ignoreDuplicates: true });

      if (insertError) {
        throw new Error(`Kunne ikke lagre nye anbud: ${insertError.message}`);
      }
    }

    // 5) Send e-post kun hvis det faktisk er nye relevante anbud.
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

    return NextResponse.json({
      ok: true,
      fetched: allNotices.length,
      relevant: relevant.length,
      new: newTenders.length,
      emailSent: emailResult.sent,
      emailSkippedReason: emailResult.skippedReason,
      searchErrors,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    console.error("[notifications] Uventet feil:", message);
    return NextResponse.json(
      { ok: false, error: "Jobben feilet", details: message },
      { status: 500 },
    );
  }
}

/** GET tillater enkel manuell trigging (f.eks. fra en cron-tjeneste). */
export async function GET(request: NextRequest) {
  return POST(request);
}
