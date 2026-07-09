import { NextResponse, type NextRequest } from "next/server";

import { isLastAdmin } from "@/lib/auth/admin-guards";
import { requireAdminProfile } from "@/lib/auth/session";
import { isUserRole } from "@/lib/auth/roles";
import { apiError } from "@/lib/security/api-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/admin/users/[id] – oppdater rolle eller navn. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminProfile();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  let body: { role?: string; full_name?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const updates: { role?: "user" | "admin"; full_name?: string | null } = {};
  if (body.role !== undefined) {
    if (!isUserRole(body.role)) {
      return NextResponse.json({ error: "Ugyldig rolle" }, { status: 400 });
    }
    updates.role = body.role;
  }
  if (body.full_name !== undefined) {
    updates.full_name = body.full_name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Ingen felter å oppdatere" }, { status: 400 });
  }

  const supabase = await createClient();

  if (updates.role === "user" && (await isLastAdmin(supabase, id))) {
    return NextResponse.json(
      { error: "Kan ikke fjerne siste administrator" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return apiError(
      "Kunne ikke oppdatere bruker",
      500,
      error.message,
      "PATCH /api/admin/users/[id]",
    );
  }

  return NextResponse.json({ data });
}

/** DELETE /api/admin/users/[id] – slett bruker. */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminProfile();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (id === auth.user!.id) {
    return NextResponse.json(
      { error: "Du kan ikke slette din egen konto" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  if (await isLastAdmin(supabase, id)) {
    return NextResponse.json(
      { error: "Kan ikke slette siste administrator" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return apiError(
      "Kunne ikke slette bruker",
      400,
      error.message,
      "DELETE /api/admin/users/[id]",
    );
  }

  return NextResponse.json({ ok: true });
}
