# PROJECT_MAP — Rowad Sabaa Logistics Platform (Command Center)

> **Generated:** 2026-08-11 | **Updated:** 2026-08-13 | **Status:** PHASE 1 + 2 + PUBLIC LANDING SHIPPED | **Phase 3 COMPLETE** (Provider Pattern) | **Guide + Integrations Test + CSV SHIPPED** | **Self-Service Auth SHIPPED** (OTP register + login + /account)
> **Core principle:** ZERO HARDCODED VALUES — no price, color, text, or API key in code. Everything from `SystemSetting`/DB + `.env` (secrets only).
> **ENV NOTE (2026-08-13):** pnpm store on this machine is corrupt (repeated missing `next/dist/compiled/jest-worker` + empty package dirs; `pnpm install --force` killed mid-link by timeout corrupted hard links). Switched installs to **npm** (both lockfiles tracked; `package-lock.json` in sync, 845 pkgs, `npx prisma generate` works). Use `npm install` / `npm run build` going forward.

---

## [TECH_STACK] — verified against npm registry on 2026-08-11

| Layer | Package | Version | Verified | Notes / Risk |
|---|---|---|---|---|
| Framework | `next` | **14.2.35** (LOCKED major 14) | npm ✓ (last 14.x, 2025-12-12) | ⚠️ Next 14 is **EOL since 2025-10-26**. 14.2.35 carries last security fixes (CVE-2025-55183/55184). Patch-maxed; upgrade path → 16 documented in ORPHANS. |
| React | `react` / `react-dom` | 18.3.1 | Next 14 requirement | React 18 only (19 requires Next 15+). |
| Language | `typescript` | ~5.9.x (strict) | Next 14-compatible | pin `<6` (TS 6 = breaking). |
| ORM | `prisma` / `@prisma/client` | **5.22.0** (LOCKED major 5) | npm ✓ (last 5.x) | Prisma 6/7 exist; locked to 5 per brief. |
| Auth | `next-auth` | **5.0.0-beta.32** = Auth.js v5 (`npm i next-auth@beta`) | npm ✓ (beta tag) | ⚠️ npm `latest` tag still = v4 (4.24.15). v5 only under `beta`. **v4 is banned by brief.** peerDeps: next ^14 ✓ react ^18.2 ✓ |
| Auth core | `@auth/core` | 0.41.3 | npm ✓ | bundled dep of next-auth v5 |
| Auth adapter | `@auth/prisma-adapter` | 2.11.3 | npm ✓ | peer `@prisma/client >=2.26` → 5.22 ✓ |
| UI | `shadcn/ui` CLI | 4.16.2 (2026-08) | npm ✓ | init into existing Next 14 app (CLI detects framework; do NOT let it scaffold Next 15/16) |
| Styling | `tailwindcss` | **4.3.3** (DECISION A) | npm ✓ | CSS-first theming aligns with DB-driven CSS vars; `@tailwindcss/postcss` supports Next ≥14. Fallback: 3.4.17 |
| Animations | `framer-motion` | 13.1.0 | npm ✓ | react ^18 ✓ |
| Icons | `lucide-react` | 1.31.0 | npm ✓ | |
| Validation | `zod` | 4.4.3 | npm ✓ | resolvers peer supports ^4 ✓ |
| Forms | `react-hook-form` | 7.85.0 | npm ✓ | |
| Resolvers | `@hookform/resolvers` | 5.7.1 | npm ✓ | zod ^3.25 \|\| ^4 ✓ |
| Client state | `zustand` | 5.0.14 | npm ✓ | |
| Server state | `@tanstack/react-query` | 5.101.4 | npm ✓ | react ^18\|\|^19 ✓ |
| PDF | `@react-pdf/renderer` | 4.6.0 | npm ✓ | react ^16–19 ✓ |
| i18n | `next-intl` | 4.13.6 | npm ✓ | next ^14 ✓ react ^18 ✓; EN/AR + RTL |
| Maps | `mapbox-gl` | 3.28.1 | npm ✓ | Phase 3 |
| Logging | `pino` (+ `pino-pretty` dev) | 9.x | pin at install | async, levels: info/warn/error |
| Crypto | node `crypto` (AES-256-GCM) | built-in | — | vault encryption, key from env |
| Env/secrets | `.env` (gitignored) | — | — | `DATABASE_URL`, `AUTH_SECRET`, `SETTINGS_ENCRYPTION_KEY` |

