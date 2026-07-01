/**
 * Skiller aktive konkurranser fra tildelingskunngjøringer.
 */

export const NOTICE_KINDS = ["competition", "award"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export const NOTICE_KIND_LABELS: Record<NoticeKind, string> = {
  competition: "Konkurranse",
  award: "Tildeling",
};

export function isNoticeKind(value: string): value is NoticeKind {
  return (NOTICE_KINDS as readonly string[]).includes(value);
}

/** Måneder frem i tid for «utløper snart»-filter. */
export const EXPIRING_SOON_MONTHS = 6;
