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
| `NOTIFICATION_EMAIL` | `martin.tomter@volvo.com` |
| `NOTIFICATION_FROM` | `Volvo Anbud-monitor <anbud@biloversikt.com>` |
| `CRON_SECRET` | *(sterkt tilfeldig token – se `.env.local`)* |
| `NEXT_PUBLIC_SITE_URL` | `https://anbudvt.netlify.app` *(produksjons-URL – brukes i invitasjonslenker)* |

### 2b. Database-migrasjoner og brukere

Kjør migrasjoner etter `supabase login`:

```bash
npm run db:migrate -- supabase/migrations/20260701000000_profiles_auth.sql
npm run db:bootstrap-admin
```

`bootstrap-admin` inviterer `martin.tomter@volvo.com` som første administrator (kan overstyres med `INITIAL_ADMIN_EMAIL`).

### 2c. Supabase Auth (påkrevd for kollega-tilgang)

I **Supabase → Authentication → URL Configuration**:

| Felt | Verdi |
|------|-------|
| Site URL | `https://anbudvt.netlify.app` |
| Redirect URLs | `https://anbudvt.netlify.app/auth/callback`, `https://anbudvt.netlify.app/auth/set-password`, `https://anbudvt.netlify.app/auth/reset-password`, `http://localhost:3000/auth/callback` |

Under **Authentication → Providers → Email**: slå på e-postinnlogging. Invitasjoner og passordtilbakestilling sendes fra Supabase (tilpass maler under **Email Templates**).

**Første innlogging (admin):**

1. Kjør `npm run db:bootstrap-admin`
2. Åpne invitasjonslenken i e-posten → velg passord på `/auth/set-password`
3. Logg inn på `/login`

**Invitere kollegaer:** Logg inn som admin → **Brukere** → fyll inn e-post → **Send invitasjon**.

**Glemt passord:** `/auth/forgot-password` sender tilbakestillingslenke.

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

1. Deploy med `NEXT_PUBLIC_SITE_URL` satt til produksjons-URL.
2. Kjør migrasjon og `npm run db:bootstrap-admin` for første admin.
3. Logg inn som admin → **Brukere** → inviter kollegaer med e-post.
4. Kollegaer får invitasjon, velger passord og logger inn på `/login`.

Cron-jobb (`/api/notifications`) er fortsatt beskyttet med `CRON_SECRET`. Dashboard og API krever innlogging via Supabase Auth.

---

## Cloudflare Workers (alternativ)

```bash
npx wrangler login
npm run deploy
```

Sett samme miljøvariabler som secrets i Cloudflare-dashboardet, og opprett Cron Trigger mot `POST /api/notifications`.
