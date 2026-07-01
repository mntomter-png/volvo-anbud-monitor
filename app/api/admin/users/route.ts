import { NextResponse, type NextRequest } from "next/server";

import { getSiteUrl, requireAdminProfile } from "@/lib/auth/session";
import { inviteUser } from "@/lib/auth/invite-user";
import { isUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/users – list alle profiler (kun admin). */
export async function GET() {
  const auth = await requireAdminProfile();
  if (auth.error) return auth.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Kunne ikke hente brukere", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

/** POST /api/admin/users – inviter ny bruker via e-post. */
export async function POST(request: NextRequest) {
  const auth = await requireAdminProfile();
  if (auth.error) return auth.error;

  let body: { email?: string; full_name?: string; role?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Gyldig e-post kreves" }, { status: 400 });
  }

  const role = body.role && isUserRole(body.role) ? body.role : "user";
  const fullName = body.full_name?.trim() || null;
  const siteUrl = getSiteUrl();

  try {
    const { emailSent } = await inviteUser({
      email,
      fullName,
      role,
      invitedBy: auth.user!.id,
      redirectTo: `${siteUrl}/auth/callback?next=/auth/set-password`,
    });

    return NextResponse.json({
      ok: true,
      message: emailSent
        ? `Invitasjon sendt til ${email}.`
        : `Bruker opprettet for ${email}, men e-post kunne ikke sendes (sjekk RESEND_API_KEY).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
