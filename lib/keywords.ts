/**
 * Domenekonfigurasjon for anbud-monitoren:
 *  - VOLVO_KEYWORDS: sterke nøkkelord for anbud der Volvo (tungtransport,
 *    lastebiler, service, reservedeler, anleggsmaskiner) er relevant.
 *  - REGIONS: de fire regionene vi overvåker + tekst-baserte "matchers"
 *    som brukes til å avgjøre hvilken region et anbud tilhører.
 *  - CPV_CODES: relevante CPV-koder (kjøretøy/transport/anleggsmaskiner).
 */

/** Nøkkelord som indikerer at et anbud er relevant for Volvo. */
export const VOLVO_KEYWORDS: string[] = [
  "lastebil",
  "lastebiler",
  "tungbil",
  "tungtransport",
  "volvo",
  "reservedel",
  "reservedeler",
  "service",
  "vedlikehold",
  "verksted",
  "flåte",
  "flåtestyring",
  "kjøretøy",
  "nyttekjøretøy",
  "anleggsmaskin",
  "anleggsmaskiner",
  "hjullaster",
  "gravemaskin",
  "dumper",
  "dumptruck",
  "semitrailer",
  "trekkvogn",
  "tippbil",
  "kranbil",
  "krokbil",
  "renovasjonsbil",
  "buss",
  "dieselmotor",
  "drivlinje",
  "dekk",
  "leasing av kjøretøy",
];

/**
 * Et delsett av de aller mest spesifikke nøkkelordene som brukes når vi
 * gjør faktiske API-søk mot Doffin (for å begrense antall kall).
 */
export const SEARCH_KEYWORDS: string[] = [
  "lastebil",
  "tungtransport",
  "volvo",
  "anleggsmaskin",
  "kjøretøy",
  "reservedeler",
  "verksted",
  "renovasjonsbil",
];

/** Relevante CPV-koder for tunge kjøretøy, transport og anleggsmaskiner. */
export const CPV_CODES: string[] = [
  "34100000", // Motorkjøretøy
  "34130000", // Motorkjøretøy for godstransport
  "34140000", // Tunge motorkjøretøy
  "34144000", // Spesialkjøretøy
  "34144510", // Renovasjonskjøretøy
  "43200000", // Anleggsmaskiner
  "43210000", // Maskiner for jordflytting
  "50110000", // Reparasjon/vedlikehold av motorkjøretøy
  "34330000", // Reservedeler til lastebiler/busser
];

export interface RegionConfig {
  /** Visningsnavn (og verdien som lagres i `tenders.region`). */
  name: string;
  /**
   * Doffin location-IDer (valgfritt). Kan fylles inn dersom man kjenner
   * de eksakte geo-IDene; brukes da som ekstra API-filter.
   */
  locationIds: string[];
  /**
   * Tekststrenger (små bokstaver) som identifiserer regionen ut fra
   * oppdragsgiver/overskrift/beskrivelse – dette er hovedmekanismen for
   * region-deteksjon siden Doffin returnerer location som koder.
   */
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

/** Tillatte regionnavn (brukes til validering av filtre i API-et). */
export const REGION_NAMES = REGIONS.map((r) => r.name);
export type RegionName = (typeof REGION_NAMES)[number];

/**
 * Avgjør om en gitt tekst er relevant for Volvo basert på nøkkelordene.
 * Returnerer hvilke nøkkelord som traff (tom liste = ikke relevant).
 */
export function matchVolvoKeywords(text: string): string[] {
  const haystack = text.toLowerCase();
  return VOLVO_KEYWORDS.filter((kw) => haystack.includes(kw.toLowerCase()));
}

/**
 * Forsøker å bestemme hvilken region en tekst (oppdragsgiver + overskrift +
 * beskrivelse) hører til. Returnerer regionnavnet eller null hvis ingen treff.
 */
export function detectRegion(text: string): RegionName | null {
  const haystack = ` ${text.toLowerCase()} `;
  for (const region of REGIONS) {
    if (region.matchers.some((m) => haystack.includes(m.toLowerCase()))) {
      return region.name;
    }
  }
  return null;
}
