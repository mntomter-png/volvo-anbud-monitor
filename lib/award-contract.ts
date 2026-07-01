/**
 * Parsing av tildelingskunngjøringer og estimert kontraktslutt.
 */

import type { DoffinNotice } from "@/lib/types";

/** Doffin notice-typer som representerer tildeling/kontraktsinngåelse. */
const AWARD_NOTICE_TYPES = new Set([
  "RESULT",
  "ANNOUNCEMENT_OF_CONCLUSION_OF_CONTRACT",
]);

export function isAwardNotice(notice: DoffinNotice): boolean {
  if (notice.type && AWARD_NOTICE_TYPES.has(notice.type)) return true;
  return (notice.allTypes ?? []).some((t) => AWARD_NOTICE_TYPES.has(t));
}

/** Hent vinnernavn fra lots.winner (første treff). */
export function extractWinnerName(notice: DoffinNotice): string | null {
  for (const lot of notice.lots ?? []) {
    const name = lot.winner?.find((w) => w.name)?.name;
    if (name) return name;
  }
  return null;
}

/**
 * Forsøk å utlede kontraktsvarighet i måneder fra beskrivelse/tittel.
 * Matcher f.eks. «4 år», «48 måneder», «36 mnd».
 */
export function extractContractDurationMonths(text: string): number | null {
  const haystack = text.toLowerCase();

  const yearMatch = haystack.match(/(\d{1,2})\s*(?:års?|år)\b/);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 12;

  const monthMatch = haystack.match(/(\d{1,3})\s*(?:måned(?:er)?|mnd\.?)\b/);
  if (monthMatch) return parseInt(monthMatch[1], 10);

  return null;
}

/** Beregn estimert kontraktslutt ut fra tildelingsdato + varighet. */
export function calculateContractEndDate(
  awardDate: string | null | undefined,
  durationMonths: number | null,
): string | null {
  if (!awardDate || !durationMonths) return null;
  const d = new Date(awardDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + durationMonths);
  return d.toISOString();
}

/** Bygg tekst for varighets-parsing fra et Doffin-treff. */
export function buildAwardText(notice: DoffinNotice): string {
  return [
    notice.heading,
    notice.description,
    ...(notice.lots ?? []).map((l) => [l.heading, l.description].join(" ")),
  ]
    .filter(Boolean)
    .join(" ");
}
