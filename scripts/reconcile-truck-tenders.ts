#!/usr/bin/env node
/**
 * Rydd opp i eksisterende anbud etter truck-spissing.
 *
 * Dry-run (standard):
 *   npm run db:reconcile-trucks
 *
 * Kjør faktisk sletting + re-klassifisering:
 *   npm run db:reconcile-trucks -- --apply
 *
 * Kun re-klassifisere (ingen sletting):
 *   npm run db:reconcile-trucks -- --apply --reclassify-only
 *
 * Kun slette irrelevante:
 *   npm run db:reconcile-trucks -- --apply --delete-only
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { reconcileTruckTenders } from "../lib/reconcile-truck-tenders";
import type { Database } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnvFile(resolve(root, ".env.local"));

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const deleteOnly = args.has("--delete-only");
const reclassifyOnly = args.has("--reclassify-only");

if (deleteOnly && reclassifyOnly) {
  console.error("Bruk enten --delete-only eller --reclassify-only, ikke begge.");
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL i .env.local");
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Mangler SUPABASE_SERVICE_ROLE_KEY – sletting krever service role.",
  );
  process.exit(1);
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const result = await reconcileTruckTenders(supabase, {
    dryRun: !apply,
    deleteIrrelevant: !reclassifyOnly,
    reclassify: !deleteOnly,
  });

  if (!result.ok) {
    console.error("Feil:", result.error);
    process.exit(1);
  }

  const mode = result.dryRun ? "DRY-RUN" : "APPLY";
  console.log(`\n=== Reconcile truck-anbud (${mode}) ===\n`);
  console.log(`Totalt i databasen:     ${result.total}`);
  console.log(`Truck-relevante:        ${result.relevant}`);
  console.log(`Ikke lenger relevante:  ${result.irrelevant}`);
  console.log(
    result.dryRun
      ? `Ville slettet:         ${result.deleted}`
      : `Slettet:               ${result.deleted}`,
  );
  console.log(
    result.dryRun
      ? `Ville re-klassifisert: ${result.reclassified}`
      : `Re-klassifisert:       ${result.reclassified}`,
  );
  console.log(`Uendret (relevante):   ${result.unchanged}`);

  if (result.irrelevantSamples.length > 0) {
    console.log("\nEksempler på anbud som fjernes:");
    for (const sample of result.irrelevantSamples) {
      const title = sample.title ?? "(uten tittel)";
      const excluded =
        sample.excludedKeywords.length > 0
          ? ` · ekskludert: ${sample.excludedKeywords.join(", ")}`
          : "";
      console.log(
        `  - [score ${sample.score}] ${title.slice(0, 80)}${excluded}`,
      );
    }
    if (result.irrelevant > result.irrelevantSamples.length) {
      console.log(
        `  … og ${result.irrelevant - result.irrelevantSamples.length} til`,
      );
    }
  }

  if (result.dryRun && (result.deleted > 0 || result.reclassified > 0)) {
    console.log(
      "\nKjør med --apply for å utføre endringene: npm run db:reconcile-trucks -- --apply",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
