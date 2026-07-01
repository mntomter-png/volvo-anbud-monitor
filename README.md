# Anbud-monitor · Volvo Norge 🚛

En produksjonsklar Next.js 15-applikasjon som overvåker offentlige anbud på
[Doffin](https://www.doffin.no) og varsler om kunngjøringer som er relevante for
**Volvo (lastebiler, tungtransport, service, reservedeler og anleggsmaskiner)** i
regionene **Oslo, Akershus, Buskerud og Innlandet**.

## Funksjoner

- 🔎 **Doffin Public API v2-klient** (`searchNotices`, `getNotice`) med
  `Ocp-Apim-Subscription-Key`, timeout og strukturert feilhåndtering.
- 📄 **Paginert søk** – henter alle sider (opptil 1000 treff per søk), ikke bare første side.
- 🏷️ **CPV-kodesøk** – fanger anbud med relevante CPV-koder selv uten nøkkelord i tittelen.
- 🧠 **Volvo-relevant filtrering** basert på sterke nøkkelord
  (lastebil, tungtransport, volvo, reservedeler, service, anleggsmaskin, …).
- 🏆 **Tildelingskunngjøringer** – henter RESULT/kontraktsinngåelse, lagrer vinner og
  estimerer kontraktslutt ut fra varighet i teksten.
- 📍 **Regiondeteksjon** for Oslo, Akershus, Buskerud og Innlandet.
- 💾 **Lagring i Supabase** med deduplisering på `doffin_id`.
- ✉️ **Daglig e-postvarsel** via Resend – kun når det finnes _nye_ relevante anbud.
- 📊 **Moderne dashboard** (shadcn/ui + TanStack Table) med multi-select
  regionfilter, fritekstsøk, dato-range og sortering.
- 👥 **Brukere og roller** – Supabase Auth med admin, invitasjon på e-post og
  tilbakestilling av passord.
- ☁️ **Klar for deploy** på Netlify (inkl. schedulert funksjon) eller Cloudflare.

## Teknologi

| Lag        | Teknologi                                  |
| ---------- | ------------------------------------------ |
| Rammeverk  | Next.js 15 (App Router), React 19, TS      |
| UI         | Tailwind CSS v4, shadcn/ui, TanStack Table |
| Database   | Supabase (PostgreSQL)                      |
| E-post     | Resend                                     |
| Datakilde  | Doffin Public API v2                       |

## Kom i gang

### 1. Installer avhengigheter

```bash
npm install
```

### 2. Sett opp miljøvariabler

```bash
cp .env.example .env.local
```

Fyll inn verdiene (se `.env.example` for detaljer):

| Variabel                        | Beskrivelse                                  |
| ------------------------------- | -------------------------------------------- |
| `DOFFIN_API_KEY`                | Doffin subscription key (Azure APIM)         |
| `RESEND_API_KEY`                | API-nøkkel fra Resend                        |
| `NOTIFICATION_EMAIL`            | Mottaker(e) av varsler (komma-separert)      |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase prosjekt-URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon-nøkkel                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | (anbefalt) for server-side skriving          |
| `CRON_SECRET`                   | (valgfri) beskytter `/api/notifications`     |

### 3. Opprett databasen

Kjør `supabase/schema.sql` i Supabase SQL Editor. Den oppretter tabellen
`tenders` med indekser og RLS-policyer.

### 4. Start utviklingsserver

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) – du blir sendt til
`/dashboard`.

## API-endepunkter

### `GET /api/tenders`

Henter lagrede anbud fra Supabase med filtrering.

