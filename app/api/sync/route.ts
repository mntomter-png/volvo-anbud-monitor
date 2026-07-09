import { NextResponse } from "next/server";

import { requireAdminProfile } from "@/lib/auth/session";
import { runTenderSync } from "@/lib/run-tender-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/sync
 *
 * Manuell oppdatering fra dashboard («Hent nye anbud nå»). Kun administratorer.
 */
export async function POST() {
  const auth = await requireAdminProfile();
  if (auth.error) return auth.error;

  const result = await runTenderSync();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