> **Host prerequisites (blocking):** Node.js 20 LTS+ and PostgreSQL 15+ are **NOT installed** on this machine — Milestone 0 must install both. Git repo not initialized yet.

---

## [SYSTEM_FLOW] — Admin → DB → Cache → Frontend

```
ADMIN (Command Center UI, role=ADMIN)
  │  Server Action / Route Handler  (app/api/admin/**)
  │  Zod validate → lib/validation.ts
  ▼
Prisma upsert → SystemSetting / ShippingRate / Port / Carrier / ExchangeRate
  │  lib/log.ts (pino, async): actor=?, key=?, before→after, ts   [audit row optional]
  ▼
revalidateTag('settings')  → invalidates unstable_cache('settings')   [< 2s site-wide]
  ▼
getSetting(key) [lib/settings.ts]  → unstable_cache, tag 'settings'
  ├─ ThemeProvider → injects --primary/--accent/--background/--font as CSS vars
  ├─ Pricing reads shippingRate + pricing.surcharges → lib/calculation.ts
  │     baseCost × tier (from ShippingRate.tier) + surcharges%  → convert via ExchangeRate
  └─ Text/content → next-intl messages composed from settings (CONTENT)
```

Caching: `unstable_cache(() => db... , ['settings'], { tags: ['settings'] })`. Every mutation revalidates the tag. Result: zero hardcoded values; admin changes propagate without rebuild/deploy.

---

## [ARCHITECTURE] — feature-based, surgical (no micro-files)

```
app/
  (admin)/command-center/[tab]/page.tsx     # ONE route, tabs driven by params + settings nav config
  (dashboard)/admin/guide/page.tsx          # Smart Live User Guide (point 12) — reads PROJECT_MAP.md + SystemSetting + Roles
  (admin)/layout.tsx                        # shell: dual-sidebar (Phase 2 portal) / admin nav
  api/admin/settings/route.ts               # GET all | PUT {key,value} (+category guard)
  api/admin/rates/route.ts                  # CRUD ShippingRate
  api/admin/ports/route.ts                  # CRUD Port
  api/admin/carriers/route.ts               # CRUD Carrier
  api/admin/exchange-rates/route.ts         # CRUD ExchangeRate (+autoUpdate toggle)
  api/admin/integrations/route.ts           # vault CRUD (masked, encrypted) + test-connection
  api/admin/audit/route.ts                  # audit log reader
  login/page.tsx                            # Auth.js v5 credentials (role-gated)
  preview/page.tsx                          # live "Rate Card" proving site-wide reflection (G1–G3)
components/
  ui/*                                      # shadcn components
  admin/*                                   # per-tab blocks (DataTable generic, ColorPicker, KeyValueEditor)
  theme-provider.tsx                        # injects DB colors as CSS vars (client)
lib/                                        # ← ONLY repeated logic lives here
  prisma.ts                                 # singleton client
  settings.ts                               # getSetting/getSettings/setSetting + cache tag + encryption
  calculation.ts                            # PURE: freight math (air chargeable, LCL CBM, totals)
  auth.ts                                   # Auth.js v5 config + RBAC (required single file)
  validation.ts                             # zod schemas shared by routes/forms
  log.ts                                    # pino wrapper (async)
middleware.ts                               # auth guard + role gate (ADMIN/CLIENT/STAFF)
prisma/
  schema.prisma
  seed.ts                                   # SystemSetting defaults (the ONLY place defaults live)
```

**Folder budget:** Phase 1 ≈ 15 app files + 5 lib files + shadcn components. No folder-per-button, no micro-services, no `src/features/**` explosion.

