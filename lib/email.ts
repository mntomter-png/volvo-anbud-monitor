/**
 * E-postvarsling via Resend.
 *  - renderTenderEmail(): bygger en pen, responsiv HTML-e-post
 *  - sendNotificationEmail(): sender e-posten dersom Resend er konfigurert
 */

import { Resend } from "resend";

import type { TenderInsert } from "@/lib/types";
import { NOTICE_KIND_LABELS, type NoticeKind } from "@/lib/notice-kind";
import { isSafeExternalUrl } from "@/lib/utils";

const BRAND = "#1c4b9b"; // Volvo-blå
const ACCENT = "#0b2a52";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatValue(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Bygg HTML-innholdet for varslings-e-posten. */
export function renderTenderEmail(tenders: TenderInsert[]): string {
  const rows = tenders
    .map((t) => {
      const title = escapeHtml(t.title ?? "Uten tittel");
      const buyer = escapeHtml(t.buyer ?? "Ukjent oppdragsgiver");
      const region = escapeHtml(t.region ?? "—");
      const url = isSafeExternalUrl(t.url) ? t.url! : "https://www.doffin.no";
      const kind = t.notice_kind ?? "competition";
      const kindLabel = NOTICE_KIND_LABELS[kind as NoticeKind] ?? "Konkurranse";
      const winner =
        kind === "award" && t.winner_name
          ? `<div style="margin-top:6px;font-size:12px;color:#0f766e;">Vinner: <strong>${escapeHtml(t.winner_name)}</strong></div>`
          : "";
      const deadlineLine =
        kind === "award"
          ? t.contract_end_date
            ? `<span style="margin-left:10px;">Kontrakt utløper: <strong>${formatDate(t.contract_end_date)}</strong></span>`
            : ""
          : `<span style="margin-left:10px;">Frist: <strong>${formatDate(t.deadline)}</strong></span>`;
      return `
        <tr>
          <td style="padding:16px;border-bottom:1px solid #e6e9ef;vertical-align:top;">
            <a href="${url}" style="color:${BRAND};font-weight:600;font-size:15px;text-decoration:none;">${title}</a>
            <div style="margin-top:6px;color:#5b6472;font-size:13px;">${buyer}</div>
            ${winner}
            <div style="margin-top:10px;font-size:12px;color:#5b6472;">
              <span style="display:inline-block;background:#eef2fb;color:${ACCENT};padding:3px 8px;border-radius:999px;font-weight:600;">${region}</span>
              <span style="display:inline-block;margin-left:8px;background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:999px;font-weight:600;">${kindLabel}</span>
              ${deadlineLine}
              <span style="margin-left:10px;">Verdi: <strong>${formatValue(t.estimated_value)}</strong></span>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nye anbud – Volvo Trucks</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:${ACCENT};padding:28px 32px;">
              <div style="color:#ffffff;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.8;">Anbud-monitor</div>
              <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:4px;">Volvo Trucks · Renault Trucks</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              <p style="margin:0;color:#1f2937;font-size:15px;">
                Det er funnet <strong>${tenders.length} nye relevante anbud</strong> i regionene Oslo, Akershus, Buskerud og Innlandet.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e9ef;border-radius:10px;overflow:hidden;">
                ${rows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <a href="https://www.doffin.no" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px;">Åpne Doffin</a>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e6e9ef;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                Automatisk varsel fra anbud-monitoren. Data hentet fra Doffin Public API v2.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  skippedReason?: string;
}

/**
 * Send varslings-e-post via Resend. Hopper pent over hvis konfigurasjon
 * mangler, slik at jobben ikke krasjer i miljøer uten e-post.
 */
export async function sendNotificationEmail(
  tenders: TenderInsert[],
): Promise<SendEmailResult> {
  if (tenders.length === 0) {
    return { sent: false, skippedReason: "Ingen nye anbud å varsle om" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;
  // Resend krever en verifisert avsender; onboarding-adressen fungerer for test.
  const from = process.env.NOTIFICATION_FROM ?? "Anbud-monitor <onboarding@resend.dev>";

  if (!apiKey || !to) {
    return {
      sent: false,
      skippedReason:
        "RESEND_API_KEY og/eller NOTIFICATION_EMAIL mangler – hopper over e-post",
    };
  }

  const resend = new Resend(apiKey);
  const subject = `${tenders.length} nye truck-anbud (Volvo/Renault)`;

  const { data, error } = await resend.emails.send({
    from,
    to: to.split(",").map((e) => e.trim()),
    subject,
    html: renderTenderEmail(tenders),
  });

  if (error) {
    throw new Error(`Resend-feil: ${error.message ?? JSON.stringify(error)}`);
  }

  return { sent: true, id: data?.id };
}
