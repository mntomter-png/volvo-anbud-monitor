/**
 * Domenekonfigurasjon for anbud-monitoren (Volvo Trucks):
 *  - TRUCK_KEYWORDS: nøkkelord for tunglastebil der Volvo eller Renault kan levere
 *  - TRUCK_EXCLUDE_KEYWORDS: støy (buss, anleggsmaskin, ren transport m.m.)
 *  - REGIONS: de fire regionene vi overvåker
 *  - CPV_CODES: relevante CPV-koder for tunge lastebiler og ettermarked
 */

/** Sterke signaler for tunglastebil / truck-relevans. */
export const TRUCK_KEYWORDS: string[] = [
  "lastebil",
  "lastebiler",
  "tungbil",
  "tungtransport",
  "tunglastebil",
  "trekkvogn",
  "semitrailer",
  "tippbil",
  "kranbil",
  "krokbil",
  "renovasjonsbil",
  "volvo trucks",
  "volvo truck",
  "renault trucks",
  "renault truck",
  "volvo fh",
  "volvo fm",
  "volvo fmx",
  "volvo fe",
  "volvo fl",
  "renault t",
  "renault c",
  "renault k",
  "e-tech",
  "flåtefornyelse",
  "leasing av kjøretøy",
  "leasing av lastebil",
  "anskaffelse av lastebil",
  "kjøp av lastebil",
  "nye lastebil",
  "ny lastebil",
  "reservedel",
  "reservedeler",
  "vedlikehold",
  "verksted",
  "serviceavtale",
  "flåte",
  "dieselmotor",
  "drivlinje",
  "el-lastebil",
  "nullutslipp",
];

/** Nøkkelord som indikerer at anbudet ikke er relevant for Trucks. */
export const TRUCK_EXCLUDE_KEYWORDS: string[] = [
  "buss",
  "busser",
  "minibuss",
  "bybuss",
  "skolebuss",
  "anleggsmaskin",
  "anleggsmaskiner",
  "gravemaskin",
  "gravemaskiner",
  "hjullaster",
  "hjullastere",
  "personbil",
  "personbiler",
  "varebil",
  "varebiler",
  "kollektivtransport",
  "skoleskyss",
  "persontransport",
  "volvo ce",
  "volvo penta",
  "volvo bus",
  "byggmaskin",
  "landbruksmaskin",
  "traktor",
];

/** @deprecated Bruk TRUCK_KEYWORDS – beholdt for bakoverkompatibilitet. */
export const VOLVO_KEYWORDS = TRUCK_KEYWORDS;

/**
 * Et delsett av de mest spesifikke nøkkelordene som brukes ved API-søk mot Doffin.
 */
export const SEARCH_KEYWORDS: string[] = [
  "lastebil",
  "tungbil",
  "tungtransport",
  "trekkvogn",
  "volvo trucks",
  "renault trucks",
  "renovasjonsbil",
  "kranbil",
  "semitrailer",
  "reservedeler",
];

/** CPV-koder for tunge lastebiler og truck-ettermarked (ikke anleggsmaskiner). */
export const CPV_CODES: string[] = [
  "34130000", // Motorkjøretøy for godstransport
  "34140000", // Tunge motorkjøretøy
  "34144000", // Spesialkjøretøy
  "34144510", // Renovasjonskjøretøy
  "34330000", // Reservedeler til lastebiler/busser
  "50110000", // Reparasjon/vedlikehold av motorkjøretøy
];

const TRUCK_CPV_CODES = new Set(CPV_CODES);

const TRUCK_SIGNAL_SCORES: Record<string, number> = {
  lastebil: 10,
  lastebiler: 10,
  tungbil: 10,
  tungtransport: 9,
  tunglastebil: 10,
  trekkvogn: 9,
  semitrailer: 8,
  tippbil: 8,
  kranbil: 8,
  krokbil: 8,
  renovasjonsbil: 8,
  "volvo trucks": 12,
  "volvo truck": 12,
  "renault trucks": 12,
  "renault truck": 12,
  "volvo fh": 10,
  "volvo fm": 10,
  "volvo fmx": 10,
  "volvo fe": 9,
  "volvo fl": 9,
  "renault t": 8,
  "renault c": 8,
  "renault k": 8,
  "e-tech": 8,
  flåtefornyelse: 9,
  "leasing av kjøretøy": 7,
  "leasing av lastebil": 10,
  "anskaffelse av lastebil": 10,
  "kjøp av lastebil": 10,
  "nye lastebil": 10,
  "ny lastebil": 10,
  reservedel: 5,
  reservedeler: 5,
  vedlikehold: 4,
  verksted: 4,
  serviceavtale: 4,
  flåte: 3,
  dieselmotor: 4,
  drivlinje: 4,
  "el-lastebil": 9,
  nullutslipp: 5,
};

