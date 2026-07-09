import { NextResponse, type NextRequest } from "next/server";

import { runTenderSync } from "@/lib/run-tender-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[notifications] CRON_SECRET mangler – avviser forespørsel");
      return false;
    }
    return true;
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/notifications
 *
 * Daglig cron-jobb (Netlify scheduled function). Krever CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const result = await runTenderSync();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
