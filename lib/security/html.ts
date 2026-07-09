/** Escaper tekst for trygg bruk i HTML-innhold. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escaper URL for trygg bruk i href-attributter. */
export function escapeHtmlAttr(url: string): string {
  return escapeHtml(url);
}