const PURCHASE_SIGNALS = [
  "kjøp av",
  "anskaffelse",
  "innkjøp av",
  "leveranse av",
  "levering av",
  "leasing",
  "flåtefornyelse",
  "nye lastebil",
  "ny lastebil",
  "erstatning av kjøretøy",
  "utskifting av kjøretøy",
];

const TRANSPORT_ONLY_SIGNALS = [
  "transporttjeneste",
  "transporttjenester",
  "transport av",
  "renovasjonsdrift",
  "brøyting",
  "brøytetjeneste",
  "rutedrift",
  "kjøring av",
  "avfallshenting",
  "renovasjonskjøring",
  "drift av transport",
  "varetransport",
];

const VOLVO_NON_TRUCK_SIGNALS = ["volvo ce", "volvo penta", "volvo bus"];

const VOLVO_BRAND_SIGNALS = [
  "volvo trucks",
  "volvo truck",
  "volvo fh",
  "volvo fm",
  "volvo fmx",
  "volvo fe",
  "volvo fl",
];

const RENAULT_BRAND_SIGNALS = [
  "renault trucks",
  "renault truck",
  "renault t",
  "renault c",
  "renault k",
  "e-tech",
];

/** Minimum poengsum for at et anbud regnes som truck-relevant. */
export const TRUCK_RELEVANCE_MIN_SCORE = 5;

export type TruckBrand = "volvo" | "renault";

export interface TruckRelevanceResult {
  relevant: boolean;
  score: number;
  matchedKeywords: string[];
  excludedKeywords: string[];
  brandSignals: TruckBrand[];
}

export interface RegionConfig {
  name: string;
  locationIds: string[];
  matchers: string[];
}

/** De fire regionene applikasjonen overvåker. */
export const REGIONS: RegionConfig[] = [
  {
    name: "Oslo",
    locationIds: [],
    matchers: ["oslo"],
  },
  {
    name: "Akershus",
    locationIds: [],
    matchers: [
      "akershus",
      "bærum",
      "asker",
      "lillestrøm",
      "lørenskog",
      "nordre follo",
      "ski",
      "ullensaker",
      "jessheim",
      "nittedal",
      "rælingen",
      "enebakk",
      "aurskog-høland",
      "gjerdrum",
      "nannestad",
      "eidsvoll",
      "hurdal",
      "ås",
      "frogn",
      "drøbak",
      "nesodden",
      "vestby",
    ],
  },
  {
    name: "Buskerud",
    locationIds: [],
    matchers: [
      "buskerud",
      "drammen",
      "kongsberg",
      "ringerike",
      "hønefoss",
      "hole",
      "lier",
      "øvre eiker",
      "hokksund",
      "modum",
      "vikersund",
      "krødsherad",
      "flesberg",
      "rollag",
      "nore og uvdal",
      "sigdal",
      "flå",
      "nesbyen",
      "gol",
      "hemsedal",
      "ål ",
      "hol ",
    ],
  },
  {
    name: "Innlandet",
    locationIds: [],
    matchers: [
      "innlandet",
      "hamar",
      "lillehammer",
      "gjøvik",
      "elverum",
      "kongsvinger",
      "ringsaker",
      "brumunddal",
      "moelv",
      "stange",
      "løten",
      "trysil",
      "åmot",
      "tynset",
      "gausdal",
      "øyer",
      "sel",
      "otta",
      "vågå",
      "lom",
      "skjåk",
      "dovre",
      "lesja",
      "ringebu",
      "nord-fron",
      "sør-fron",
      "nordre land",
      "søndre land",
      "dokka",
      "gran",
      "lunner",
      "jevnaker",
      "eidskog",
      "grue",
      "åsnes",
      "nord-odal",
      "sør-odal",
      "stor-elvdal",
      "rendalen",
      "engerdal",
      "folldal",
      "tolga",
      "alvdal",
    ],
  },
];

export const REGION_NAMES = REGIONS.map((r) => r.name);
export type RegionName = (typeof REGION_NAMES)[number];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesWholeWord(haystack: string, needle: string): boolean {
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`,
    "u",
  );
  return re.test(haystack);
}

export function matchesWordPrefix(haystack: string, needle: string): boolean {
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}`,
    "u",
  );
  return re.test(haystack);
}

function hasAnySignal(haystack: string, signals: string[]): boolean {
  return signals.some((signal) => matchesWordPrefix(haystack, signal));
}

