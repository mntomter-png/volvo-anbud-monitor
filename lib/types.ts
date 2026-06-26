/**
 * Felles typer for hele applikasjonen:
 *  - Supabase `Database`-typen (brukes som generisk for klienten)
 *  - Domenetyper for anbud (tenders)
 *  - Typer som speiler Doffin Public API v2
 */

/** JSON-kompatibel verdi (for `raw_data`-kolonnen). */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * En rad i `tenders`-tabellen slik den ligger lagret i Supabase.
 * NB: må være `type` (ikke `interface`) for at supabase-js skal kunne
 * matche den mot `Record<string, unknown>`-kravet i Database-typen.
 */
export type TenderRow = {
  id: string;
  doffin_id: string;
  title: string | null;
  buyer: string | null;
  region: string | null;
  published_at: string | null;
  deadline: string | null;
  estimated_value: number | null;
  url: string | null;
  raw_data: Json;
  created_at: string;
}

/** Felt vi sender inn ved insert (id/created_at settes av databasen). */
export type TenderInsert = {
  doffin_id: string;
  title?: string | null;
  buyer?: string | null;
  region?: string | null;
  published_at?: string | null;
  deadline?: string | null;
  estimated_value?: number | null;
  url?: string | null;
  raw_data?: Json;
}

/**
 * Supabase Database-type. Holdes minimal og fokusert på `tenders`-tabellen,
 * men er strukturert slik supabase-js forventer (public.Tables.<navn>).
 */
export type Database = {
  public: {
    Tables: {
      tenders: {
        Row: TenderRow;
        Insert: TenderInsert;
        Update: Partial<TenderInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/* -------------------------------------------------------------------------- */
/*  Doffin Public API v2 – speiler responsstrukturen fra /public/v2/search    */
/* -------------------------------------------------------------------------- */

export interface DoffinOrganization {
  id?: string;
  organizationId?: string;
  name?: string;
}

export interface DoffinEstimatedValue {
  currencyCode?: string;
  amount?: number;
}

export interface DoffinLot {
  heading?: string;
  description?: string;
  winner?: DoffinOrganization[];
}

/** Ett treff i Doffin-søket (PublicNoticeHit). */
export interface DoffinNotice {
  id: string;
  buyer?: DoffinOrganization[];
  heading?: string;
  description?: string;
  locationId?: string[];
  estimatedValue?: DoffinEstimatedValue;
  type?: string;
  allTypes?: string[];
  status?: string;
  issueDate?: string;
  deadline?: string;
  publicationDate?: string;
  receivedTenders?: number;
  cpvCodes?: string[];
  limitedDataFlag?: boolean;
  doffinClassicUrl?: string;
  lots?: DoffinLot[];
}

/** Paginert respons (PagedPublicNoticeDto). */
export interface DoffinSearchResponse {
  numHitsTotal: number;
  numHitsAccessible: number;
  hits: DoffinNotice[];
}

/** Søkeparametre som støttes av /public/v2/search. */
export interface DoffinSearchParams {
  searchString?: string;
  numHitsPerPage?: number;
  page?: number;
  sortBy?: "PUBLICATION_DATE_DESC" | "PUBLICATION_DATE_ASC" | string;
  type?: string | string[];
  status?: string | string[];
  cpvCode?: string | string[];
  location?: string | string[];
  issueDateFrom?: string;
  issueDateTo?: string;
  estimatedValueFrom?: number;
  estimatedValueTo?: number;
}
