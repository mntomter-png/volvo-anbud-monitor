/**
 * Automatisk kategorisering av anbud for KAM/Fleet Sales.
 * Bruker nøkkelord i tittel, beskrivelse og CPV-koder.
 */

import type { TenderType } from "@/lib/pipeline";
import { matchesWordPrefix } from "@/lib/keywords";

export interface TenderClassification {
  tender_type: TenderType;
  is_electric: boolean;
}

const DIRECT_PURCHASE_KEYWORDS = [
  "kjøp av",
  "anskaffelse",
  "innkjøp av",
  "leveranse av",
  "levering av",
  "leasing av kjøretøy",
  "leasing av lastebil",
  "flåtefornyelse",
  "nye lastebil",
  "ny lastebil",
  "erstatning av kjøretøy",
  "utskifting av kjøretøy",
  "anskaffelse av lastebil",
  "kjøp/leasing",
  "lastebil",
  "tungbil",
  "tunglastebil",
  "tippbil",
  "kranbil",
  "krokbil",
  "renovasjonsbil",
  "trekkvogn",
  "semitrailer",
  "volvo trucks",
  "renault trucks",
];

const TRANSPORT_SERVICE_KEYWORDS = [
  "transporttjeneste",
  "transport av",
  "transporttjenester",
  "renovasjon",
  "renovasjonsdrift",
  "brøyting",
  "brøytetjeneste",
  "distribusjon",
  "logistikk",
  "frakt",
  "kjøring av",
  "rutedrift",
  "kollektivtransport",
  "henting og levering",
  "tømming",
  "varetransport",
  "avfallshenting",
  "renovasjonskjøring",
  "skoleskyss",
  "persontransport",
  "drift av transport",
];

const SERVICE_PARTS_KEYWORDS = [
  "vedlikehold",
  "verksted",
  "reservedel",
  "reservedeler",
  "reparasjon",
  "serviceavtale",
  "rammeavtale på service",
  "rammeavtale service",
  "ettermarked",
  "dekk",
  "oljeskift",
  "service på lastebil",
  "vedlikehold av lastebil",
  "vedlikeholdsavtale",
  "reparasjon av lastebil",
  "lastebilverksted",
];

const ELECTRIC_KEYWORDS = [
  "elektrisk",
  "el-lastebil",
  "el-lastebiler",
  "nullutslipp",
  "utslippsfri",
  "utslippsfrie",
  "batteri",
  "hydrogen",
  "fossilfri",
  "zero emission",
  "emobilitet",
  "miljøvennlig kjøretøy",
  "co2-reduksjon",
  "elektrifisering",
];

/** CPV-koder som styrker klassifisering. */
const CPV_DIRECT = new Set([
  "34130000",
  "34140000",
  "34144000",
  "34144510",
]);

const CPV_SERVICE = new Set(["50110000", "34330000"]);

function countKeywordHits(haystack: string, keywords: string[]): number {
  return keywords.filter((kw) => matchesWordPrefix(haystack, kw)).length;
}

function scoreCpv(cpvCodes: string[] | undefined, codes: Set<string>): number {
  if (!cpvCodes?.length) return 0;
  return cpvCodes.filter((c) => codes.has(c)).length;
}

/**
 * Klassifiser et anbud ut fra tekst og valgfrie CPV-koder.
 * Ved likt antall treff prioriteres direkte kjøp > service > transport.
 */
export function classifyTender(
  text: string,
  cpvCodes?: string[],
): TenderClassification {
  const haystack = text.toLowerCase();

  const scores: Record<Exclude<TenderType, "unknown">, number> = {
    direct_purchase:
      countKeywordHits(haystack, DIRECT_PURCHASE_KEYWORDS) +
      scoreCpv(cpvCodes, CPV_DIRECT) * 2,
    transport_service: countKeywordHits(haystack, TRANSPORT_SERVICE_KEYWORDS),
    service_parts:
      countKeywordHits(haystack, SERVICE_PARTS_KEYWORDS) +
      scoreCpv(cpvCodes, CPV_SERVICE) * 2,
  };

  const ranked = (
    Object.entries(scores) as [Exclude<TenderType, "unknown">, number][]
  ).sort((a, b) => b[1] - a[1]);

  const [bestType, bestScore] = ranked[0] ?? ["unknown", 0];

  const is_electric = ELECTRIC_KEYWORDS.some((kw) =>
    matchesWordPrefix(haystack, kw),
  );

  if (bestScore === 0) {
    return { tender_type: "unknown", is_electric };
  }

  return { tender_type: bestType, is_electric };
}

/** Bygg klassifiseringstekst fra felter vi har lagret eller fra Doffin-raw. */
export function buildClassificationText(parts: {
  title?: string | null;
  buyer?: string | null;
  description?: string | null;
  cpvCodes?: string[];
}): string {
  return [parts.title, parts.buyer, parts.description].filter(Boolean).join(" ");
}
