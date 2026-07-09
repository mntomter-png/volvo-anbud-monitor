import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtmlAttr } from "@/lib/security/html";
import { isSafeExternalUrl } from "@/lib/utils";

export interface ResetUserPasswordOptions {
  email: string;
  redirectTo: string;
}

export interface ResetUserPasswordResult {
  emailSent: boolean;
  actionLink: string;
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

  const actionLink = recovery.data.properties?.action_link;
  if (!actionLink) {
    throw new Error("Kunne ikke generere tilbakestillingslenke");
  }

  const emailSent = await sendResetEmail(options.email, actionLink);
  return { emailSent, actionLink };
}