---

## [VERIFIABLE_GOALS] — Phase 1 (acceptance criteria)

| # | Goal (Go/No-Go) | Verify by |
|---|---|---|
| G0 | `npm run db:migrate && npm run db:seed`; login as seeded ADMIN; `/admin/*` opens; CLIENT role is blocked (403) | manual + middleware unit |
| G1 | Appearance Studio: primary `#004fba → #FF0000`, Save → CSS var `--primary` flips; header/buttons red on `/admin` + `/preview` in <2s, no rebuild | browser + timing |
| G2 | Exchange Manager: set USD→SAR = 3.75 → preview converts; change to 4.00 → instant update | browser |
| G3 | Rates tab: FCL 20GP base 1000→1250 (JED→DMM) → Instant Quote preview = 1250 × tier × surcharges, instant | browser |
| G4 | Every settings save writes audit entry (actor, key, before→after, ts); Integration keys masked (`****last4`) | DB + UI |
| G5 | `npm run build` + `tsc --strict` + lint pass; **no business value in code** (grep audit); values survive restart | CI/local |

---

## [PUBLIC_LANDING_SHIPPED] — 2026-08-12 (Phase 3: public pages)

Delivered against the UX Kit design tokens — **all numbers real** (Prisma/Ship24), zero mocked stats.

**Routes**
- `/` — Landing (hero-bg gradient, glass navbar, live tracking form, Services tabs from `content.services`, Why-Us grid from `content.whyus`, Partners marquee, Testimonials, FAQ accordion, Contact→Ticket, Footer, floating WhatsApp/call buttons).
- `/track/[ref]` — public tracking timeline (`ShipmentEvent`), status badge + pulse on the current milestone, ETA, route. `force-dynamic`.
- `/login` · `/quote` · dashboard shell etc. unchanged.
- `app/not-found.tsx` — branded 404.

**Schema additions (migration `20260812_add_landing_support`)**
`Partner`, `Testimonial`, `Faq`, `Ticket`+`TicketMessage`, `ShipmentEvent`, `Notification`, `Backup`, `OtpVerification`, `RateLimitHit`. Seed includes 6 demo partners, 3 testimonials, FAQs, 2 realistic demo shipments (IN_TRANSIT + DELIVERED with events) and 1 demo customer.

**Server actions (all zod-validated + rate-limited + audited)**
- `lib/actions/tracking.ts` `trackShipment` — Prisma lookup first; Ship24 webhook lookup when configured (`SHIP24_API_KEY`/`SHIP24_TRACKING_ID`), creates `Shipment` + events; rate limit 10/5min/IP via `RateLimitHit`.
- `lib/actions/tickets.ts` `createTicket` — public contact form → `Ticket` (customer created on the fly); rate limit 5/10min/IP.
- `lib/actions/settings.ts` `updateSetting`, `updateManySettings` — admin-only (session role), `zod` coerce (string/number/boolean/JSON), audit via `lib/log.ts`.

**CSS/Motion tokens (from UX Kit, driven by Appearance settings, no hardcode)**
`app/globals.css`: `.hero-bg` (uses `--hero-gradient`), `.glass-panel` (`--glass-bg`/`--glass-blur`), `.card-hover` (`--card-hover-lift`/`--card-hover-shadow`), `.pulse-ring`, `.animate-marquee` + `.marquee-mask`. `lib/theme.ts` `buildTheme()` emits `--hero-gradient`, `--gradient-text`, `--glass-*`, `--card-hover-*`, `--pulse-*`, `--marquee-duration` from `appearance.heroGradient*`, `appearance.glass*`, `appearance.cardShadow*`, `appearance.pulse*`, `appearance.marqueeDuration`. Added `getJson` for content arrays.

**Verify:** `npx prisma db seed` → `npx tsc --noEmit` → `npx next build` → `npx next start`. Smoke: `/` 200 · `/track/ALO-2026-0007` 200 (IN_TRANSIT, 3 milestones) · `/track/ALO-2026-0002` 200 (DELIVERED, 5) · `/track/ZZZ-9999` 404 · `/dashboard` 307→login.

