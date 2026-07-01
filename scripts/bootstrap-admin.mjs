#!/usr/bin/env node
/**
 * Inviter første administrator (standard: martin.tomter@volvo.com).
 * Kjør etter profiles-migrasjon: npm run db:bootstrap-admin
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnvFile(resolve(root, ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const adminEmail = (
  process.argv[2] ??
  process.env.INITIAL_ADMIN_EMAIL ??
  "martin.tomter@volvo.com"
).toLowerCase();

if (!url || !serviceKey) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing } = await admin
  .from("profiles")
  .select("id, email, role")
  .eq("email", adminEmail)
  .maybeSingle();

if (existing?.role === "admin") {
  console.log(`✓ ${adminEmail} er allerede administrator.`);
  process.exit(0);
}

async function promoteToAdmin(userId) {
  await admin.from("profiles").update({ role: "admin" }).eq("id", userId);
}

async function sendInviteEmail(actionLink) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("Mangler RESEND_API_KEY – send denne lenken manuelt:");
    console.log(actionLink);
    return;
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.NOTIFICATION_FROM ?? "Anbud-monitor <onboarding@resend.dev>";

  const { error: mailError } = await resend.emails.send({
    from,
    to: adminEmail,
    subject: "Velkommen til Anbud-monitor · Volvo Norge",
    html: `<!DOCTYPE html><html lang="nb"><body style="font-family:sans-serif;line-height:1.6;color:#1f2937;">
      <h2>Velkommen som administrator</h2>
      <p>Du er invitert til Anbud-monitoren for Volvo Norge.</p>
      <p><a href="${actionLink}" style="display:inline-block;background:#1c4b9b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Aktiver konto og velg passord</a></p>
      <p style="color:#64748b;font-size:13px;">Lenken er personlig. Hvis du ikke forventet denne e-posten, kan du ignorere den.</p>
    </body></html>`,
  });

  if (mailError) {
    throw new Error(`Resend-feil: ${mailError.message}`);
  }
}

const redirectTo = `${siteUrl}/auth/callback?next=/auth/set-password`;

let invite = await admin.auth.admin.generateLink({
  type: "invite",
  email: adminEmail,
  options: {
    redirectTo,
    data: { full_name: "Administrator" },
  },
});

if (invite.error) {
  invite = await admin.auth.admin.inviteUserByEmail(adminEmail, {
    redirectTo,
    data: { full_name: "Administrator" },
  });
}

if (invite.error) {
  console.error("Kunne ikke invitere admin:", invite.error.message);
  process.exit(1);
}

const userId = invite.data?.user?.id;
if (userId) await promoteToAdmin(userId);

const actionLink =
  invite.data?.properties?.action_link ??
  (invite.data?.user ? null : null);

if (actionLink) {
  await sendInviteEmail(actionLink);
  console.log(`✓ Aktiveringslenke sendt til ${adminEmail}.`);
} else {
  console.log(`✓ Admin klar for ${adminEmail} (sjekk e-post fra Supabase).`);
}
