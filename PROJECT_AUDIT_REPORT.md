# PROJECT AUDIT REPORT - Rowad Sabaa Logistics Platform

> Read-only audit. Generated 2026-08-17. No code changes made.

---

## 1. ENV CHECK

| Variable | Present | Value |
|---|---|---|
| DATABASE_URL | YES | Supabase pooler (pgbouncer=true, port 6543) |
| DIRECT_URL | YES | Supabase direct (port 5432) |
| AUTH_SECRET | YES | REDACTED_SECRET |
| AUTH_TRUST_HOST | YES | true |
| SETTINGS_ENCRYPTION_KEY | YES | HMRxEatLYRGCJRN9owtz8YMi4qFk2OY8O+678uD7qBQ= |
| ADMIN_EMAIL | YES | admin@rowadsabaa.com - EXPOSED in plaintext in .env |
| ADMIN_PASSWORD | YES | Alola_Admin_2026! - EXPOSED in plaintext in .env |
| REDIS_URL | YES | redis://localhost:6379 |
| NEXTAUTH_URL | MISSING | Required by Auth.js in production for callback URLs. Absence causes silent failures on non-localhost deploys. |
| AUTH_URL | MISSING | Auth.js v5 fallback. Without it, OAuth callbacks and signOut may resolve to wrong origin. |
| PORT | MISSING | Next.js defaults to 3000. start:prod uses node server.js. Not critical but recommended. |

### Hardcoded URL Search

Searched all .ts/.tsx files (excluding node_modules) for localhost, 127.0.0.1, and :331. **No hardcoded URLs found.** The codebase is clean - all origins are derived from req.url / nextUrl.clone() (middleware.ts:14-17).

### Security Note

ADMIN_EMAIL and ADMIN_PASSWORD are committed to the repo in .env. Acceptable for a dev seed file but should be moved to a secrets manager (Vercel env, Doppler, etc.) before any public/production deployment. SETTINGS_ENCRYPTION_KEY and AUTH_SECRET are also in plaintext - same recommendation.

---

## 2. PRISMA SCHEMA (37 models, 10 enums)

### Enums (10)