**Remaining from original Phase-3 scope (tracked in ORPHANS below):** Mapbox GL live map, Auth-Gate modal on quote, Instant Quote form, i18n AR/RTL, Ship24 auto-poll cron, WhatsApp/Twilio notifications.

---

## [QUOTE_ENGINE_SHIPPED] — 2026-08-13 (Phase 2: Instant Quote + Auth Gate)

Delivered the first Phase-2 milestone — live 3-tier quote engine, ZERO hardcoded values.

**Route**
- `/quote` — rewritten: hero band + glass form panel. Mode tabs FCL / LCL / AIR. FCL: container counters (20GP/40GP/40HC + quantity stepper). LCL/AIR: cargo dimensions grid (L×W×H cm, qty, gross weight kg). Output = 3-tier cards (Economy/Standard/Express) with full transparent breakdown (base + BAF + THC ×2 + fuel + insurance + margin), chargeable volume, and validity window. Live conversion USD→display currency via `ExchangeRate`.

**Server actions** (`lib/actions/quote.ts`, zod + rate-limited + audited)
- `instantQuote` — public, computes all 3 tiers from `ShippingRate` × `pricing.surcharges` × `ExchangeRate`. FCL base = rate × containers; LCL = rate/CBM × `lclChargeable`; AIR = rate/kg × `airChargeable` (IATA 6000 divisor, volumetric). Rate limit `limits.quotePerMinute` (10/min/IP).
- `requestQuote` — **auth-gated** (`auth()` server check, never trusts client totals — recomputes the lane). Creates `Quote` (status PENDING, sequential `ALO-{year}-NNNN`, `validUntil` = `pricing.quoteValidityHours`), attaches/creates `Customer` by session email, writes `Notification` + audit.

**Auth Gate** (`components/quote/auth-gate-dialog.tsx`) — signed-out visitors clicking "Book this rate" get a modal with embedded login; on success the pending booking fires automatically. `LoginForm` gained optional `redirectTo`/`onSuccess`.

**Seed additions** (`prisma/seed.ts`, idempotent per-lane upsert — no wipe): LCL JED→DMM/DXB (per CBM), AIR JED→RUH/LHR (per kg) ×3 tiers; `limits.quotePerMinute` setting. Verified: FCL 40GP STD JED→DMM = 9,150.94 SAR; LCL 1 CBM STD = 1,787.63 SAR; AIR volumetric weight applies.

**Remaining Phase-2:** @react-pdf quotation → **SHIPPED** as PDF quotation document (`components/quotes/quote-pdf.tsx`, pdfmake — mirrors invoice PDF; button on `/quotes/[id]`, includes company header, cargo, cost breakdown, totals, validity, terms). All Phase-2 items now delivered.

---

## [CLIENT_PORTAL_SHIPPED] — 2026-08-13 (Phase 2: Client Portal)

Role-based portal (ADMIN/STAFF/CLIENT): middleware guard on `/customers /settings /integrations`, role-aware sidebar + dashboard, client data scoping via `lib/authz.ts` `getScope()`, ticket creation + replies, `invoices/[id]` with line items + PDF download (pdfmake), seeded CLIENT user `ops@sauditech.example`.

## [NOTIFICATIONS_SHIPPED] — 2026-08-13 (Phase 2: In-app notifications)

`lib/notify.ts` (`notifyUser` / `notifyOps` / `notifyCustomerByEmail`) wired into booking/shipment/invoice/ticket actions; bell UI with unread badge + mark-all-read.

## [REPORTS_SHIPPED] — 2026-08-13 (Reports & Analytics)

`/reports` (ops-only): KPIs, monthly revenue bars, by-status/mode/tier, top lanes/customers, outstanding invoices, quote conversion; date/mode/status filters; Excel export (exceljs) + PDF export (pdfmake) via `components/reports/reports-export.tsx`. Guarded in middleware + sidebar nav.

