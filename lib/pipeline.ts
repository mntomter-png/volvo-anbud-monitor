/**
 * Pipeline-konstanter for KAM/Fleet Sales-arbeidsflyt.
 */

export const TENDER_TYPES = [
  "direct_purchase",
  "transport_service",
  "service_parts",
  "unknown",
] as const;

export type TenderType = (typeof TENDER_TYPES)[number];

export const TENDER_TYPE_LABELS: Record<TenderType, string> = {
  direct_purchase: "Direkte kjøp",
  transport_service: "Transporttjeneste",
  service_parts: "Service/deler",
  unknown: "Ukjent",
};

export const PIPELINE_STATUSES = [
  "new",
  "reviewing",
  "pursuing",
  "bid_submitted",
  "won",
  "lost",
  "not_relevant",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  new: "Ny",
  reviewing: "Vurderes",
  pursuing: "Forfølges",
  bid_submitted: "Tilbud levert",
  won: "Vunnet",
  lost: "Tapt",
  not_relevant: "Ikke relevant",
};

/** Foreslåtte ansvarlige – rediger listen etter teamet ditt. */
export const ASSIGNEE_OPTIONS = [
  "Ikke tildelt",
  "KAM Oslo",
  "KAM Akershus",
  "KAM Buskerud",
  "KAM Innlandet",
] as const;

export function isPipelineStatus(value: string): value is PipelineStatus {
  return (PIPELINE_STATUSES as readonly string[]).includes(value);
}

export function isTenderType(value: string): value is TenderType {
  return (TENDER_TYPES as readonly string[]).includes(value);
}
