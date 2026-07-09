import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

/** Typet Supabase-klient for dette prosjektet. */
export type TypedSupabaseClient = SupabaseClient<Database>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Valgfri service-role-nøkkel. Anbefales for server-side skriving slik at
// man kan ha streng RLS på tabellen. Faller tilbake til anon-nøkkelen.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Mangler miljøvariabel «${name}». Sett den i .env.local / hosting-miljøet.`,
    );
  }
  return value;
}

/**
 * Klient for bruk i nettleseren (client components). Bruker anon-nøkkelen og
 * er underlagt RLS-policyene i databasen.
 */
export function createBrowserSupabase(): TypedSupabaseClient {
  return createClient<Database>(
    assertEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    assertEnv(supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false },
    },
  );
}

/**
 * Klient for bruk på server (route handlers / cron-jobber). Bruker
 * service-role-nøkkelen hvis den finnes (omgår RLS), ellers anon-nøkkelen.
 */
export function createServerSupabase(): TypedSupabaseClient {
  if (process.env.NODE_ENV === "production" && !supabaseServiceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY er påkrevd i produksjon.",
    );
  }

  const key = supabaseServiceKey ?? supabaseAnonKey;
  return createClient<Database>(
    assertEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    assertEnv(key, "SUPABASE_SERVICE_ROLE_KEY eller NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** Navn på tabellen som lagrer anbud. */
export const TENDERS_TABLE = "tenders" as const;
