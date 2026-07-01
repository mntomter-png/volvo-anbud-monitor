#!/usr/bin/env node
/**
 * Kjør SQL-migrasjon mot Supabase.
 *
 * Metode 1 (anbefalt): Supabase CLI med innlogging
 *   supabase login
 *   npm run db:migrate
 *
 * Metode 2: Personlig access token i .env.local
 *   SUPABASE_ACCESS_TOKEN=sbp_...  (fra https://supabase.com/dashboard/account/tokens)
 *   npm run db:migrate
 *
 * Metode 3: Direkte Postgres-URL i .env.local
 *   DATABASE_URL=postgresql://postgres.[ref]:[passord]@...
 *   npm run db:migrate -- supabase/migrations/20260627200000_award_contracts.sql
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const defaultMigration =
  "supabase/migrations/20260627200000_award_contracts.sql";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(root, ".env.local"));

const migrationPath = process.argv[2] ?? defaultMigration;
const sqlPath = resolve(root, migrationPath);

if (!existsSync(sqlPath)) {
  console.error(`Fant ikke migrasjonsfil: ${sqlPath}`);
  process.exit(1);
}

async function runWithPg(databaseUrl) {
  const { default: pg } = await import("pg");
  const sql = readFileSync(sqlPath, "utf8");
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query(sql);
    console.log(`✓ Migrasjon kjørt via DATABASE_URL: ${migrationPath}`);
  } finally {
    await client.end();
  }
}

function runWithSupabaseCli() {
  const result = spawnSync(
    "npx",
    ["supabase@2.108.0", "db", "query", "--linked", "-f", migrationPath],
    {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log(`✓ Migrasjon kjørt via Supabase CLI: ${migrationPath}`);
}

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;

if (databaseUrl) {
  await runWithPg(databaseUrl);
} else if (process.env.SUPABASE_ACCESS_TOKEN) {
  runWithSupabaseCli();
} else {
  // Prøv CLI uten token – fungerer hvis `supabase login` allerede er kjørt.
  const probe = spawnSync("npx", ["--yes", "supabase@2.108.0", "projects", "list"], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });
  if (probe.status === 0) {
    runWithSupabaseCli();
  } else {
    console.error(
      "Kan ikke kjøre migrasjon uten database-tilgang.\n\n" +
        "Velg én av disse:\n" +
        "  1. Kjør `npx supabase login`, deretter `npm run db:migrate`\n" +
        "  2. Legg SUPABASE_ACCESS_TOKEN i .env.local (Dashboard → Account → Access Tokens)\n" +
        "  3. Legg DATABASE_URL i .env.local (Dashboard → Project Settings → Database → URI)\n",
    );
    process.exit(1);
  }
}
