import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

/** Returnerer API-feil. Detaljer logges server-side og vises kun i utvikling. */
export function apiError(
  message: string,
  status: number,
  details?: string,
  logPrefix?: string,
): NextResponse {
  if (details) {
    console.error(logPrefix ? `[${logPrefix}] ${details}` : details);
  }

  const body: { error: string; details?: string } = { error: message };
  if (!isProd && details) {
    body.details = details;
  }

  return NextResponse.json(body, { status });
}
