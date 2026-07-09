# Deploy-guide · Volvo Anbud-monitor

## Netlify (anbefalt)

### 1. Koble GitHub-repo

1. Gå til [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Velg **GitHub** → ditt repo
3. Build-innstillinger hentes automatisk fra `netlify.toml`

### 2. Miljøvariabler

| Variabel | Verdi |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<prosjekt-id>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(fra Supabase → Project Settings → API)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(fra Supabase → API, hemmelig – påkrevd i produksjon)* |
| `DOFFIN_API_KEY` | *(Doffin subscription key)* |
| `DOFFIN_API_BASE_URL` | `https://api.doffin.no/public/v2` |
| `RESEND_API_KEY` | *(fra Resend)* |
| `NOTIFICATION_EMAIL` | `din@epost.no` |
| `NOTIFICATION_FROM` | `Volvo Anbud-monitor <anbud@dittdomene.no>` |
| `CRON_SECRET` | *(sterkt tilfeldig token, min. 32 tegn – påkrevd i produksjon)* |
| `NEXT_PUBLIC_SITE_URL` | `https://<din-netlify-url>` *(brukes i invitasjonslenker)* |

### 2b. Database-migrasjoner og brukere

Kjør alle migrasjoner i rekkefølge etter `supabase login`:

```bash
npm run db:migrate -- supabase/migrations/20260626000000_init_tenders.sql
npm run db:migrate -- supabase/migrations/20260627100000_pipeline_fields.sql
npm run db:migrate -- supabase/migrations/20260627200000_award_contracts.sql
npm run db:migrate -- supabase/migrations/20260701000000_profiles_auth.sql
npm run db:migrate -- supabase/migrations/20260701120000_update_admin_email.sql
npm run db:migrate -- supabase/migrations/20260709100000_security_hardening.sql
npm run db:bootstrap-admin
```

`bootstrap-admin` inviterer første administrator (overstyr med `INITIAL_ADMIN_EMAIL`).

### 2c. Supabase Auth (påkrevd for kollega-tilgang)

I **Supabase → Authentication → URL Configuration**:

| Felt | Verdi |
|------|-------|
| Site URL | `https://<din-produksjons-url>` |
| Redirect URLs | `https://<din-produksjons-url>/auth/callback`, `/auth/set-password`, `/auth/reset-password`, `http://localhost:3000/auth/callback` |

Under **Authentication → Providers → Email**:

- Slå på e-postinnlogging
- **Deaktiver offentlig registrering** (invite-only)
- Aktiver «leaked password protection»

Under **Authentication → Rate Limits**:

- Stram inn rate limits for innlogging og passordtilbakestilling

Under **Authentication → Multi-Factor Authentication** (anbefalt):

- Aktiver MFA for administratorer

**Første innlogging (admin):**

1. Kjør `npm run db:bootstrap-admin`
2. Åpne invitasjonslenken i e-posten → velg passord på `/auth/set-password`
3. Logg inn på `/login`

**Invitere kollegaer:** Logg inn som admin → **Brukere** → fyll inn e-post → **Send invitasjon**.

**Glemt passord:** `/auth/forgot-password` sender tilbakestillingslenke.

### 3. Deploy

Klikk **Deploy site**. Netlify bygger automatisk ved hver push til `main`.

### 4. Daglig cron

Schedulert funksjon i `netlify/functions/daily-notifications.mjs` kjører kl. **06:00 UTC** hver dag og kaller `/api/notifications` med `Authorization: Bearer <CRON_SECRET>`.

Verifiser under **Functions** i Netlify-dashboardet etter første deploy.

### 5. Test manuelt

```bash
curl -X POST https://<din-netlify-url>/api/notifications \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### 6. Del med kollegaer

1. Deploy med `NEXT_PUBLIC_SITE_URL` satt til produksjons-URL.
2. Kjør migrasjoner og `npm run db:bootstrap-admin` for første admin.
3. Logg inn som admin → **Brukere** → inviter kollegaer med e-post.
4. Kollegaer får invitasjon, velger passord og logger inn på `/login`.

Cron-jobb (`/api/notifications`) er beskyttet med `CRON_SECRET`. Dashboard og API krever innlogging via Supabase Auth. Manuell sync (`/api/sync`) er kun tilgjengelig for administratorer.

---

## Cloudflare Workers (alternativ)

```bash
npx wrangler login
npm run deploy
```

Sett samme miljøvariabler som secrets i Cloudflare-dashboardet, og opprett Cron Trigger mot `POST /api/notifications`.

---

## Sikkerhetssjekkliste (produksjon)

- [ ] Alle migrasjoner kjørt, inkl. `20260709100000_security_hardening.sql`
- [ ] `CRON_SECRET` og `SUPABASE_SERVICE_ROLE_KEY` satt i hosting
- [ ] Offentlig signup deaktivert i Supabase
- [ ] MFA aktivert for admin-brukere
- [ ] `NEXT_PUBLIC_SITE_URL` matcher faktisk domene
- [ ] Redirect URLs i Supabase er oppdatert
