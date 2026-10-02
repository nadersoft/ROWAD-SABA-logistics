# PROJECT_MAP — Rowad Sabaa Logistics Platform (Command Center)

> **Generated:** 2026-08-11 | **Updated:** 2026-09-22 | **Status:** PHASE 1 + 2 + PUBLIC LANDING SHIPPED | **Phase 3 COMPLETE** (Provider Pattern) | **Guide + Integrations Test + CSV SHIPPED** | **Self-Service Auth v2.1 SHIPPED** (optional phone + email OTP + add/verify phone on /account — cp-010) | **SMART PRICING ENGINE SHIPPED** (REQUIREMENTS_GOLD 1-10 COMPLETE — cp-008) | **ZERO-DEFECT v5 FINAL SHIPPED** (email-only register + readable colors + chat disabled + real WhatsApp icon — cp-012) | **EXECUTION ENGINE BUGFIXES SHIPPED** (BUG-1…6 mapped to real files, isActive toggle persistence fix — cp-013)
> **Alola OS:** الذاكرة الدائمة في `PROJECT_MAP.md` + `CHECKPOINTS.md` + `REQUIREMENTS_GOLD.md`؛ آخر نقطة استعادة `cp-013` (أرشيف `PROJECT_MAP.cp-012.md` + `schema.cp-009.prisma`).
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
  ├─ FloatingActions [app/layout.tsx] → getFloatingProps(map) — floating_enabled master + show_whatsapp/show_call/show_livechat (gated by `floating.enabled &&`)
  ├─ Pricing reads shippingRate + pricing.surcharges → lib/calculation.ts
  │     baseCost × tier (from ShippingRate.tier) + surcharges%  → convert via ExchangeRate
  └─ Text/content → next-intl messages composed from settings (CONTENT)
  └─ CMS sections [app/page.tsx] → getSectionWithItems('services_list') → CmsPage › CmsSection › CmsItem
        rows → services-section.tsx (icon via serviceIcon = lucideIcons[item.icon]) — admin edits in /admin/cms
        revalidate instantly (revalidatePath('/', 'layout') from lib/actions/cms.ts; page is force-dynamic)
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

## [SMART_PRICING_ENGINE_SHIPPED] — 2026-08-13 (REQUIREMENTS_GOLD 1-10 COMPLETE — cp-008)

All 10 gold requirements delivered with evidence (file exists + `npm run build` green + curl smoke). Smart pricing engine, field engine, country/port/currency master data, RBAC users, and the guaranteed guards.

