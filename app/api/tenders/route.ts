import { NextResponse, type NextRequest } from "next/server";

import { requireAuthProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { TENDERS_TABLE } from "@/lib/supabase";
import { REGION_NAMES } from "@/lib/keywords";
import { isPipelineStatus, isTenderType } from "@/lib/pipeline";
import { EXPIRING_SOON_MONTHS, isNoticeKind } from "@/lib/notice-kind";
import { apiError } from "@/lib/security/api-error";
import { sanitizePostgrestSearch } from "@/lib/security/search";
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
  "tender_type",
  "pipeline_status",
  "assignee",
  "notice_kind",
  "contract_end_date",
  "winner_name",
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
 *  - tender_type: komma-separert (direct_purchase, transport_service, …)
 *  - pipeline_status: komma-separert (new, reviewing, …)
 *  - is_electric: "true" | "false"
 *  - notice_kind: competition | award (komma-separert)
 *  - expiring_soon: "true" – tildelinger med kontrakt som utløper innen 6 mnd
 *  - sort:    kolonne å sortere på (default "published_at")
 *  - order:   "asc" | "desc" (default "desc")
 *  - limit:   maks antall rader (default 200, maks 1000)
 *  - offset:  paginering
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthProfile();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = request.nextUrl;

    const regionParam = searchParams.get("region");
    const search = searchParams.get("search")?.trim();
    const from = searchParams.get("from")?.trim();
    const to = searchParams.get("to")?.trim();
    const tenderTypeParam = searchParams.get("tender_type");
    const statusParam = searchParams.get("pipeline_status");
    const electricParam = searchParams.get("is_electric");
    const noticeKindParam = searchParams.get("notice_kind");
    const expiringSoon = searchParams.get("expiring_soon") === "true";
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

    const supabase = await createClient();

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
      const safe = sanitizePostgrestSearch(search);
      if (safe) {
        query = query.or(`title.ilike.%${safe}%,buyer.ilike.%${safe}%`);
      }
    }

    // Dato-range på publiseringsdato.
    if (from) query = query.gte("published_at", from);
    if (to) query = query.lte("published_at", to);

    if (tenderTypeParam) {
      const types = tenderTypeParam
        .split(",")
        .map((t) => t.trim())
        .filter((t) => isTenderType(t));
      if (types.length > 0) query = query.in("tender_type", types);
    }

    if (statusParam) {
      const statuses = statusParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => isPipelineStatus(s));
      if (statuses.length > 0) query = query.in("pipeline_status", statuses);
    }

    if (electricParam === "true") query = query.eq("is_electric", true);
    if (electricParam === "false") query = query.eq("is_electric", false);

    if (noticeKindParam) {
      const kinds = noticeKindParam
        .split(",")
        .map((k) => k.trim())
        .filter((k) => isNoticeKind(k));
      if (kinds.length > 0) query = query.in("notice_kind", kinds);
    }

    if (expiringSoon) {
      const now = new Date();
      const horizon = new Date(now);
      horizon.setMonth(horizon.getMonth() + EXPIRING_SOON_MONTHS);
      query = query
        .eq("notice_kind", "award")
        .not("contract_end_date", "is", null)
        .gte("contract_end_date", now.toISOString())
        .lte("contract_end_date", horizon.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      return apiError(
        "Kunne ikke hente anbud fra databasen",
        500,
        error.message,
        "GET /api/tenders",
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
    return apiError("Uventet serverfeil", 500, message, "GET /api/tenders");
  }
}