| Query     | Eksempel             | Beskrivelse                          |
| --------- | -------------------- | ------------------------------------ |
| `region`  | `Oslo,Akershus`      | Komma-separerte regionnavn           |
| `search`  | `lastebil`           | Fritekst på tittel/oppdragsgiver     |
| `from`    | `2026-01-01`         | Publisert fra og med                 |
| `to`      | `2026-12-31`         | Publisert til og med                 |
| `notice_kind` | `award`          | Konkurranse eller tildeling          |
| `expiring_soon` | `true`         | Tildelinger med kontrakt som utløper innen 6 mnd |
| `sort`    | `deadline`           | Sorteringskolonne                    |
| `order`   | `asc` / `desc`       | Sorteringsretning                    |

### `POST /api/notifications`

Kjører hovedjobben: søker i Doffin (nøkkelord + CPV, paginert), henter også
tildelingskunngjøringer, filtrerer på Volvo-relevans + region, lagrer nye anbud
og sender e-post hvis det finnes nye. Beskyttes valgfritt med
`Authorization: Bearer <CRON_SECRET>`.

```bash
curl -X POST http://localhost:3000/api/notifications
```

## Daglig kjøring (cron)

- **Netlify:** Den schedulerte funksjonen i
  `netlify/functions/daily-notifications.mjs` kaller `/api/notifications`
  hver dag (standard 06:00 UTC). Endre `config.schedule` ved behov.
- **Cloudflare / annet:** Sett opp en cron-trigger eller ekstern tjeneste
  (f.eks. cron-job.org) som gjør `POST` mot `/api/notifications` med
  `CRON_SECRET` i `Authorization`-headeren.

## Deploy

### Netlify

1. Koble repoet til Netlify.
2. Legg inn miljøvariablene under **Site settings → Environment variables**.
3. `netlify.toml` + `@netlify/plugin-nextjs` håndterer bygg og runtime.

### Cloudflare Workers (OpenNext)

Prosjektet er konfigurert med `@opennextjs/cloudflare` (offisiell adapter).

1. Logg inn: `npx wrangler login`
2. Sett miljøvariabler i Cloudflare-dashboardet (**Workers → volvo-anbud-monitor → Settings → Variables**), eller bruk `wrangler secret put <NAVN>`.
3. For lokal preview med Wrangler: `cp .dev.vars.example .dev.vars` og fyll inn verdier.
4. Deploy:

```bash
npm run deploy
```

5. **Daglig cron:** Sett opp en Cron Trigger i Cloudflare-dashboardet som kaller
   `POST https://<din-worker-url>/api/notifications` med header
   `Authorization: Bearer <CRON_SECRET>`, eller bruk en ekstern cron-tjeneste.

For lokal test av Cloudflare-bygget:

```bash
npm run preview
```

Valgfritt: aktiver R2-caching ved å følge [OpenNext Cloudflare Caching](https://opennext.js.org/cloudflare/caching).

## Prosjektstruktur

```
app/
  api/
    tenders/route.ts        # GET: lagrede anbud med filtre
    notifications/route.ts  # POST: daglig jobb + e-post
  dashboard/page.tsx        # Dashboard-UI
  layout.tsx, page.tsx      # Layout + redirect til /dashboard
components/
  ui/                       # shadcn/ui-komponenter
  tenders-data-table.tsx    # TanStack-tabell med filtre
  region-multi-select.tsx   # Multi-select regionfilter
lib/
  doffin.ts                 # Doffin API v2-klient
  supabase.ts               # Supabase-klienter
  email.ts                  # Resend HTML-e-post
  keywords.ts               # Volvo-nøkkelord + regioner + CPV
  doffin-paginated.ts       # Paginert Doffin-søk
  award-contract.ts         # Parsing av tildelinger og kontraktslutt
  notice-kind.ts            # Konkurranse vs. tildeling
  types.ts                  # Felles typer (inkl. Database)
  format.ts                 # Formattering (dato/valuta)
supabase/schema.sql         # Databaseskjema
netlify/functions/          # Schedulert cron-funksjon (Netlify)
wrangler.jsonc              # Cloudflare Workers-konfigurasjon
open-next.config.ts         # OpenNext Cloudflare-adapter
```

## Lisens

Internt verktøy – tilpass etter behov.
