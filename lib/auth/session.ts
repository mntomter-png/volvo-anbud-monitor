import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
}

export async function getSessionProfile() {
  const user = await getAuthUser();
  if (!user) return { user: null, profile: null };
  const profile = await getProfile(user.id);
  return { user, profile };
}

export async function requireAuthProfile() {
  const session = await getSessionProfile();
  if (!session.user || !session.profile) {
    return { error: NextResponse.json({ error: "Innlogging kreves" }, { status: 401 }) };
  }
  return { ...session, error: null };
}

export async function requireAdminProfile() {
  const session = await requireAuthProfile();
  if (session.error) return session;
  if (session.profile!.role !== "admin") {
    return {
      ...session,
      error: NextResponse.json({ error: "Kun administratorer har tilgang" }, { status: 403 }),
    };
  }
  return session;
}

export function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  // Netlify setter URL/DEPLOY_PRIME_URL automatisk i produksjon.
  const netlify =
    process.env.DEPLOY_PRIME_URL ?? process.env.URL ?? process.env.DEPLOY_URL;
  if (netlify) return netlify.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
