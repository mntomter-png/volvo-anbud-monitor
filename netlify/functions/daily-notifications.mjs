// Netlify Scheduled Function – kjører den daglige anbud-jobben.
// Kaller route handleren /api/notifications på det deployede nettstedet.
//
// Tidsplan settes via `config.schedule` (cron-syntaks eller "@daily").

export default async function handler() {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!base) {
    return new Response("Mangler URL for nettstedet", { status: 500 });
  }

  const headers = { "Content-Type": "application/json" };
  if (process.env.CRON_SECRET) {
    headers["Authorization"] = `Bearer ${process.env.CRON_SECRET}`;
  }

  const res = await fetch(`${base}/api/notifications`, {
    method: "POST",
    headers,
  });

  const body = await res.text();
  console.log(`[daily-notifications] status=${res.status} body=${body}`);

  return new Response(body, { status: res.status });
}

// Kjør hver dag kl. 06:00 UTC. Endre til ønsket tidspunkt.
export const config = {
  schedule: "0 6 * * *",
};
