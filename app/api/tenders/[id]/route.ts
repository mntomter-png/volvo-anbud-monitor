import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabase, TENDERS_TABLE } from "@/lib/supabase";
import { isPipelineStatus } from "@/lib/pipeline";
import type { TenderPipelineUpdate, TenderRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/tenders/[id]
 *
 * Oppdater pipeline-felter (status, ansvarlig) fra dashboardet.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as TenderPipelineUpdate;

    const updates: TenderPipelineUpdate = {};

    if (body.pipeline_status !== undefined) {
      if (!isPipelineStatus(body.pipeline_status)) {
        return NextResponse.json(
          { error: "Ugyldig pipeline_status" },
          { status: 400 },
        );
      }
      updates.pipeline_status = body.pipeline_status;
    }

    if (body.assignee !== undefined) {
      const trimmed = body.assignee?.trim() ?? "";
      updates.assignee =
        trimmed === "" || trimmed === "Ikke tildelt" ? null : trimmed;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Ingen felter å oppdatere" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from(TENDERS_TABLE)
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[PATCH /api/tenders/[id]] Supabase-feil:", error.message);
      return NextResponse.json(
        { error: "Kunne ikke oppdatere anbud", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: data as TenderRow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json(
      { error: "Uventet serverfeil", details: message },
      { status: 500 },
    );
  }
}
