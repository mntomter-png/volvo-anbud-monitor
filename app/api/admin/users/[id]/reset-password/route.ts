import { NextResponse, type NextRequest } from "next/server";

import { resetUserPassword } from "@/lib/auth/reset-user-password";
import { getSiteUrl, requireAdminProfile } from "@/lib/auth/session";
import { apiError } from "@/lib/security/api-error";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/admin/users/[id]/reset-password – send tilbakestillingslenke til bruker. */
export async function POST(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminProfile();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return apiError(
      "Kunne ikke hente bruker",
      500,
      error.message,
      "POST /api/admin/users/[id]/reset-password",
    );
  }

  if (!profile?.email) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
  }

  const siteUrl = getSiteUrl();

  try {
    const { emailSent } = await resetUserPassword({
      email: profile.email,
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
    });

    return NextResponse.json({
      ok: true,
      emailSent,
      message: emailSent
        ? `Tilbakestillingslenke sendt til ${profile.email}.`
        : `Kunne ikke sende e-post til ${profile.email}. Sjekk Resend-oppsett og prøv igjen.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return apiError(
      "Kunne ikke sende tilbakestillingslenke",
      400,
      message,
      "POST /api/admin/users/[id]/reset-password",
    );
  }
}
