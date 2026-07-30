import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/auth/session";
import { escapeHtmlAttr } from "@/lib/security/html";
import { isSafeExternalUrl } from "@/lib/utils";

export interface ResetUserPasswordOptions {
  email: string;
  /** Brukes av Supabase generateLink; e-postlenken går til vår app med token_hash. */
  redirectTo: string;
}

export interface ResetUserPasswordResult {
  emailSent: boolean;
  actionLink: string;
}

/** Bygg lenke til vår app – verifyOtp skjer der (ikke via supabase.co/verify). */
export function buildAuthTokenLink(options: {
  tokenHash: string;
  type: "recovery" | "invite" | "signup" | "magiclink" | "email";
  next: string;
  siteUrl?: string;
}): string {
  const siteUrl = (options.siteUrl ?? getSiteUrl()).replace(/\/$/, "");
  const params = new URLSearchParams({
    token_hash: options.tokenHash,
    type: options.type,
    next: options.next,
  });
  return `${siteUrl}/auth/callback?${params.toString()}`;
}

async function sendResetEmail(to: string, actionLink: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const resend = new Resend(apiKey);
  const from =
    process.env.NOTIFICATION_FROM ?? "Anbud-monitor <onboarding@resend.dev>";

  const safeLink = isSafeExternalUrl(actionLink)
    ? escapeHtmlAttr(actionLink)
    : "#";

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Tilbakestill passord – Anbud-monitor · Volvo Trucks",
    html: `<!DOCTYPE html><html lang="nb"><body style="font-family:sans-serif;line-height:1.6;color:#1f2937;">
      <h2>Tilbakestill passord</h2>
      <p>En administrator har bedt om å tilbakestille passordet ditt for anbud-monitoren.</p>
      <p><a href="${safeLink}" style="display:inline-block;background:#1c4b9b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Velg nytt passord</a></p>
      <p style="color:#64748b;font-size:13px;">Lenken er personlig og utløper etter en stund. Hvis du ikke ba om dette, kan du ignorere e-posten.</p>
    </body></html>`,
  });

  if (error) {
    console.error("[reset-password-email] Resend-feil:", error.message, { from, to });
    return false;
  }

  return true;
}

/** Send tilbakestillingslenke til eksisterende bruker (generateLink + Resend). */
export async function resetUserPassword(
  options: ResetUserPasswordOptions,
): Promise<ResetUserPasswordResult> {
  const admin = createAdminClient();

  const recovery = await admin.auth.admin.generateLink({
    type: "recovery",
    email: options.email,
    options: { redirectTo: options.redirectTo },
  });

  if (recovery.error) {
    throw new Error(recovery.error.message);
  }

  const hashedToken = recovery.data.properties?.hashed_token;
  if (!hashedToken) {
    throw new Error("Kunne ikke generere tilbakestillingslenke (mangler token)");
  }

  // Bruk token_hash + verifyOtp i vår app – unngår at supabase.co/verify
  // redirecter uten session (vanlig årsak til «lenken er ugyldig»).
  const actionLink = buildAuthTokenLink({
    tokenHash: hashedToken,
    type: "recovery",
    next: "/auth/reset-password",
  });

  const emailSent = await sendResetEmail(options.email, actionLink);
  return { emailSent, actionLink };
}