## [QUOTE_EXPIRY_CRON_SHIPPED] — 2026-08-13

`scripts/cron-expire-quotes.mjs` — flips PENDING quotes with passed `validUntil` to EXPIRED, notifies ops + customer. Run `pnpm cron:quotes` (loop, 15 min) or `pnpm cron:quotes:once`. Tested: Q-2026-0102 PENDING→EXPIRED→restored.

## [PHASE_3_SHIPPED] — 2026-08-13 (Provider Pattern: Integrations + Tracking + i18n + Alerts)

**Integration Provider Pattern (core of Phase 3).** Every third-party key resolves in order: **1. SystemSetting** (editable, encrypted at rest) → **2. process.env** → **3. console print (trial mode — never breaks the site)**.

- `lib/integrations.ts` — `resolveIntegration({settingKeys, envKeys, secret})` returns `{value, source: "setting"|"env"|"none"}`; concrete providers `getMapboxToken` / `getShip24Key` / `getTwilioCreds` / `getWhatsAppKey` (compat fallbacks: `integration.mapbox.publicToken`, `integration.tracking.apiKey`, `integration.twilio.authToken`).
- `lib/crypto.ts` — **pure** AES-256-GCM vault (no server-only imports) so standalone crons share the same encryption as the app; `lib/settings.ts` delegates `encryptSecret/decryptSecret/maskSecret/isEncrypted` to it.
- `lib/actions/integrations.ts` — `saveIntegrationKey` / `clearIntegrationKey` (admin-only, encrypts secrets, audit via `setSetting`). Registry of keys lives in `lib/integration-keys.ts` (shared client+server — NOT in the "use server" file).
- `lib/notify.ts` — refactored to provider: Twilio SID/token/from + WhatsApp key (whatsapp key overrides Twilio token on the whatsapp channel); no-op + console when unconfigured.

**Command Center** — `app/(dashboard)/admin/command-center/page.tsx` (middleware OPS_ONLY + matcher now include `/admin/:path*` and `/reports/:path*`). Tabs: **Integrations** (editor for Mapbox GL Token, Ship24 API Key, Twilio SID/Auth Token/Sender, WhatsApp Business Key — shows per-key active source SystemSetting vs process.env) + **Status** (provider table). Sidebar: Command Center under Configuration.

**Tracking map** — `components/track/tracking-map.tsx`: Mapbox GL loaded via CDN script/CSS injection (no npm dep) with markers + dashed route line; **static SVG fallback** (port-to-port route + legend + "token not configured" hint) when no token. Wired into `/track/[ref]` with `tracking.portGeo` (port code → [lat,lng], seeded for JED/DMM/DXB/RUH/LHR) + tracking chip (provider + tracking number).

**Ship24 auto-poll cron** — `scripts/cron-ship24.ts` (tsx, shares lib/crypto): resolves key via provider, polls shipments with `trackingProvider="ship24"` & `trackingNumber` & not DELIVERED/CANCELLED older than `ship24.pollIntervalMinutes`, creates missing `ShipmentEvent`s, forwards-only status upgrades, `lastTrackedAt` guard, notifies ops+customer on change. `pnpm cron:ship24` (loop) / `pnpm cron:ship24:once`. Verified: trial-mode exit 0 with no key; `setting:integration.ship24.api_key` source after storing an encrypted key; graceful 401 handling with a bad key. Schema migration `add_shipment_tracking` adds `trackingNumber`, `trackingProvider` (@default "ship24"), `lastTrackedAt`, `externalStatus` to `Shipment`.

**i18n AR/RTL** — `lib/i18n.ts` dict (EN/AR), `lib/actions/locale.ts` `setLocaleAction` (sets `alola_locale` cookie for guests + persists `defaults.language` when signed in), `components/shell/locale-switcher.tsx` (EN/ع pill, in topbar + landing navbar + track header). Root layout + dashboard layout + landing + track all honor cookie → setting; `<html lang dir>`; Noto Sans Arabic loaded and applied for RTL; dashboard sidebar labels translated. (Decision: settings-driven dict instead of next-intl; Mapbox via CDN instead of npm dep — see ORPHANS.)

