/**
 * Rydd opp i eksisterende anbud etter truck-spissing:
 *  - fjern rader som ikke lenger er truck-relevante
 *  - re-klassifiser gjenværende (tender_type, is_electric)
 */

import { buildClassificationText, classifyTender } from "@/lib/classify-tender";
import {
  assessTruckRelevance,
  isTruckRelevant,
} from "@/lib/keywords";
import { TENDERS_TABLE } from "@/lib/supabase";
import type { TypedSupabaseClient } from "@/lib/supabase";
import type { TenderType } from "@/lib/pipeline";
import type { DoffinNotice } from "@/lib/types";

export interface ReconcileTruckTendersOptions {
  /** Kun rapporter – ingen skriving (standard). */
  dryRun?: boolean;
  /** Slett anbud som ikke er truck-relevante. */
  deleteIrrelevant?: boolean;
  /** Oppdater tender_type og is_electric for relevante anbud. */
  reclassify?: boolean;
}

export interface IrrelevantTenderSample {
  id: string;
  doffin_id: string;
  title: string | null;
  score: number;
  excludedKeywords: string[];
}

export interface ReconcileTruckTendersResult {
  ok: boolean;
  dryRun: boolean;
  total: number;
  relevant: number;
  irrelevant: number;
  deleted: number;
  reclassified: number;
  unchanged: number;
  irrelevantSamples: IrrelevantTenderSample[];
  error?: string;
}

function log(message: string, extra?: unknown) {
  const ts = new Date().toISOString();
  if (extra !== undefined) {
    console.log(`[reconcile-trucks] ${ts} ${message}`, extra);
  } else {
    console.log(`[reconcile-trucks] ${ts} ${message}`);
  }
}

function buildTenderText(row: {
  title: string | null;
  buyer: string | null;
  raw_data: unknown;
}): { text: string; cpvCodes?: string[] } {
  const raw = row.raw_data as DoffinNotice | null;
  const text = buildClassificationText({
    title: row.title,
    buyer: row.buyer,
    description: raw?.description,
    cpvCodes: raw?.cpvCodes,
  });
  return { text, cpvCodes: raw?.cpvCodes };
}

export async function reconcileTruckTenders(
  supabase: TypedSupabaseClient,
  options: ReconcileTruckTendersOptions = {},
): Promise<ReconcileTruckTendersResult> {
  const dryRun = options.dryRun ?? true;
  const deleteIrrelevant = options.deleteIrrelevant ?? true;
  const reclassify = options.reclassify ?? true;

  const { data: rows, error } = await supabase
    .from(TENDERS_TABLE)
    .select("id, doffin_id, title, buyer, raw_data, tender_type, is_electric");

  if (error) {
    return {
      ok: false,
      dryRun,
      total: 0,
      relevant: 0,
      irrelevant: 0,
      deleted: 0,
      reclassified: 0,
      unchanged: 0,
      irrelevantSamples: [],
      error: error.message,
    };
  }

  const allRows = rows ?? [];
  const toDelete: string[] = [];
  const irrelevantSamples: IrrelevantTenderSample[] = [];
  const toReclassify: {
    id: string;
    tender_type: TenderType;
    is_electric: boolean;
  }[] = [];

  for (const row of allRows) {
    const { text, cpvCodes } = buildTenderText(row);
    const relevance = assessTruckRelevance(text, cpvCodes);

    if (!isTruckRelevant(text, cpvCodes)) {
      toDelete.push(row.id);
      if (irrelevantSamples.length < 25) {
        irrelevantSamples.push({
          id: row.id,
          doffin_id: row.doffin_id,
          title: row.title,
          score: relevance.score,
          excludedKeywords: relevance.excludedKeywords,
        });
      }
      continue;
    }

    if (reclassify) {
      const { tender_type, is_electric } = classifyTender(text, cpvCodes);
      if (
        tender_type !== row.tender_type ||
        is_electric !== row.is_electric
      ) {
        toReclassify.push({ id: row.id, tender_type, is_electric });
      }
    }
  }

  let deleted = 0;
  let reclassified = 0;

  if (!dryRun && deleteIrrelevant && toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from(TENDERS_TABLE)
      .delete()
      .in("id", toDelete);

    if (deleteError) {
      return {
        ok: false,
        dryRun,
        total: allRows.length,
        relevant: allRows.length - toDelete.length,
        irrelevant: toDelete.length,
        deleted: 0,
        reclassified: 0,
        unchanged: allRows.length - toDelete.length - toReclassify.length,
        irrelevantSamples,
        error: `Sletting feilet: ${deleteError.message}`,
      };
    }
    deleted = toDelete.length;
    log(`Slettet ${deleted} irrelevante anbud`);
  } else if (dryRun && deleteIrrelevant) {
    deleted = toDelete.length;
  }

  if (!dryRun && reclassify) {
    for (const update of toReclassify) {
      const { error: updateError } = await supabase
        .from(TENDERS_TABLE)
        .update({
          tender_type: update.tender_type,
          is_electric: update.is_electric,
        })
        .eq("id", update.id);

      if (!updateError) reclassified += 1;
    }
    if (reclassified > 0) log(`Re-klassifiserte ${reclassified} anbud`);
  } else if (dryRun && reclassify) {
    reclassified = toReclassify.length;
  }

  const relevant = allRows.length - toDelete.length;
  const unchanged = relevant - (dryRun ? toReclassify.length : reclassified);

  return {
    ok: true,
    dryRun,
    total: allRows.length,
    relevant,
    irrelevant: toDelete.length,
    deleted,
    reclassified,
    unchanged,
    irrelevantSamples,
  };
}
