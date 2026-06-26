/**
 * Klient mot Doffin Public API v2.
 *
 * Base-URL:  https://api.doffin.no/public/v2
 * Auth:      header «Ocp-Apim-Subscription-Key: <DOFFIN_API_KEY>»
 *
 * Hovedfunksjoner:
 *  - searchNotices(params): søk i kunngjøringer (GET /search)
 *  - getNotice(id):         hent én kunngjøring (GET /notices/{id})
 *  - mapNoticeToTender():   konverter et Doffin-treff til en DB-rad
 */

import type {
  DoffinNotice,
  DoffinSearchParams,
  DoffinSearchResponse,
  TenderInsert,
} from "@/lib/types";
import { detectRegion } from "@/lib/keywords";

const DEFAULT_BASE_URL = "https://api.doffin.no/public/v2";

/** Enkel, strukturert feiltype for API-kall mot Doffin. */
export class DoffinApiError extends Error {
  readonly status?: number;
  readonly details?: string;

  constructor(message: string, status?: number, details?: string) {
    super(message);
    this.name = "DoffinApiError";
    this.status = status;
    this.details = details;
  }
}

export interface DoffinClientOptions {
  apiKey?: string;
  baseUrl?: string;
  /** Timeout per request i millisekunder (standard 20s). */
  timeoutMs?: number;
}

export class DoffinClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: DoffinClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.DOFFIN_API_KEY;
    this.baseUrl = (options.baseUrl ?? process.env.DOFFIN_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  /** Bygger headers, inkludert subscription-key dersom den finnes. */
  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["Ocp-Apim-Subscription-Key"] = this.apiKey;
    }
    return headers;
  }

  /** Generisk GET-kall med query-parametre, timeout og feilhåndtering. */
  private async request<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    if (!this.apiKey) {
      throw new DoffinApiError(
        "Mangler DOFFIN_API_KEY. Registrer en subscription på Doffin API Management-portalen og sett nøkkelen som miljøvariabel.",
        401,
      );
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v !== undefined && v !== null && v !== "") {
            url.searchParams.append(key, String(v));
          }
        }
      } else {
        url.searchParams.append(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.buildHeaders(),
        signal: controller.signal,
        // Doffin-data endrer seg ofte; ikke cache på server.
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new DoffinApiError(
          `Doffin API svarte med ${response.status} ${response.statusText}`,
          response.status,
          body.slice(0, 500),
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof DoffinApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new DoffinApiError(
          `Doffin API tidsavbrudd etter ${this.timeoutMs} ms`,
          408,
        );
      }
      throw new DoffinApiError(
        `Nettverksfeil mot Doffin API: ${(error as Error).message}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Søk i kunngjøringer. Returnerer en paginert liste med treff.
   * @see https://betaapi.doffin.no/public/v2/search
   */
  async searchNotices(
    params: DoffinSearchParams = {},
  ): Promise<DoffinSearchResponse> {
    const query: Record<string, unknown> = {
      searchString: params.searchString,
      numHitsPerPage: params.numHitsPerPage ?? 50,
      // Doffin produksjons-API er 1-indeksert (page må være >= 1).
      page: params.page ?? 1,
      sortBy: params.sortBy ?? "PUBLICATION_DATE_DESC",
      type: params.type,
      status: params.status,
      cpvCode: params.cpvCode,
      location: params.location,
      issueDateFrom: params.issueDateFrom,
      issueDateTo: params.issueDateTo,
      estimatedValueFrom: params.estimatedValueFrom,
      estimatedValueTo: params.estimatedValueTo,
    };

    const result = await this.request<DoffinSearchResponse>("/search", query);
    // Robusthet: sørg for at hits alltid er en liste.
    return {
      numHitsTotal: result.numHitsTotal ?? 0,
      numHitsAccessible: result.numHitsAccessible ?? 0,
      hits: Array.isArray(result.hits) ? result.hits : [],
    };
  }

  /**
   * Hent én enkelt kunngjøring basert på Doffin-ID.
   * NB: detalj-endepunktet er ikke alltid dokumentert/garantert i v2.
   */
  async getNotice(id: string): Promise<DoffinNotice> {
    if (!id) {
      throw new DoffinApiError("getNotice krever en gyldig id", 400);
    }
    return this.request<DoffinNotice>(`/notices/${encodeURIComponent(id)}`);
  }
}

/** Bygg en lenke til kunngjøringen på doffin.no. */
export function buildDoffinUrl(notice: DoffinNotice): string {
  if (notice.doffinClassicUrl) return notice.doffinClassicUrl;
  return `https://www.doffin.no/notices/${encodeURIComponent(notice.id)}`;
}

/** Hent ut oppdragsgivers navn fra et treff (første tilgjengelige). */
export function getBuyerName(notice: DoffinNotice): string | null {
  const name = notice.buyer?.find((b) => b.name)?.name;
  return name ?? null;
}

/**
 * Konverter et Doffin-treff til en rad klar for innsetting i `tenders`.
 * Region utledes fra oppdragsgiver + overskrift + beskrivelse.
 */
export function mapNoticeToTender(notice: DoffinNotice): TenderInsert {
  const buyer = getBuyerName(notice);
  const regionText = [
    buyer ?? "",
    notice.heading ?? "",
    notice.description ?? "",
    ...(notice.locationId ?? []),
  ].join(" ");

  return {
    doffin_id: notice.id,
    title: notice.heading ?? null,
    buyer,
    region: detectRegion(regionText),
    published_at: notice.publicationDate ?? notice.issueDate ?? null,
    deadline: notice.deadline ?? null,
    estimated_value: notice.estimatedValue?.amount ?? null,
    url: buildDoffinUrl(notice),
    raw_data: notice as unknown as TenderInsert["raw_data"],
  };
}