**Verified:** typecheck + lint clean; `next build` green; smoke on `:3001` — `/track/ALO-2026-0007` anon 200 (tracking chip `MSCU4471280`, live-map card, SVG fallback), `alola_locale=ar` → `lang="ar" dir="rtl"` + Arabic labels, `/admin/command-center` anon 307→login / client 307→/dashboard / admin 200 (editor SSR renders Mapbox/Ship24/Twilio/WhatsApp fields + Command Center nav), admin dashboard RTL with Arabic nav when cookie=ar, cron provider-chain verified end-to-end (encrypted SystemSetting → decrypt → resolver).

---

## [SMART_GUIDE_SHIPPED] — 2026-08-13 (point 12: Live User Guide + Integrations Test + CSV)

**Live guide (`/admin/guide`)** — `app/(dashboard)/admin/guide/page.tsx` (`force-dynamic`, ops-only via middleware). Reads **PROJECT_MAP.md** at request time (fs), **SystemSetting** (73 keys grouped by category, incl. `guide.version` seeded 1.0.0), the **Role enum** (ADMIN/STAFF/CLIENT grants matrix) and live **Backup** history. Renders the 13-point feature-status table, settings breakdown, and the full markdown doc via a local renderer (headings/lists/tables/code/blockquote — no extra deps). Role-aware sidebar entry ("Live Guide", `nav.liveGuide` EN/AR) under Configuration; middleware OPS_ONLY now gates `/admin/guide`.

**Integration Test (Command Center → Integrations)** — `lib/actions/integrations.ts` `testIntegrationKey(keyId)`: admin-only, resolves the live key via the provider chain (SystemSetting → env → none), performs a **real HTTP probe** per provider — Mapbox `tokens/v2`, Ship24 `trackers?limit=1` (Bearer), Twilio `Accounts/{sid}.json` (Basic), WhatsApp Meta Graph `/me` — with 9s `AbortSignal.timeout`, try/catch, pino logging + audit entry (`integration:test`). `components/admin/integrations-editor.tsx` adds a **Test** button per field with inline pass/fail message + spinner (uses `ZapIcon`, `useState` result map).

**CSV export** — `components/reports/reports-export.tsx` gains **Export CSV** (shipments table, RFC-4180 escaping) alongside Excel + PDF. Reports now exports Excel / PDF / CSV.

**Seed:** `guide.version` SystemSetting (DEFAULTS category, description "increments with each Backup").

**Verified:** `tsc --noEmit` clean · lint clean (1 pre-existing `<img>` warning in `app/page.tsx`) · `next build` green with `/admin/guide` compiled as ƒ dynamic · smoke: `/admin/guide` anon → 307 (login) · `/` 200 · data-layer check: PROJECT_MAP.md 18.5k chars readable, 74 settings in DB, backups count = 0. (Note: pnpm store for `next` was corrupted on this machine — fixed via `pnpm install --force`; not a code issue.)

---

## [SELF_SERVICE_AUTH_SHIPPED] — 2026-08-13 (Public registration + account)

Self-service phone-OTP registration, polished auth screens, and the calculator → register → book loop. ZERO hardcoded values; all auth via Auth.js v5 + Prisma.

**Routes**
- `/register` (`app/(auth)/register/page.tsx`) — glass-panel form on `hero-bg`. Step 1: name / email / password / country-code + mobile; Step 2: 6-digit OTP with 2-min expiry + resend countdown. `sendOtp` + `verifyOtpAndRegister` (`lib/auth.ts`, zod + rate-limit 5/60s per phone + audit `OTP_SENT`/`REGISTER`); delivery chain WhatsApp (Twilio) → SMS → console log. Auto sign-in via credentials after registration → `/dashboard`.
- `/login` (`app/(auth)/login/page.tsx`) — same shell, links to `/register` + home. `auth.ts` `pages.signIn` → `/login`; middleware redirects signed-in users away from `/login`/`/register`.
- `/account` (`app/(dashboard)/account/page.tsx`) — all roles. Profile edit (name/email, uniqueness check) + change password (verifies current via bcrypt) via `lib/actions/account.ts` (`UPDATE_PROFILE`/`CHANGE_PASSWORD` audit). Phone is immutable (verified identity). Sidebar "My account" (`nav.account`) + user-menu entry.

