import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtmlAttr } from "@/lib/security/html";
import { isSafeExternalUrl } from "@/lib/utils";

export interface InviteUserOptions {
  email: string;
  fullName?: string | null;
  role?: "user" | "admin";
  invitedBy?: string | null;
  redirectTo: string;
}

export interface InviteUserResult {
  userId: string | null;
  emailSent: boolean;
}

async function sendInviteEmail(to: string, actionLink: string) {
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
    subject: "Du er invitert til Anbud-monitor · Volvo Norge",
    html: `<!DOCTYPE html><html lang="nb"><body style="font-family:sans-serif;line-height:1.6;color:#1f2937;">
      <h2>Velkommen til Anbud-monitoren</h2>
      <p>Du har fått tilgang til anbud-monitoren for Volvo Norge.</p>
      <p><a href="${safeLink}" style="display:inline-block;background:#1c4b9b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Aktiver konto og velg passord</a></p>
      <p style="color:#64748b;font-size:13px;">Lenken er personlig. Hvis du ikke forventet denne e-posten, kan du ignorere den.</p>
    </body></html>`,
  });

  if (error) {
    console.error("[invite-email] Resend-feil:", error.message, { from, to });
    return false;
  }

  return true;
}

/** Inviter bruker – faller tilbake til generateLink + Resend hvis Supabase invite feiler. */
export async function inviteUser(
  options: InviteUserOptions,
): Promise<InviteUserResult> {
  const admin = createAdminClient();
  const metadata = { full_name: options.fullName ?? undefined };

  let userId: string | null = null;
  let actionLink: string | null = null;

  const invite = await admin.auth.admin.generateLink({
    type: "invite",
    email: options.email,
    options: { redirectTo: options.redirectTo, data: metadata },
  });

  if (invite.error) {
    const fallback = await admin.auth.admin.inviteUserByEmail(options.email, {
      redirectTo: options.redirectTo,
      data: metadata,
    });
    if (fallback.error) throw new Error(fallback.error.message);
    userId = fallback.data.user?.id ?? null;
  } else {
    userId = invite.data.user?.id ?? null;
    actionLink = invite.data.properties?.action_link ?? null;
  }

  if (userId) {
    await admin
      .from("profiles")
      .update({
        role: options.role ?? "user",
        full_name: options.fullName,
        invited_by: options.invitedBy ?? null,
      })
      .eq("id", userId);
  }

  let emailSent = false;
  if (actionLink) {
    emailSent = await sendInviteEmail(options.email, actionLink);
  }

  return { userId, emailSent };
}