**Engine** — `lib/engine/ruleMatcher.ts`: `ruleMatchPct` (100 = lane+container / 90 = lane / 70 = mode), `weightInRange`, `computeBreakdown` = `baseRate×containers + Σ enabled fields (flat / % on subtotal) + FOB/EXW + weight×weightRate` (gold formula #9), `matchBestRule` (tie-break by priority). `lib/engine/smartGuard.ts`: `analyzeRule` (FCL w/o container / DG·Reefer zero fee HIGH, below-base CRITICAL, thin margin <5%/>70% MEDIUM, same-port INFO), `runSmartGuard` (CRITICAL overlap via laneKey, persists/auto-resolves `SystemAlert` in a transaction, `guardHealthBadge` 🟢🟡🔴).

**Admin UI** — `/admin/pricing` (PricingMatrix: rules / field definitions / system alerts tabs, health banner, Smart Guard report with **Profit% + Impact**, mode icons FCL=Box LCL=Package AIR=Plane BULK=Ship + Reefer Snowflake badge). `/admin/settings` (Countries + Ports + Currencies CRUD, Set-default currency). `/admin/users` (CRUD, isActive, reset password, self-protection, min SUPER_ADMIN).

**Actions** — `lib/actions/{fields,pricing,users,countries,currencies}.ts`: all OPS-guarded, `$transaction` + AuditLog; pricing calls `runSmartGuard()` after every mutation; delete field blocked while referenced (no ghost data); delete country/port guarded by usage.

**Schema (migration `20260813195224_add_country_currency_pricing_engine`)** — `Country`, `Currency`, `FieldDefinition`, `PricingRule`, `PricingRuleField` (real relation, `@@unique([ruleId, fieldId])`, onDelete Cascade), `SystemAlert`, `User.isActive`, `Port.countryId` (replaces string `country`). Seed: 6 countries, 7 currencies, 8 ports, 5 fields, 1 rule ("FCL — Jeddah → Dammam (40GP)").

**Client UX** — `/auth/register` (was `/register`), calculator CTA → `/auth/register?from=calculator`, `/settings` cascading Country→Port + display currency from DB (`components/settings/master-data-picker.tsx`), Wallet page + Excel/CSV export, notification bell SWR-realtime (`/api/notifications`). RBAC middleware: `STAFF_ONLY=["/customers","/support"]`, `OPS_ONLY=["/settings","/integrations","/reports","/admin"]`, disabled users (`isActive=false`) → `/login` + cookie clear.

**Verified (cp-008):** `npm run build` green (24 routes, 0 lint/type errors) · smoke on `:3799`: `/` `/auth/register` `/quote` `/login` 200; `/dashboard` `/admin/*` `/wallet` `/settings` `/support` `/customers` 307→login; `/api/notifications` 401; unknown ref 404 · CSS 116,240 B ≥ 101KB · DB counts 6/7/8/5/1/4.

---

## [SELF_SERVICE_AUTH_V2_SHIPPED] — 2026-08-14 (Optional phone + email OTP — cp-009)

Registration is now channel-optional: the visitor picks **WhatsApp/SMS** (phone + OTP via Twilio→console) or **Email** (OTP via Resend→console), both with the 2-min smart OTP, rate-limit 5/60s, and dev simulated-code banner. Phone is no longer mandatory to sign up.

**Channel logic (`lib/auth.ts`)** — `sendOtp` / `verifyOtpAndRegister` take `email` always; `countryCode`+`phone` only when the phone channel is chosen. Identifier + `channel` ("phone"/"email") decide the delivery and the OTP lookup. `User.phoneVerified` is set `true` when registering via phone; email-only accounts get `emailVerified` instead. Duplicate checks are per-channel (`phone` or `email`).

**Shared country directory** — `lib/data/countries-with-phone.ts` exports `COUNTRIES_PHONE` (150+ countries, flags + dial codes, **Yemen first** priority 1, Saudi priority 2, then A–Z) and `DEFAULT_DIAL_CODE`. `register-form.tsx` now imports it instead of its own hardcoded 18-country list.

**Email delivery (provider pattern)** — `lib/integration-keys.ts` adds `resend.key`/`resend.from`; `lib/integrations.ts` adds `getResendCreds()`; `lib/auth.ts` `deliverEmailOtp` calls the Resend API and falls back to console log (trial mode — never breaks). `app/(dashboard)/integrations/page.tsx` shows a Resend card; command-center `getEnvFallback` covers the new keys.

**Parallel dev/prod ports** — both `next dev -p 3101` and `next start -p 3001` share the working dir; `next.config.js` now sets `distDir: NODE_ENV==='production' ? '.next-prod' : '.next'` (Dockerfile updated to `.next-prod` paths) so the two no longer clobber each other.

**Schema (migration `20260814120000_add_user_phone_verified`)** — `User.phoneVerified Boolean @default(false)`.

**Verified (cp-009):** `next build` green (28 routes, 0 lint/type errors) · smoke on `:3001`: `/` `/auth/register` `/quote` `/login` 200; `/dashboard` `/admin/*` `/wallet` `/settings` `/support` `/customers` `/integrations` 307→login; `/api/notifications` 401; unknown ref 404 · built CSS 128,278 B ≥ 101KB · migration deployed, DB up to date (9 migrations).

---

## [SELF_SERVICE_AUTH_V2_1_SHIPPED] — 2026-08-15 (Add/verify phone later on /account — cp-010)

Email-only signups can now add and verify a phone number from `/account` — no need to re-register. A "Verify your phone" card renders only when `User.phoneVerified` is `false`.

**Flow** — `components/account/phone-verification-card.tsx`: shared country picker (`COUNTRIES_PHONE`) + phone → `sendPhoneOtp` → 6-digit OTP via WhatsApp/SMS (Twilio→console, dev simulated-code banner) → `verifyPhone` marks `phoneVerified=true` with `phone` + `countryCode` in one `$transaction` + `PHONE_VERIFIED` audit + in-app notification. `components/account/account-form.tsx` shows a dashed "no verified phone yet" hint in Profile when unverified (verified users keep the read-only badge). `/account` page passes `phoneVerified` + `isDev`.

**Shared OTP module** — `lib/otp.ts` (new) centralizes `normalizePhone`, `deliverOtp`, `deliverEmailOtp`, `persistOtp`, `OTP_MAX_ATTEMPTS`. Both registration (`lib/auth.ts`) and account (`lib/actions/account.ts`) import it — the earlier duplicate delivery code is gone.

**Actions** — `lib/actions/account.ts` adds `sendPhoneOtp` (auth guard + zod + rate-limit 5/60s + duplicate-phone check + audit `PHONE_OTP_SENT`) and `verifyPhone` (auth guard + OTP lookup/expiry/attempts + `$transaction` persist + `PHONE_VERIFIED` audit + notification).

**Verified (cp-010):** `next build` green (28 routes) · `tsc --noEmit` clean · lint clean (pre-existing `<img>` warning) · DB-level OTP flow test PASS (email-only user → persist OTP → verify → `phoneVerified:true`, script removed after) · smoke on `:3001`: public routes 200, protected 307, `/api/notifications` 401, unknown ref 404 · built CSS 130,693 B ≥ 101KB · no new migration (schema unchanged from cp-009) · prod `:3001` + dev `:3101` running in parallel.

---

## [ZERO_DEFECT_V5_FINAL] — 2026-08-15 (Email-only register + readable colors + chat disabled + real WhatsApp icon — cp-012)

Four zero-defect fixes, build-locked and verified:

**A1 — Email-only register (`components/auth/register-form.tsx`):** the WhatsApp/SMS↔Email toggle, the country `select`, the phone input, and their `usePhone`/`channel` state are gone. The form now collects only Full name + Email + Password and submits via **"Send code by email"** (`sendOtp` with email only; `verifyOtpAndRegister` with name/email/password/otp). No change to `lib/auth.ts` — its phone-optional schema already accepts email-only registration, so backward compat (login by email OR phone for old users, `/account` phone add) is untouched.

**A2 — Readable colors (same file):** the glass panel became a white card (`bg-white rounded-2xl shadow-xl border-slate-200`) with `text-slate-900` heading, `text-slate-800` labels, `text-slate-900 border-slate-300` inputs, `text-slate-600` helper/resend text, and blue links. No more white-on-dark text. `app/(auth)/auth.css` untouched.

**A3 — Floating chat disabled (`app/layout.tsx`):** `<FloatingActions {...floating} />` wrapped in `{false && ...}` with the comment `TODO: enable via admin - will be replaced by DB setting when model Setting is created - currently disabled per requirement CP-011 A3`. `getFloatingProps` stays (no unused var); no new `Setting` model, no `NEXT_PUBLIC_*`.

**B4 — Real WhatsApp icon (`components/icons/whatsapp.tsx`, new):** official-style SVG with `#25D366` fill (`WhatsappIcon`, takes `size` + `className`). Used in the "Verify your phone" section of `/account` (`components/account/phone-verification-card.tsx` card title) replacing lucide's generic `Phone` icon. (`app/(dashboard)/account/page.tsx` has no Phone icon — the section lives in the card component, which is what renders on `/account`.)

**Verified (cp-012, order per spec):** `npx prisma generate` EXIT 0 (servers stopped first — Prisma DLL was locked) → `npm run typecheck` (`tsc --noEmit`) EXIT 0 → `npm run lint` EXIT 0 (pre-existing `<img>` warning only) → `npm run build` green, **28 routes**. Manual on `:3001`: `/auth/register` 200 with "Send code by email" present, no WhatsApp/SMS toggle, no countryCode select, `bg-white`/`text-slate-900`/`text-slate-800`/`text-slate-600` in HTML; `/` 200 with no `wa.me`/livechat anchors (floating buttons gone); `#25D366` present in `.next-prod/static/chunks/app/(dashboard)/account/page-*.js`. No DB migration (schema cp-009/010 unchanged). Prod `:3001` + dev `:3101` running. Archive `PROJECT_MAP.cp-012.md` saved.

---

## [EXECUTION_ENGINE_BUGFIXES_SHIPPED] — 2026-08-15 (BUG-1…6 mapped to real files — cp-013)

Execution-Engine prompt applied with the **"map to real files, keep compat"** decision (the prompt's assumed paths don't exist in this repo). No regression to cp-010/012 features.

- **BUG-1 — "Invalid input" is already specific:** `lib/auth.ts` `registerSchema` uses `name` (not `fullName`), `min(2, "Enter your full name")` with **no digit-rejecting regex** — `name` hardened `max(80)→max(50)`. `phone`/`countryCode` stay optional (email-only safe; preserves phone flow). `verifyOtpAndRegister` already returns `parsed.error.issues[0]?.message`; the email-only form already toasts the specific message.
- **BUG-2 — readable colors + i18n:** `/login` converted from `glass-panel` white-on-dark to the white card matching register (`bg-white rounded-2xl border-slate-200`, `text-slate-900`, inputs `bg-white text-slate-900 border-slate-300`). i18n AR/EN already shipped in `lib/i18n.ts` (EN_DICT/AR_DICT) + `dir={locale === "ar" ? "rtl" : "ltr"}` in `app/layout.tsx:53-54` — verified, nothing duplicated.
- **BUG-3 — WhatsApp + Phone icons in footers:** new `components/icons/phone-call.tsx` (`PhoneCallIcon`, lucide phone path, `currentColor`). Both footers now render `tel:` + `wa.me` links using settings `content.contact.phone` + `floating_whatsapp_number` (with legacy `appearance.floatingWhatsapp*` fallback): home footer "Connect" column (`app/page.tsx`) and new icon footer under the auth card (`app/(auth)/layout.tsx`, async + `getAllSettings`).
- **BUG-4 — Active toggle persistence (root cause):** `components/ui/switch.tsx` is a **Radix `<button>`** — its value never serializes into FormData, so every `update*` read `isActive` as absent → `false` (this is exactly why YE landed `isActive:false`). Fixed in all dialogs with **controlled switch + hidden input** `value={active ? "true" : "false"}`: `master-data.tsx` (country/port/currency), `users-manager.tsx` (user), `pricing-matrix.tsx` (rule `isActive`, field `isEnabled`). Added `revalidatePath` after every mutation in `lib/actions/{countries,currencies,users,pricing,fields}.ts`. **Seed:** Yemen `{code:"YE", dialCode:"+967"}` added to `COUNTRIES` (no `priority` column in the model — skipped). DB row for YE set `isActive:true` (was created inactive by the buggy switch).
- **BUG-5 — Origin CRUD & display currency:** already satisfied — `components/settings/master-data-picker.tsx` + `app/(dashboard)/settings/page.tsx` read `prisma.country/currency where isActive:true` and persist via `saveSettingsAction`. Per protocol created **single source** `lib/data/get-active-data.ts` (`getActiveCountries/Ports/Currencies/ContainerTypes`) and wired it into the settings page. `lib/data/countries-with-phone.ts` kept (used by `/account` phone verify — compat).
- **BUG-6 — chat disabled:** already done (cp-012) — `app/layout.tsx:64-65` `{false && <FloatingActions .../>}` + TODO comment. Verified: no `fixed bottom-6` widget in `/` HTML.

**Verified (cp-013, order per spec):** `npx prisma generate` EXIT 0 → `npx tsc --noEmit` EXIT 0 → `npm run lint` EXIT 0 (pre-existing `<img>` warning only) → `npm run build` green, **28 routes** · manual on `:3001` (server restarted, PID 8980): `/` 200 with `wa.me` + `tel:` + WhatsApp/Phone icons, no floating chat · `/login` white card, no `glass-panel` · `/auth/register` 200 (white card, no phone field) · NextAuth login flow → `/admin/settings` 200 with all tabs + Yemen listed · `/settings` 200 origin picker includes Yemen (isActive filter working). No new migration (schema unchanged). Prod `:3001` running.

---

## [REGISTRATION_BUILDER_SHIPPED] — 2026-08-16 (Migration + Registration Builder + Customer Tracking)

Closed the DB-sync gap and shipped the admin-driven registration builder + customer tracking. `RegistrationPageConfig`, `RegistrationFieldConfig`, `UserProfile` are no longer orphans.

**Migration** — `20260816120000_add_registration_builder_and_user_profile` (created via `prisma migrate diff` + `db execute` + `migrate resolve` because the shell has no TTY for `migrate dev`). Tables: `UserProfile` (userId unique FK→User onDelete Cascade, country, originCountry, city, address, updatedAt), `RegistrationPageConfig` (bilingual copy + isActive), `RegistrationFieldConfig` (bilingual labels/placeholders/help/tooltips/errors, validationRegex, min/max length, allowNumbers/SpecialChars, isActive/isVisible/isRequired, order). `prisma migrate status`: 10 migrations, DB up to date. Client regenerated (servers stopped first — Prisma DLL was locked).

**Seed (`prisma/seed.ts`)** — idempotent `registrationPageConfig.upsert({id:"default"})` (AR/EN titles, subtitle, submit button, footer/login link, success/error toasts) + `registrationFieldConfig.createMany(skipDuplicates)` for fullName (order 1), email (2), phone (3, optional), password (4). Verified: PageConfig 1 row, FieldConfig 4 rows.

**Registration Builder** — `app/(dashboard)/admin/settings/registration-builder/page.tsx` + `components/admin/registration-builder.tsx` + `lib/actions/registration-config.ts` with **9 RBAC permissions** (`REGISTRATION_BUILDER_VIEW`, `PAGE_CONFIG_UPDATE`, `FIELD_CREATE`, `FIELD_UPDATE`, `FIELD_DELETE` [SUPER_ADMIN only], `FIELD_TOGGLE_VISIBLE`, `FIELD_TOGGLE_REQUIRED`, `FIELD_TOGGLE_ACTIVE`, `FIELD_REORDER`). Every action awaits + `revalidatePath`s `/admin/settings/registration-builder` + `/auth/register`; every toggle and mutation writes `AuditLog`. UI: bilingual page-copy form with enable switch; fields table with move-up/down reorder, Required/Visible/Active toggles (Radix switch → FormData via server action), edit/delete dialogs, add-field dialog (key, labels, placeholders, min/max length, number/special-char toggles).

**DRY (`/register` reads config only)** — `app/(auth)/auth/register/page.tsx` now loads `registrationPageConfig` + active `registrationFieldConfig` (ordered) and passes them to `register-form.tsx`, which renders fields from config (labels/placeholders/required/optional), maps `fullName`→`name` for `lib/auth.ts` compat (unchanged), and falls back to fullName/email/password only if no config rows exist. Builder toggles reflect on `/register` immediately.

**Customer Tracking** — `app/(dashboard)/admin/customers/tracking/page.tsx` + `components/admin/customer-tracking-table.tsx` (Export CSV client-side with BOM) + `lib/actions/customer-tracking.ts` (`getCustomerTracking`, OPS-guarded, CLIENT users + `profile` include, `CUSTOMER_TRACKING_VIEWED` audit). Columns: name, email, phone, country, origin, city, profile updated, account updated.

**Middleware** — `middleware.ts` `OPS_ONLY` extended with `/admin/settings/registration-builder` + `/admin/customers/tracking` (both also covered by the existing `/admin` prefix). Sidebar `CONFIG_NAV` + i18n dict gained `nav.registrationBuilder` (منشئ التسجيل) + `nav.customerTracking` (تتبع العملاء).

**Verified:** migration applied + resolved, DB up to date (10 migrations), registration seed rows present, `prisma generate` EXIT 0.

---

## [UNIFIED_CMS_SHIPPED] — 2026-08-16 (Page builder + prod standalone static fix)

Two-part shipment: **(1) fixed prod :3001 rendering unstyled** (Next.js standalone output was missing `static/` + `public/`), **(2) shipped the unified full-website CMS** (`CmsPage` → `CmsSection` → `CmsItem`).

**Part 1 — prod CSS fix.** Root cause: `next.config.js` = `output: 'standalone'` + `distDir` `.next-prod`; the standalone bundle `.next-prod/standalone/.next-prod/` ships without `static/` (CSS/JS) or `public/`, so every `/_next/static/*` request 404'd on :3001 (dev :3101 was fine — served from its own `.next` tree). Fix: `scripts/copy-standalone.mjs` (cross-platform `cpSync`/`rmSync`) copies `.next-prod/static` → `standalone/.next-prod/static` and `public` → `standalone/public`; wired via `npm run build:prod` (= `next build && npm run copy:standalone`) and `npm run start:prod` (= `node .next-prod/standalone/server.js`, `PORT=3001`). Verified both CSS files 200, JS chunk 200, styled HTML with `z-[9999]` floating icons. **Operational gotcha:** stop the running standalone server BEFORE `next build` (cleanDistDir locks `.next-prod` and hangs the build).

**Migration** — `20260816205319_unified_cms_all_pages` (written by hand + `prisma migrate deploy` — shell has no TTY for `migrate dev`). Tables: `CmsPage` (slug unique, titleAr/En, isActive, `@@index([slug,isActive])`), `CmsSection` (pageId FK→CmsPage onDelete Cascade, key, type, badge/title/subtitle/content (Text) Ar+En, imageUrl, isActive, isVisible, order, `@@unique([pageId,key])`, `@@index([pageId,order])`), `CmsItem` (sectionId FK→CmsSection onDelete Cascade, slug, icon default `package`, titleAr/En, shortLabelAr/En, descriptionAr/En Text, value, subValue, imageUrl, linkUrl, isActive, isVisible, isFeatured, order, `@@unique([sectionId,slug])`, `@@index([sectionId,order])`).

**Seed (`prisma/seed.ts`)** — idempotent upserts (`update: {}`, never clobbers admin edits): 5 pages — `home` (hero + stats: 180+/12M+/99.2%/24-7), `services` (header + `services_list`: FCL 33.2 CBM / LCL / Bulk), `why-us` (header + `why_us_list`), `tracking`, `contact`. Seed run: first full run was killed by a transient Supabase pooler pause mid-loop; re-ran the CMS block standalone to completion (5 pages / 8 sections / 10 items verified).

**Actions (`lib/actions/cms.ts`)** — 17 RBAC permissions (`CMS_VIEW` → SUPER_ADMIN/MANAGER/SUPPORT; writes → SUPER_ADMIN/MANAGER; deletes → SUPER_ADMIN; `CMS_ITEM_FEATURED`/`DUPLICATE`/reorders incl.). Reads: `getCmsPages`, `getPageBySlug`, `getSectionWithItems(key)` (public, active+visible only, used by the landing page). Every mutation `await`s + `revalidatePath('/admin/cms')` + `('/', 'layout')` + `/#<key>` and writes `AuditLog`. `setCmsItemFeatured` = transaction (unset all → set one). `createCmsItem` auto-increments order; `duplicateCmsItem` suffixes slug `-copy`.

**Admin UI** — `app/(dashboard)/admin/cms/page.tsx` (role guard) + `components/admin/cms-builder.tsx`: three panes — Pages (left, add/edit/delete/active toggle) · Sections (middle, HTML5 drag-drop + up/down, visible/active toggles, type select, edit/delete) · Items (right, icon picker from `SERVICE_ICON_KEYS`, value/subValue, Featured star, visible/active toggles, duplicate, edit/delete, drag-drop reorder). Bilingual AR/EN dialogs. Sidebar `CONFIG_NAV` + i18n gained `nav.websiteBuilder` (منشئ الموقع).

**Frontend** — `components/sections/services-section.tsx` (client, tabbed UI adapted from `components/landing/services.tsx`, icon via `serviceIcon`) + `app/page.tsx` now reads `getSectionWithItems('services_list')` instead of the `content.services` JSON const; footer service links derive from CMS items. Landing is `force-dynamic` so new items appear immediately (acceptance test: added "Air Freight" → visible on `/#services` on :3101 and :3001).

**Verified:** `prisma migrate deploy` applied, `prisma generate` EXIT 0 (servers stopped first — DLL lock), seed rows present (5 pages/8 sections/10 items + air-freight), `tsc --noEmit` clean, `next lint` clean (1 pre-existing `<img>` warning in `app/page.tsx`), `npm run build:prod` green (**30 routes**, `/admin/cms` = 11.4 kB), standalone copy ran, prod :3001 smoke: both CSS 200, `main-app-*.js` 200, landing shows Air Freight + FCL Shipping + `z-[9999]` icons, `/admin/cms` 200.

---

## [PDF_LOGO_FIX_SHIPPED] — 2026-09-22 (P0: pdfmake "Invalid image" + unified logo source — cp-014)

Closed the P0 printing bug: **"Invalid image: File 'uploads/company/…' not found in virtual file system"** blocking quote/invoice PDF download.

**Root cause** — pdfmake's browser build resolves any non-`data:` image value as a key into its VFS dict. `quote-pdf.tsx`/`invoice-pdf.tsx` passed `normalizeLogoUrl(logoForPdfUrl)` (a filesystem path like `/uploads/company/…`) straight into `docDefinition.images.logo`, so `createPdf` threw "not found in virtual file system".

**Fix (surgical only)** —
- `lib/utils/logo-helpers.ts`: added the shared DRY helper `getLogoAsDataUrl(url): Promise<string|null>` — normalizes the path, `fetch`es it (relative → `window.location.origin + path`), converts the blob to `data:image/…;base64,…` via FileReader. On ANY failure it does `console.warn('Logo load failed', url)` and returns `null` — the PDF prints without a logo, never throws.
- `normalizeLogoUrl` now always prepends `/` to relative filesystem paths (Google Drive links, `data:` URIs and absolute URLs untouched).
- `components/quotes/quote-pdf.tsx` + `components/bookings/invoice-pdf.tsx`: `buildDoc` is now `async` and feeds **one** resolved `logoDataUrl` to both the header image cell and `images.logo`. When the logo fails to load, the header renders company-name-only (no image cell, no broken layout). Orphaned `normalizeLogoUrl` import removed from both.

**Single source of truth** — all PDF company fields (name/address/CR/phone/email) come only from `fetch('/api/company-info')` → `prisma.companyInfo`. Logo upload `/api/upload/logo` writes to `public/uploads/company/` and returns `/uploads/…`; that value is persisted by the document builder and rendered in PDFs via `logoForPdfUrl`. No `localStorage` or hardcoded company data in print components.

**Verified** — `npm run typecheck` EXIT 0 · dev `:3101` compiles `/quote` (QuotePdfButton) 200 · logo `GET /uploads/company/company-1790047528270-zsejkjvl1.png` → 200 `image/png` · pipeline check: `uploads/…` → normalize → `/uploads/…` → fetch 200 → valid `data:image/png;base64,…` (366,998 chars) — exactly the value pdfmake accepts. No-logo path: `null` → header omits `image:"logo"`, `images:{}` → pdfmake never sees a bare path.

**Deprecated** — `lib/pdf-helpers.ts` `getLogoDataUrl` duplicates the data-URL logic and is unused; superseded by `getLogoAsDataUrl` (see ORPHANS & PENDING).

---

## [LOGO_UNIFIED_SHIPPED] — 2026-09-22 (Single source: Header + Reports + Favicon — cp-015)

One company logo (`companyInfo.logoForPdfUrl` from DB, served via `/api/company-info`) now drives every surface. No hardcoded `public/logo.png` anywhere; `lib/utils/logo-helpers.ts` remains the ONLY converter (`normalizeLogoUrl` + `getLogoAsDataUrl`).

- **1. Header/Navbar** — `components/landing/navbar.tsx` swaps the old static `Anchor` lucide icon for an `<img>` reading the logo; `app/page.tsx` passes `logoUrl={companyInfo?.logoForPdfUrl}` (server → `getCompanyInfo()`). Fallback when null: `/logo-placeholder.svg` (new neutral SVG in `public/`). Layout/design untouched.
- **2. Reports** — `components/reports/reports-export.tsx` PDF export now fetches `/api/company-info` + `getLogoAsDataUrl(logoForPdfUrl)` and prepends a top logo image (none before — text-only header). Excel/CSV unchanged. Nothing references a static logo file.
- **3. Favicon** — dynamic: `generateMetadata()` in `app/layout.tsx` sets `icons.icon = normalizeLogoUrl(logoForPdfUrl) || "/logo-placeholder.svg"`. Static `app/favicon.ico` DELETED (backed up as `app/favicon.ico.bak`) so the file convention no longer overrides `metadata.icons`. PNG served as-is; browser downscales to 16/32px (no `sharp`/`@vercel/og` on this machine — server-side raster resize deferred, see ORPHANS).

**Verified (cp-015)** — `npm run typecheck` EXIT 0 · dev `:3101` home 200: navbar `<img src="/uploads/company/company-1790047528270-zsejkjvl1.png">` + `<link rel="icon" href="/uploads/company/company-1790047528270-zsejkjvl1.png">` in HTML · logo PNG 200 image/png · `/logo-placeholder.svg` 200 image/svg+xml · helper unit-check: null→placeholder, `uploads/x`→`/uploads/x`, absolute + Google Drive preserved.

**Deprecated/out of scope** — `app/favicon.ico` (replaced — `.bak` kept). Aesthetic letter "A" badge in `components/shell/app-sidebar.tsx:93-95` is a design element (not a logo file reference) — intentionally untouched (No-Design-Changes rule).

---

## [ADMIN_LOGO_COLOR_SYNC_HOMEPAGE_SHIPPED] — 2026-09-22 (P0/P1: Admin Sidebar logo + site-wide primary color sync + flexible homepage background — cp-016)

Comprehensive surgical fix: **admin sidebar "A" badge → ROWAD logo**, **D:\ path leak eliminated**, **every hardcoded `bg-blue-*` in the quote flow replaced with `var(--primary)` / hero-gradient CSS vars**, and a **new Homepage Background system** (solid / gradient / image slider). Backups in `backups/final-comprehensive-fix-20260513/` (`.bak` copies; repo has no git).

**1. Admin sidebar logo (P0)** — `components/shell/app-sidebar.tsx` accepts a new `logoUrl` prop; when present it renders `<img src={normalizeLogoUrl(logo)}>` inside the yellow primary circle, else the old letter "A" fallback. `app/(dashboard)/layout.tsx` feeds it `companyInfo.logoForPdfUrl ?? companyInfo.logoUrl` from the **same** `getCompanyInfo()`/`/api/company-info` source the navbar/favicon/PDFs use — Settings/Document Builder stay unified.
- `lib/utils/logo-helpers.ts`: added `getPublicUrl(folder, filename)` (always `/uploads/…`, never `D:\…`) + `publicUrlFromWindowsPath()` which converts any leaked `D:\…\public\uploads\…` back to `/uploads/…` inside `normalizeLogoUrl`.
- `app/api/upload/logo/route.ts`: uses `getPublicUrl()` and adds the `homepage-slider` destination (`public/uploads/homepage-slider`).
- `lib/settings-config.ts` + `components/settings/settings-editor.tsx`: logo/favicon fields changed from plain `text` to new `logo` type → rendered with the shared `LogoUploader` + live preview + normalized path display (no more raw `D:\…` text).

**2. Site-wide primary color sync (P0)** — `lib/theme.ts` `buildTheme()` (now aliased `applyBrandTokens`, used by `app/layout.tsx`) additionally injects into `:root`: `--background`, `--foreground`, `--alola-slate`, and the previously missing **`--hero-gradient-start/mid/end/angle`** tokens (kept out of `.dark` so dark mode backgrounds are untouched). All hardcoded blues in the quote flow replaced:
- `app/quote/page.tsx` header → `bg-gradient-to-br from-[var(--hero-gradient-start)] via-[var(--hero-gradient-mid)] to-[var(--hero-gradient-end)]`.
- `components/quote/client-quote-form.tsx` (14 spots): active FCL mode tab, equipment size chips, voyage selector, Get Price / Book Now / email buttons, offer-card border, icons, free-time badge, reefer surcharge → `bg-[var(--primary)]`, `text-[var(--primary-foreground)]`, `border-[var(--primary)]`, `bg-[var(--primary)]/10`, hover alphas — all keep exact layout, color-only.
- Result: changing `appearance.primary` in `/settings` flips the Get a Quote button (home + navbar), the active FCL tab, and the whole quote engine instantly. Changing `appearance.heroGradient*` restyles the /quote header hero.

**3. Homepage Background (P1)** — new card above the Appearance section in `/settings` writes `homepage.backgroundType` = `gradient|solid|slider`, `homepage.solidColor`, `homepage.sliderImages[]`, `homepage.sliderInterval`, `homepage.sliderOverlay` (`components/homepage/homepage-background-settings.tsx`; with multi-upload → `/api/upload/logo` `type=homepage-slider` → `public/uploads/homepage-slider/`, auto-created).
- `components/homepage/homepage-background.tsx` (client) renders the hero layer: solid color / crossfading slider (interval + dark overlay) / brand gradient (fallback when slider has no images).
- `app/page.tsx` reads the settings, adapts hero text/navbar colors for light solid mode (`heroOnLight`), and passes `heroSolid` to `components/landing/navbar.tsx`. `app/globals.css` adds a `--homepage-solid` default (#f4f6fa).

**Verified** — `npm run typecheck` EXIT 0 · `npm run lint` introduces **zero new** errors (remaining: pre-existing apostrophes in `app/page.tsx` "Saba'a" + two pre-existing hook-rule errors in `developer-fab.tsx`/`FloatingActions.tsx`). Manual walkthrough mapping: change primary → `#ff0000` red → home Get a Quote + /quote FCL tab + /quote header all red; restore → `#f7cf02`; Homepage → Slider → 3 uploads shows crossfade; Solid → #f4f6fa returns light; PDF pipeline unchanged (`getLogoAsDataUrl` untouched).

---

## [ORPHANS & PENDING] — deferred by No-Feature-Creep

- **Phase 2:** Client Portal, Auth Gate Modal, Instant Quote form (FCL counters / LCL–AIR grid), 3-tier output, 24h expiry cron, @react-pdf quotation, Bookings/Invoices/Support. → **Instant Quote + Auth Gate SHIPPED**; **Bookings/Invoices/Support SHIPPED**; **Client Portal SHIPPED** (role-based, scoped data, PDF invoices, tickets); **24h expiry cron SHIPPED** (`scripts/cron-expire-quotes.mjs`); **Reports & Analytics SHIPPED** (`/reports` + Excel/PDF/CSV export); **PDF quotation SHIPPED** (`components/quotes/quote-pdf.tsx`). Phase 2 complete.
- **Phase 3 (remaining):** Public pages shipped (see [PUBLIC_LANDING_SHIPPED]); Mapbox GL tracking map (GeoJSON + lifecycle timeline), Ship24 auto-poll cron (webhook in place), i18n AR/RTL + next-intl, WhatsApp/Twilio alerts. → **ALL SHIPPED** (see [PHASE_3_SHIPPED]): Mapbox GL via **CDN injection** + SVG fallback (npm `mapbox-gl` skipped — registry reliability; v3.5.1 CDN pinned), i18n via **settings-driven dict + Noto Sans Arabic** (npm `next-intl` skipped — same reason), Ship24 cron as tsx script (`pnpm cron:ship24`), WhatsApp/Twilio alerts via provider-pattern `lib/notify.ts`. Phase 3 complete.
- **Point 12 (Guide):** `/admin/guide` → **SHIPPED** (see [SMART_GUIDE_SHIPPED]); tied to `guide.version` SystemSetting; **Backup Now / restore / Realtime-SWR still pending (point 7)** — when shipped, `guide.version` will increment with each backup.
- **Deferred integrations:** WhatsApp/Twilio, Ship24 auto-poll (webhook ready), Moyasar payments, ExchangeRate auto-fetch (needs key — stub toggle now). → **Integration Test buttons SHIPPED** (Command Center → Integrations, per-provider HTTP probe).
- **Ideas (rejected for now):** HS-Code AI assistant, Carbon tracker, OCR documents, microservices, multi-tenant.
- **Deprecated (cp-014):** `lib/pdf-helpers.ts` `getLogoDataUrl` — dead duplicate of `getLogoAsDataUrl` in `lib/utils/logo-helpers.ts`; remove when convenient (no current importers).
- **Deprecated (cp-015):** `app/favicon.ico` — static icon replaced by dynamic `metadata.icons` in `app/layout.tsx` (`.bak` kept). Server-side 32×32 favicon raster resize would need `sharp`/`@vercel/og` (not installed) — browsers downscale natively today.
- **Migration path:** Next 14.2.35 → 16 (EOL risk), Prisma 5 → 7 (post-Phase-3, isolated), TS 5 → 6.

---

## [RESTORE_POINT_BASELINE] 2026-10-02 (cp-017) - Logos + Homepage Slider + Git restore points

> **Status:** SHIPPED and LOCKED as the git baseline (`restores/cp-017-main`). Restore-point system introduced. See `RESTORE_POINTS.md`.

- **1. Site logo (initial)** - uploaded Canva PNG as `/uploads/company/company-1790943260468-site-logo.png`, `companyInfo.logoForPdfUrl` + `logoUrl` updated (site DB = `.env.local` Supabase ap-southeast).
- **2. Navbar + sidebar logo behavior** (`components/landing/navbar.tsx`, `components/shell/app-sidebar.tsx`): when a logo is present the colored badge background is hidden; image slightly larger to fill the badge; on image `onError` a **"RSL"** fallback badge is shown instead of a broken image (replaces old "A"/placeholder).
- **3. Homepage slider background** (`components/homepage/homepage-background.tsx` + `app/globals.css`): 4 Canva JPGs in `/uploads/homepage-slider/`; `homepage.backgroundType=slider`, `sliderImages[]`, `sliderInterval=6`, `sliderOverlay=55`. Crossfade + **Ken Burns** zoom animation (respects `prefers-reduced-motion`). Color modes still selectable from `/settings` > Homepage Background.
- **4. Brand name** - `company.name` setting = **"ROWAD SABA'A Logistics"**; navbar brand line now derives full name minus the trailing "Logistics" word (`brandName`), showing **ROWAD SABA'A**.
- **5. New logo (final)** - `more_3_p.png` -> `/uploads/company/company-1790950592341-logo.png`; `companyInfo.logoForPdfUrl` + `logoUrl` updated.
- **6. Logo prominence** - navbar logo sits on a **semi-transparent white chip** (`bg-white/60` + `backdrop-blur-sm`) sized 12 (48px), with logo at 44px; dark overlay ring/shadow; "RSL" fallback keeps the primary-color chip at same size.
- **7. Comprehensive backup** - `backups/2026-10-02_17-49-25-manual/` (42 tables, 1179 rows JSON + uploads + source snapshot) + record in `Backup` table (`cmur3012z0000r9wl34u71g24`).
- **8. Restore-point system (git)** - repo initialized (no remote), `.gitignore` hardened (all `.env*` except `.env.example`, `/backups/`, build/log artifacts), baseline commit tagged `restores/cp-017-main`. Registry: `RESTORE_POINTS.md`. Future changes get their own commits + registry rows.

**Verified** : typecheck EXIT 0; home 200 with logo in `bg-white/60` chip; slider HTML has `slider-kenburns` + slider images; `/api/company-info` returns new logo; images serve 200; `.env*` confirmed ignored.
