/** Saniterer fritekst for PostgREST .or()-filtre (hindrer filter-injeksjon). */
export function sanitizePostgrestSearch(input: string): string {
  return input
    .replace(/[%_,().\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