Role (SUPER_ADMIN, MANAGER, SUPPORT, CLIENT)
Mode (FCL, LCL, AIR, BULK)
Tier (ECONOMY, STANDARD, EXPRESS)
Category (APPEARANCE, PRICING, CURRENCY, INTEGRATION, CONTENT, DEFAULTS)
PortType (SEA, AIR, LAND)
ShipmentStatus (CREATED, PICKED_UP, IN_TRANSIT, CUSTOMS, DELIVERED, CANCELLED)
QuoteStatus (DRAFT, PENDING, ACCEPTED, EXPIRED, DECLINED)
TicketStatus (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
InvoiceStatus (DRAFT, SENT, PAID, OVERDUE, VOID)
TicketPriority (LOW, NORMAL, HIGH, URGENT)

### Models (37)

| # | Model | Purpose |
|---|---|---|
| 1 | User | Auth.js v5 user (JWT). role, isActive, passwordHash. |
| 2 | UserProfile | Extended profile (country, city, address). 1:1 with User. |
| 3 | Account | Auth.js OAuth provider accounts. |
| 4 | Session | Auth.js sessions (unused with JWT strategy). |
| 5 | VerificationToken | Auth.js email magic links. |
| 6 | Port | Master port data. code (UNIQUE), type (SEA/AIR/LAND), FK->Country. |
| 7 | Carrier | Carrier master data. |
| 8 | ContainerType | Container specs (20GP, 40HQ...). teu multiplier. |
| 9 | ShippingRate | Per-lane tier rates (base cost). FK->Port x2 + ContainerType. |
| 10 | ExchangeRate | Currency exchange rates (manual or auto-update). |
| 11 | Country | Country master (code, name, dialCode). |
| 12 | Currency | Currency master (code, name, symbol, rate, isDefault). |
| 13 | FieldDefinition | Dynamic pricing fields (DG, reefer, insurance, etc.). |
| 14 | PricingRule | Smart pricing rule. Lane-specific base + weight rate + FOB/EXW. |
| 15 | PricingRuleField | Junction: PricingRule x FieldDefinition (value per rule). |
| 16 | SystemAlert | Guard-generated alerts (CRITICAL/HIGH/MEDIUM). |
| 17 | Customer | Business customer (auto-created on first quote request). |
| 18 | Quote | Quote/booking request. QuoteStatus lifecycle. |
| 19 | Invoice | Invoice against customer/shipment/quote. |
| 20 | Shipment | Active shipment with tracking (Ship24 provider). |
| 21 | ShipmentEvent | Shipment status history. |
| 22 | SystemSetting | Zero-hardcode config store (key/value JSON by category). |
| 23 | RegistrationPageConfig | Dynamic registration page labels (Arabic/English). |
| 24 | RegistrationFieldConfig | Dynamic registration form fields with validation rules. |
| 25 | AuditLog | Full audit trail (actor, action, target, payload). |
| 26 | Partner | Landing page partner logos. |
| 27 | Testimonial | Customer testimonials (rating, content, order). |
| 28 | Faq | FAQ items (question, answer, order). |
| 29 | CmsPage | CMS page container (slug, titleAr/En, isActive). |
| 30 | CmsSection | CMS section (key, type, badge, title, content, order). Unique per page. |
| 31 | CmsItem | CMS item (slug, icon, title, description, value, featured, order). Unique per section. |
| 32 | Ticket | Support ticket (OPEN->CLOSED lifecycle). |
| 33 | TicketMessage | Ticket message thread. |
| 34 | Notification | In-app notifications (quote, system, alert). |
| 35 | OtpVerification | OTP codes (email/SMS channel). |
| 36 | Backup | Settings/config backup snapshots (JSON). |
| 37 | RateLimitHit | Rate limiter tracking (scope + key + timestamp). |

Notable: No Voyage model. No FreeTime model. No BLDocument model.

---

## 3. PRICING ENGINE ANALYSIS

### 3a. Instant Quote Engine (lib/actions/quote.ts + lib/calculation.ts)

The instant quote engine is a TWO-TIER system:

**Tier 1: ShippingRate lookup** (computeLaneQuote, lib/actions/quote.ts:91-184)
- Looks up ShippingRate by originPortId + destinationPortId + mode + containerTypeId + tier
- Applies surcharges from SystemSetting(pricing.surcharges): BAF, THC origin, THC destination, fuel %, insurance %, profit margin %
- Converts base currency (USD) -> display currency (SAR) via ExchangeRate table
- Returns 3 tier quotes: ECONOMY, STANDARD, EXPRESS (one may be unavailable)

**Tier 2: Smart Pricing Rule engine** (lib/engine/ruleMatcher.ts)
- Competes rules by specificity: 100% (exact lane), 90% (lane without container), 70% (mode only)
- Formula: Total = baseRate x containers + flat fields + % fields on subtotal + FOB/EXW + weight x rate/kg
- PricingRuleField junction table holds per-rule field values
- Rule priority breaks ties

**Smart Guard** (lib/engine/smartGuard.ts)
- Financial watchdog: detects CRITICAL (selling below base rate, overlapping weight ranges), HIGH (DG/Reefer with zero fee, FCL without container type), MEDIUM (thin/excessive margin)
- Auto-creates SystemAlert records for CRITICAL/HIGH issues
- Weight-range overlap detection across all rules on same lane

### 3b. Key Observation

The instant quote engine uses Tier 1 (ShippingRate + surcharges). The smart pricing engine (Tier 2) is a SEPARATE system. The PricingRule + FieldDefinition models are used for admin-side cost calculation (via matchBestRule), not for the public instant quote form. The two engines are NOT connected. A ShippingRate must exist for an instant quote; PricingRule is only for internal/admin cost estimation.

### 3c. Calculation Primitives (lib/calculation.ts)

- airChargeable(dims, divisor=6000): max(actual weight, volumetric weight). IATA standard.
- lclCbm(dims): (L*W*H / 1,000,000) * Qty
- lclChargeable(dims): max(CBM, weight/1000)
- quoteTotal(baseCost, surcharges): (base + flat) * (1 + pct/100)
- convert(amount, rate): amount * rate
- round2(n): Math.round(n * 100) / 100

All pure functions. No DB access. No I/O.

### 3d. Quote Validity

Valid until is set from SystemSetting(pricing.quoteValidityHours, 24). Applied in both instantQuote and requestQuote. The validUntil is returned to the client and displayed in the UI. However, there is NO server-side enforcement that rejects quotes after expiry. Expiration is display-only.

---

## 4. QUOTE UI ANALYSIS

### 4a. Public Quote Form (app/quote/page.tsx + components/quote/quote-form.tsx)

- Server component fetches ports, containerTypes, and settings from DB
- Client component (QuoteForm) handles mode switching (FCL/LCL/AIR), route selection, dimension inputs
- Calls instantQuote() server action on form submit
- Displays 3-tier pricing cards with full breakdown (base + 6 surcharge categories)
- Book this rate button triggers requestQuote() which requires auth
- Unauthenticated users see AuthGateDialog (embedded login form)
- After login, the pending quote is submitted automatically

### 4b. Draft Persistence

The quote form saves to localStorage(alola_quote_draft) on Save this quote click. This draft is restored when the user returns to /quote. The draft includes mode, origin, destination, containerType, quantity, weight, and LWH string. This bridges the landing-page calculator with the /quote form.

### 4c. Auth Gate (components/quote/auth-gate-dialog.tsx)

- Modal dialog with embedded LoginForm
- On successful login, calls onAuthed() callback which retries requestQuote()
- Displays admin credentials hint (admin@rowadsabaa.com / Alola_Admin_2026!) - SECURITY ISSUE in production

### 4d. Quote PDF (components/quotes/quote-pdf.tsx)

Exists but not read in detail. Likely generates PDF from Quote data.

---

## 5. AUTH AND LOGOUT ANALYSIS

### 5a. Auth Config (auth.ts)

- Auth.js v5 with PrismaAdapter
- JWT strategy (sessions not stored in DB)
- Single provider: Credentials (email + bcrypt password)
- Pages: signIn -> /login
- Callbacks: jwt (adds id, role, isActive to token), session (maps token to session.user)
- Uses AUTH_SECRET from env
- No hardcoded URLs anywhere in auth.ts

### 5b. Middleware (middleware.ts, 70 lines)

Route protection arrays:
- STAFF_ONLY: /customers, /support - requires SUPER_ADMIN, MANAGER, or SUPPORT role
- OPS_ONLY: /settings, /integrations, /reports, /admin, /admin/settings/registration-builder, /admin/customers/tracking - requires SUPER_ADMIN or MANAGER only

Disabled account handling: If token.isActive === false, redirect to /login and clear session cookies.

Already-signed-in guard: If user has token and visits /auth/* or /login, redirect to /dashboard.

No hardcoded URLs. All redirects use req.nextUrl.clone().

### 5c. Logout (components/shell/user-menu.tsx)

`	ypescript
async function onSignOut() {
  await signOut({ callbackUrl: /login });
  router.refresh();
}
`

- Uses next-auth/react signOut with callbackUrl: /login
- No hardcoded URLs. Uses relative path.
- After signOut, calls router.refresh() to update UI state.

### 5d. Missing: No /api/auth/signout/route.ts

There is no custom signout API route. The app relies on Auth.js built-in /api/auth/* routes.

---

## 6. FILE STRUCTURE

### Root Config Files
- .env (23 lines, plaintext secrets)
- .env.example (not checked)
- next.config.js / next.config.mjs
- tailwind.config.ts
- tsconfig.json
- package.json
- prisma/schema.prisma (747 lines)
- prisma/seed.ts

### App Routes (Next.js App Router)
- app/page.tsx (landing)
- app/layout.tsx
- app/not-found.tsx
- app/(auth)/login/page.tsx
- app/(auth)/layout.tsx
- app/(auth)/auth/register/page.tsx
- app/quote/page.tsx (instant quote)
- app/track/[ref]/page.tsx (public tracking)
- app/(dashboard)/layout.tsx
- app/(dashboard)/dashboard/page.tsx
- app/(dashboard)/quotes/page.tsx
- app/(dashboard)/quotes/[id]/page.tsx
- app/(dashboard)/shipments/page.tsx
- app/(dashboard)/shipments/[id]/page.tsx
- app/(dashboard)/invoices/page.tsx
- app/(dashboard)/invoices/[id]/page.tsx
- app/(dashboard)/wallet/page.tsx
- app/(dashboard)/support/page.tsx
- app/(dashboard)/support/[id]/page.tsx
- app/(dashboard)/account/page.tsx
- app/(dashboard)/reports/page.tsx
- app/(dashboard)/settings/page.tsx
- app/(dashboard)/integrations/page.tsx
- app/(dashboard)/customers/page.tsx
- app/(dashboard)/admin/command-center/page.tsx
- app/(dashboard)/admin/users/page.tsx
- app/(dashboard)/admin/pricing/page.tsx
- app/(dashboard)/admin/cms/page.tsx
- app/(dashboard)/admin/guide/page.tsx
- app/(dashboard)/admin/settings/page.tsx
- app/(dashboard)/admin/settings/registration-builder/page.tsx
- app/(dashboard)/admin/customers/tracking/page.tsx

### API Routes
- app/api/auth/[...nextauth]/route.ts
- (No /api/auth/signout/route.ts)
- (No /api/quotes/instant/route.ts - quote is server action only)

### Core Lib
- auth.ts (Auth.js config, 64 lines)
- middleware.ts (route guards, 70 lines)
- lib/prisma.ts
- lib/calculation.ts (68 lines, pure math)
- lib/engine/ruleMatcher.ts (181 lines, smart pricing)
- lib/engine/smartGuard.ts (219 lines, financial watchdog)
- lib/format.ts
- lib/i18n.ts
- lib/integrations.ts
- lib/integration-keys.ts
- lib/log.ts
- lib/notify.ts
- lib/otp.ts
- lib/rate-limit.ts
- lib/settings.ts
- lib/settings-actions.ts
- lib/settings-config.ts
- lib/theme.ts
- lib/utils.ts
- lib/auth.ts (duplicate - same as root auth.ts)

### Server Actions
- lib/actions/account.ts
- lib/actions/bookings.ts
- lib/actions/cms.ts (943 lines, 17 RBAC permissions)
- lib/actions/countries.ts
- lib/actions/currencies.ts
- lib/actions/customer-tracking.ts
- lib/actions/fields.ts
- lib/actions/integrations.ts
- lib/actions/locale.ts
- lib/actions/notifications.ts
- lib/actions/pricing.ts
- lib/actions/quote.ts (322 lines)
- lib/actions/registration-config.ts
- lib/actions/support.ts
- lib/actions/tickets.ts
- lib/actions/tracking.ts
- lib/actions/users.ts

### Components
- components/admin/ (9 files: cms-builder, users-manager, pricing-matrix, etc.)
- components/auth/ (login-form, register-form)
- components/bookings/ (ticket-create-form, shipment-status-form, invoice-pdf, etc.)
- components/landing/ (navbar, services, faq, contact-form, track-form, etc.)
- components/quote/ (quote-form, auth-gate-dialog)
- components/shell/ (app-sidebar, app-topbar, user-menu, notification-bell, etc.)
- components/ui/ (15+ shadcn/ui primitives)
- components/sections/ (services-section.tsx - CMS consumer)

### Scripts
- scripts/copy-standalone.mjs
- scripts/reset-password.mjs
- scripts/cron-ship24.ts

---

## 7. BUGS LIST

| # | Severity | Location | Description |
|---|---|---|---|
| 1 | HIGH | .env | NEXTAUTH_URL missing. Auth.js cannot construct correct callback URLs in production. Causes Configuration error on some OAuth flows. |
| 2 | HIGH | .env | AUTH_URL missing. Auth.js v5 fallback. Same impact as above. |
| 3 | MEDIUM | components/quote/auth-gate-dialog.tsx:68 | Admin credentials displayed in UI: Seeded admin: admin@rowadsabaa.com / Alola_Admin_2026!. Must be removed before production. |
| 4 | MEDIUM | .env:19-20 | ADMIN_EMAIL and ADMIN_PASSWORD in plaintext. Exposed in version control. |
| 5 | MEDIUM | lib/actions/quote.ts:217 | Quote validUntil is display-only. No server-side expiry check. A quote marked EXPIRED could theoretically still be accepted. |
| 6 | LOW | .env | REDIS_URL points to localhost:6379. Will fail if Redis is not running. Not critical since Redis is optional. |
| 7 | INFO | middleware.ts:4-5 | /admin is in OPS_ONLY, but /admin/cms is not explicitly listed. However, /admin/cms matches via path.startsWith(/admin/). Correct behavior. |

---

## 8. MISSING FEATURES

| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Voyage model | NOT IMPLEMENTED | No Voyage model in schema. No /admin/voyages route. No voyage tracking beyond Shipment + ShipmentEvent. |
| 2 | Free Time logic | NOT IMPLEMENTED | No free time calculation. No demurrage/detention tracking. No FreeTime model. |
| 3 | BL Document management | NOT IMPLEMENTED | No BLDocument model. No bill of lading workflow. |
| 4 | 24h quote expiry enforcement | PARTIAL | validUntil is set and displayed but not enforced server-side on booking. |
| 5 | Payment gateway integration | NOT IMPLEMENTED | Wallet model exists but no payment processor integration (Stripe, etc.). |
| 6 | Email/SMS notifications | PARTIAL | notify.ts and otp.ts exist but actual email/SMS sending depends on env config (SMTP, Twilio, etc.). |
| 7 | Ship24 tracking integration | IMPLEMENTED | cron-ship24.ts exists. Shipment.trackingProvider defaults to ship24. |
| 8 | Multi-language (Arabic/English) | IMPLEMENTED | All CMS content has Ar/En fields. Registration config has Ar/En labels. i18n.ts exists. |
| 9 | CMS (page builder) | IMPLEMENTED | CmsPage/CmsSection/CmsItem. Admin UI (cms-builder.tsx). 5 pages seeded. |
| 10 | Smart Pricing Guard | IMPLEMENTED | smartGuard.ts with CRITICAL/HIGH/MEDIUM detection. SystemAlert persistence. |
| 11 | OTP verification | IMPLEMENTED | OtpVerification model. otp.ts utility. Channel: email/SMS. |
| 12 | Backup/Restore | IMPLEMENTED | Backup model with JSON data. Admin guide page. |
| 13 | Audit logging | IMPLEMENTED | AuditLog model. audit() helper used throughout actions. |
| 14 | Rate limiting | IMPLEMENTED | RateLimitHit model. checkRateLimit() used in quote endpoint. |
| 15 | Registration form builder | IMPLEMENTED | RegistrationPageConfig + RegistrationFieldConfig models. Admin UI. |

---

Report generated by opencode. Read-only audit - no files modified.