**Calculator → register loop** (`components/quote/quote-form.tsx`, `components/dashboard/quote-draft-banner.tsx`)
- "Get a Quote" button after results saves `alola_quote_draft` (mode, route, container/qty, weight, CBM, LWH, savedAt) to localStorage; signed-out → `/register?from=calculator`, signed-in → `/dashboard`.
- Dashboard banner reads the draft and shows *"مرحباً، هذه هي تكلفة شحنتك"* + details + **احجز الآن** (→ `/quote`) + dismiss.
- `/quote` prefills the form from the draft (mode/origin/destination/container/qty/dims) so booking continues where the visitor left off. Auth-Gate modal now also offers *Create an account* (`/register?from=quote`) and post-registration routes back to `/quote` to book.

**Verified:** `tsc --noEmit` clean · `next build` green (20 pages) · smoke on `:3001` — `/login` `/register?from=calculator` `/register?from=quote` `/quote` all 200; `/account` `/dashboard` 307→login anon; admin credentials login → `/dashboard` `/account` `/settings` `/shipments` `/quote` all 200.

---

## [ORPHANS & PENDING] — deferred by No-Feature-Creep

- **Phase 2:** Client Portal, Auth Gate Modal, Instant Quote form (FCL counters / LCL–AIR grid), 3-tier output, 24h expiry cron, @react-pdf quotation, Bookings/Invoices/Support. → **Instant Quote + Auth Gate SHIPPED**; **Bookings/Invoices/Support SHIPPED**; **Client Portal SHIPPED** (role-based, scoped data, PDF invoices, tickets); **24h expiry cron SHIPPED** (`scripts/cron-expire-quotes.mjs`); **Reports & Analytics SHIPPED** (`/reports` + Excel/PDF/CSV export); **PDF quotation SHIPPED** (`components/quotes/quote-pdf.tsx`). Phase 2 complete.
- **Phase 3 (remaining):** Public pages shipped (see [PUBLIC_LANDING_SHIPPED]); Mapbox GL tracking map (GeoJSON + lifecycle timeline), Ship24 auto-poll cron (webhook in place), i18n AR/RTL + next-intl, WhatsApp/Twilio alerts. → **ALL SHIPPED** (see [PHASE_3_SHIPPED]): Mapbox GL via **CDN injection** + SVG fallback (npm `mapbox-gl` skipped — registry reliability; v3.5.1 CDN pinned), i18n via **settings-driven dict + Noto Sans Arabic** (npm `next-intl` skipped — same reason), Ship24 cron as tsx script (`pnpm cron:ship24`), WhatsApp/Twilio alerts via provider-pattern `lib/notify.ts`. Phase 3 complete.
- **Point 12 (Guide):** `/admin/guide` → **SHIPPED** (see [SMART_GUIDE_SHIPPED]); tied to `guide.version` SystemSetting; **Backup Now / restore / Realtime-SWR still pending (point 7)** — when shipped, `guide.version` will increment with each backup.
- **Deferred integrations:** WhatsApp/Twilio, Ship24 auto-poll (webhook ready), Moyasar payments, ExchangeRate auto-fetch (needs key — stub toggle now). → **Integration Test buttons SHIPPED** (Command Center → Integrations, per-provider HTTP probe).
- **Ideas (rejected for now):** HS-Code AI assistant, Carbon tracker, OCR documents, microservices, multi-tenant.
- **Migration path:** Next 14.2.35 → 16 (EOL risk), Prisma 5 → 7 (post-Phase-3, isolated), TS 5 → 6.
