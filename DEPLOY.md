# Deploy-guide · Volvo Anbud-monitor

## Netlify (anbefalt)

### 1. Koble GitHub-repo

1. Gå til [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Velg **GitHub** → repo: `mntomter-png/volvo-anbud-monitor`
3. Build-innstillinger hentes automatisk fra `netlify.toml`

### 2. Miljøvariabler

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
| `BASIC_AUTH_USER` | *(valgfri – brukernavn for kollegaer, f.eks. `volvo`)* |
| `BASIC_AUTH_PASSWORD` | *(valgfri – felles passord for å åpne dashboardet)* |

### 2b. Database-migrasjoner

Etter nye skjemaendringer: åpne **Supabase → SQL Editor** og kjør filen
`supabase/migrations/20260627100000_pipeline_fields.sql` (legger til type, el-flagg,
status og ansvarlig). Deretter: trykk **«Hent nye anbud nå»** i dashboardet for å
klassifisere eksisterende anbud.

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

### 6. Del med kollegaer

1. Sett `BASIC_AUTH_USER` og `BASIC_AUTH_PASSWORD` i Netlify (se tabellen over).
2. Deploy på nytt etter at variablene er satt.
3. Send kollegaer:
   - **Lenke:** `https://anbudvt.netlify.app/dashboard`
   - **Brukernavn** og **passord** (samme for alle – nettleseren husker innloggingen)

Uten Basic Auth er dashboardet åpent for alle som har lenken. Cron-jobb og `/api/notifications` er fortsatt beskyttet med `CRON_SECRET`.

Knappen **«Hent nye anbud nå»** kaller `/api/sync` (ikke cron-endepunktet).

---

## Cloudflare Workers (alternativ)

```bash
npx wrangler login
npm run deploy
```

Sett samme miljøvariabler som secrets i Cloudflare-dashboardet, og opprett Cron Trigger mot `POST /api/notifications`.
