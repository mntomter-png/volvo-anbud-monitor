import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabase, TENDERS_TABLE } from "@/lib/supabase";
import { REGION_NAMES } from "@/lib/keywords";
import type { TenderRow } from "@/lib/types";

// Alltid dynamisk – vi leser ferske data fra databasen ved hvert kall.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SORT_COLUMNS = new Set<keyof TenderRow>([
  "published_at",
  "deadline",
  "estimated_value",
  "title",
  "buyer",
  "region",
  "created_at",
]);

/**
 * GET /api/tenders
 *
 * Henter lagrede (Volvo-relevante) anbud fra Supabase med filtrering.
 *
 * Query-parametre:
 *  - region:  ett eller flere regionnavn, komma-separert (f.eks. "Oslo,Akershus")
 *  - search:  fritekst som matcher tittel eller oppdragsgiver
 *  - from:    kun anbud publisert fra og med denne datoen (ISO/yyyy-mm-dd)
 *  - to:      kun anbud publisert til og med denne datoen
 *  - sort:    kolonne å sortere på (default "published_at")
 *  - order:   "asc" | "desc" (default "desc")
 *  - limit:   maks antall rader (default 200, maks 1000)
 *  - offset:  paginering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const regionParam = searchParams.get("region");
    const search = searchParams.get("search")?.trim();
    const from = searchParams.get("from")?.trim();
    const to = searchParams.get("to")?.trim();
    const sortParam = (searchParams.get("sort") ?? "published_at") as keyof TenderRow;
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 200), 1),
      1000,
    );
    const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

    const sortColumn = VALID_SORT_COLUMNS.has(sortParam)
      ? sortParam
      : "published_at";

    const supabase = createServerSupabase();

    let query = supabase
      .from(TENDERS_TABLE)
      .select("*", { count: "exact" })
      .order(sortColumn, { ascending: order === "asc", nullsFirst: false })
      .range(offset, offset + limit - 1);

    // Region-filter (multi-select). Ignorer ugyldige regionnavn.
    if (regionParam) {
      const regions = regionParam
        .split(",")
        .map((r) => r.trim())
        .filter((r) => REGION_NAMES.includes(r));
      if (regions.length > 0) {
        query = query.in("region", regions);
      }
    }

    // Fritekstsøk i tittel eller oppdragsgiver.
    if (search) {
      const safe = search.replace(/[%,]/g, " ");
      query = query.or(`title.ilike.%${safe}%,buyer.ilike.%${safe}%`);
    }

    // Dato-range på publiseringsdato.
    if (from) query = query.gte("published_at", from);
    if (to) query = query.lte("published_at", to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[GET /api/tenders] Supabase-feil:", error.message);
      return NextResponse.json(
        { error: "Kunne ikke hente anbud fra databasen", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: data ?? [],
      count: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    console.error("[GET /api/tenders] Uventet feil:", message);
    return NextResponse.json(
      { error: "Uventet serverfeil", details: message },
      { status: 500 },
    );
  }
}
