import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

type Client = SupabaseClient<Database>;

export async function countAdmins(supabase: Client): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  if (error) {
    console.error("[admin-guards] Kunne ikke telle admins:", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function isLastAdmin(
  supabase: Client,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.role !== "admin") return false;

  const adminCount = await countAdmins(supabase);
  return adminCount <= 1;
}
