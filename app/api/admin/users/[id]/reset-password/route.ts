import { NextResponse, type NextRequest } from "next/server";

import { resetUserPassword } from "@/lib/auth/reset-user-password";
import { getSiteUrl, requireAdminProfile } from "@/lib/auth/session";
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
    return NextResponse.json(
      { error: "Kunne ikke hente bruker", details: error.message },
      { status: 500 },
    );
  }

  if (!profile?.email) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
  }

  const siteUrl = getSiteUrl();

  try {
    const { emailSent, actionLink } = await resetUserPassword({
      email: profile.email,
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
    });

    return NextResponse.json({
      ok: true,
      emailSent,
      actionLink,
      message: emailSent
        ? `Tilbakestillingslenke sendt til ${profile.email}. Kopier lenken under hvis e-posten ikke kommer frem.`
        : `Lenke generert for ${profile.email}, men e-post kunne ikke sendes. Kopier lenken under og send den manuelt.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
