/**
 * Backfill av tender_type og is_electric for eksisterende rader.
 * Kjøres etter sync og ved behov.
 */

import { buildClassificationText, classifyTender } from "@/lib/classify-tender";
import { createServerSupabase, TENDERS_TABLE } from "@/lib/supabase";
import type { DoffinNotice } from "@/lib/types";

function log(message: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra !== undefined) {
    console.log(`[backfill] ${ts} ${message}`, extra);
  } else {
    console.log(`[backfill] ${ts} ${message}`);
  }
}

/** Oppdater klassifisering for rader som mangler type eller el-flagg. */
export async function backfillTenderClassification(): Promise<number> {
  const supabase = createServerSupabase();

  const { data: rows, error } = await supabase
    .from(TENDERS_TABLE)
    .select("id, title, buyer, raw_data, tender_type, is_electric")
    .eq("tender_type", "unknown");

  if (error) {
    log("Kunne ikke lese anbud for backfill", error.message);
    return 0;
  }

  if (!rows?.length) return 0;

  let updated = 0;

  for (const row of rows) {
    const raw = row.raw_data as DoffinNotice | null;
    const text = buildClassificationText({
      title: row.title,
      buyer: row.buyer,
      description: raw?.description,
      cpvCodes: raw?.cpvCodes,
    });

    const { tender_type, is_electric } = classifyTender(text, raw?.cpvCodes);

    const { error: updateError } = await supabase
      .from(TENDERS_TABLE)
      .update({ tender_type, is_electric })
      .eq("id", row.id);

    if (!updateError) updated += 1;
  }

  if (updated > 0) log(`Klassifiserte ${updated} eksisterende anbud`);
  return updated;
}
