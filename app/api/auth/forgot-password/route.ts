import { NextResponse, type NextRequest } from "next/server";

import { resetUserPassword } from "@/lib/auth/reset-user-password";
import { getSiteUrl } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/forgot-password – send tilbakestillingslenke via Resend. */
export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Gyldig e-post kreves" }, { status: 400 });
  }

  const siteUrl = getSiteUrl();

  try {
    await resetUserPassword({
      email,
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
    });
  } catch (error) {
    // Ikke avslør om brukeren finnes – logg internt for feilsøking.
    console.error("[forgot-password] Kunne ikke sende lenke:", error);
  }

  return NextResponse.json({
    ok: true,
    message:
      "Hvis e-postadressen finnes i systemet, har vi sendt en lenke for å tilbakestille passordet.",
  });
}