function scoreCpv(cpvCodes: string[] | undefined): number {
  if (!cpvCodes?.length) return 0;
  const hits = cpvCodes.filter((code) => TRUCK_CPV_CODES.has(code)).length;
  return hits > 0 ? 6 + hits * 2 : 0;
}

function hasTruckContext(haystack: string, matchedKeywords: string[]): boolean {
  const strongTruckSignals = [
    "lastebil",
    "lastebiler",
    "tungbil",
    "tungtransport",
    "tunglastebil",
    "trekkvogn",
    "semitrailer",
    "tippbil",
    "kranbil",
    "krokbil",
    "renovasjonsbil",
    "volvo trucks",
    "renault trucks",
    "volvo fh",
    "volvo fm",
    "volvo fmx",
    "el-lastebil",
  ];
  return (
    matchedKeywords.some((kw) => strongTruckSignals.includes(kw)) ||
    hasAnySignal(haystack, strongTruckSignals)
  );
}

/**
 * Avgjør om et anbud er relevant for Volvo Trucks (tunglastebil, Volvo/Renault).
 */
export function assessTruckRelevance(
  text: string,
  cpvCodes?: string[],
): TruckRelevanceResult {
  const haystack = text.toLowerCase();

  const matchedKeywords = TRUCK_KEYWORDS.filter((kw) =>
    matchesWordPrefix(haystack, kw.toLowerCase()),
  );

  const excludedKeywords = TRUCK_EXCLUDE_KEYWORDS.filter((kw) =>
    matchesWordPrefix(haystack, kw.toLowerCase()),
  );

  let score = matchedKeywords.reduce(
    (sum, kw) => sum + (TRUCK_SIGNAL_SCORES[kw] ?? 4),
    0,
  );
  score += scoreCpv(cpvCodes);

  const truckContext = hasTruckContext(haystack, matchedKeywords);
  const hasPurchaseSignal = hasAnySignal(haystack, PURCHASE_SIGNALS);
  const hasTransportOnlySignal = hasAnySignal(haystack, TRANSPORT_ONLY_SIGNALS);
  const hasVolvoNonTruck = hasAnySignal(haystack, VOLVO_NON_TRUCK_SIGNALS);

  if (hasVolvoNonTruck && !truckContext) {
    score -= 12;
  }

  if (excludedKeywords.length > 0 && !truckContext) {
    score -= 15;
  }

  if (hasTransportOnlySignal && !hasPurchaseSignal && !truckContext) {
    score -= 10;
  }

  if (
    matchesWordPrefix(haystack, "volvo") &&
    !hasAnySignal(haystack, VOLVO_BRAND_SIGNALS) &&
    !truckContext
  ) {
    score += 1;
  }

  if (
    matchesWordPrefix(haystack, "renovasjon") &&
    !matchesWordPrefix(haystack, "renovasjonsbil") &&
    !matchesWordPrefix(haystack, "renovasjonskjøretøy") &&
    !truckContext
  ) {
    score -= 6;
  }

  const brandSignals = detectTruckBrandSignals(text);

  const relevant = score >= TRUCK_RELEVANCE_MIN_SCORE;

  return {
    relevant,
    score,
    matchedKeywords,
    excludedKeywords,
    brandSignals,
  };
}

export function isTruckRelevant(text: string, cpvCodes?: string[]): boolean {
  return assessTruckRelevance(text, cpvCodes).relevant;
}

export function matchTruckKeywords(text: string): string[] {
  return assessTruckRelevance(text).matchedKeywords;
}

/** @deprecated Bruk matchTruckKeywords. */
export function matchVolvoKeywords(text: string): string[] {
  return matchTruckKeywords(text);
}

/** Finn merke-signaler (Volvo Trucks / Renault Trucks) i tekst. */
export function detectTruckBrandSignals(text: string): TruckBrand[] {
  const haystack = text.toLowerCase();
  const brands = new Set<TruckBrand>();

  if (
    hasAnySignal(haystack, VOLVO_BRAND_SIGNALS) ||
    (matchesWordPrefix(haystack, "volvo") && !hasAnySignal(haystack, VOLVO_NON_TRUCK_SIGNALS))
  ) {
    brands.add("volvo");
  }

  if (
    hasAnySignal(haystack, RENAULT_BRAND_SIGNALS) ||
    matchesWordPrefix(haystack, "renault")
  ) {
    brands.add("renault");
  }

  return Array.from(brands);
}

export function detectRegion(text: string): RegionName | null {
  const haystack = text.toLowerCase();
  for (const region of REGIONS) {
    if (
      region.matchers.some((m) =>
        matchesWholeWord(haystack, m.toLowerCase().trim()),
      )
    ) {
      return region.name;
    }
  }
  return null;
}
