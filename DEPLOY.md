# Deploy-guide · Volvo Anbud-monitor

## Netlify (anbefalt)

### 1. Koble GitHub-repo

1. Gå til [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Velg **GitHub** → repo: `mntomter-png/volvo-anbud-monitor`
3. Build-innstillinger hentes automatisk fra `netlify.toml`

### 2. Miljøvariabler

Under **Site configuration → Environment variables**, legg inn:

| Variabel | Verdi |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tfgasnowoyatjotewwbn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(fra Supabase → API)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(fra Supabase → API, hemmelig)* |
| `DOFFIN_API_KEY` | *(Doffin subscription key)* |
| `DOFFIN_API_BASE_URL` | `https://api.doffin.no/public/v2` |
| `RESEND_API_KEY` | *(fra Resend)* |
| `NOTIFICATION_EMAIL` | `anbud@biloversikt.com` |
| `NOTIFICATION_FROM` | `Volvo Anbud-monitor <anbud@biloversikt.com>` |
| `CRON_SECRET` | *(sterkt tilfeldig token – se `.env.local`)* |

### 3. Deploy

Klikk **Deploy site**. Netlify bygger automatisk ved hver push til `main`.

### 4. Daglig cron

Schedulert funksjon i `netlify/functions/daily-notifications.mjs` kjører kl. **06:00 UTC** hver dag og kaller `/api/notifications` med `CRON_SECRET`.

Verifiser under **Functions** i Netlify-dashboardet etter første deploy.

### 5. Test manuelt

```bash
curl -X POST https://<din-netlify-url>/api/notifications \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

## Cloudflare Workers (alternativ)

```bash
npx wrangler login
npm run deploy
```

Sett samme miljøvariabler som secrets i Cloudflare-dashboardet, og opprett Cron Trigger mot `POST /api/notifications`.
