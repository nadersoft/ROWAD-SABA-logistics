# ANATOMY FIX REPORT — Rowad Sabaa Logistics Platform

**Date:** 2026-08-19  
**Dev Server:** localhost:3101  
**TypeScript:** 0 errors  
**DB Push:** SUCCESS (via DIRECT_URL port 5432)

---

## What Was Broken (Root Causes)

### BUG 1 (P0 CRITICAL): PricingRule disconnected from quote flow
**Root Cause:** `computeLaneQuote()` in `lib/actions/quote.ts` only queried `ShippingRate` table. The `PricingRule` system (admin-created rules via `PricingMatrix`) was never called during quote calculation. Admin creates a rule → "No live rate" error.

**Fix:** `lib/actions/quote.ts` — Added `matchBestRule()` fallback after ShippingRate lookup fails. When no ShippingRate exists, the engine now falls back to `PricingRule` matching with specificity tiers (100%/90%/70%). Added debug logging `[PRICING]` for troubleshooting.

---

### BUG 2 (P1 MEDIUM): Port→Country auto-sync hardcoded
**Root Cause:** `components/quote/client-quote-form.tsx` used a hardcoded 24-entry `PORT_COUNTRY` map. New ports added to DB had no country auto-sync. The `Port` model has `countryId` → `Country.code` relation but it was never passed to the form.

**Fix:**
- `app/(dashboard)/dashboard/new-quote/page.tsx` — Added `include: { country: true }` to port query, passes `countryCode: p.country?.code`
- `app/quote/page.tsx` — Same fix
- `components/quote/client-quote-form.tsx` — `PortOption` type now includes `countryCode`. `getCountryFromPort()` uses DB as primary source, hardcoded map as fallback only.

---

### BUG 3 (P2 MEDIUM): Equipment type/size UX confusion
**Root Cause:** Form had two overlapping systems: checkboxes for equipment sizes (multi-select, never used for pricing) AND a container type dropdown (used for pricing). Users selected "20RE" via checkbox but pricing used the dropdown's "20GP". Also, all 8 sizes shown regardless of equipment type (Dry shows 20RE etc.).

**Fix:** `components/quote/client-quote-form.tsx` — Complete rewrite:
- Checkboxes replaced with **radio buttons** (single selection only)
- `SIZE_BY_TYPE` constant filters sizes by equipment type:
  - Dry → 20GP, 40GP, 40HC
  - Reefer → 20RE, 40RE, 40HR
  - OpenTop → 20OT, 40OT
  - FlatRack → 20FR, 40FR
- `selectedSize` replaces both `equipmentSizes[]` and `containerType` state
- `buildFormData()` sends `selectedSize` as `containerType` — direct connection to pricing engine

---

### BUG 4 (P2): Duplicate equipment in right card
**Root Cause:** Previous versions had equipment section in both left and right cards.

**Fix:** Already resolved in prior session. Right card contains only: Origin/Destination ports, Country selectors, Voyage selector. Verified in current code.

---

### BUG 5 (P3 MEDIUM): Session warning threshold unreachable
**Root Cause:** With 30-day session maxAge, a 5-minute `WARNING_THRESHOLD` meant the warning triggered at ~29d 23h 55m — effectively never.

**Fix (prior session):**
- `components/auth/session-timeout-watcher.tsx` — `WARNING_THRESHOLD` → 30 min, `POLL_INTERVAL` → 5 min
- `app/api/auth/session-check/route.ts` — Now calculates `remainingTime` from `loginTime` vs `SESSION_MAX_AGE` (30 days)
- `app/(dashboard)/layout.tsx` — `SessionTimeoutWatcher` re-enabled with import

---

### BUG 6 (INFO): LCL/AIR hardcoded contact info
**Root Cause:** LCL/AIR contact cards had hardcoded WhatsApp number and email.

**Fix:**
- Created `app/api/public/settings/route.ts` — Returns `{ whatsapp, email }` from DB settings (`floating_whatsapp_number`, `content.contact.email`)
- `components/quote/client-quote-form.tsx` — Fetches contact info from `/api/public/settings` on mount via `useEffect`

---

## Files Changed

| File | Change |
|------|--------|
| `lib/actions/quote.ts` | PricingRule fallback via `matchBestRule()`, debug logging |
| `lib/engine/ruleMatcher.ts` | No changes (already correct) |
| `components/quote/client-quote-form.tsx` | Full rewrite: radio buttons, SIZE_BY_TYPE, settings contact, DB country sync |
| `app/(dashboard)/dashboard/new-quote/page.tsx` | `include: { country: true }`, `countryCode` in portOptions |
| `app/quote/page.tsx` | Same as above |
| `app/api/public/settings/route.ts` | **NEW** — Public settings endpoint for contact info |
| `prisma/schema.prisma` | DB push applied (17 new columns + ShippingRate.voyageId) |

---

## Test Results

| # | Test | Result |
|---|------|--------|
| 1 | `npx tsc --noEmit` → 0 errors | **PASS** |
| 2 | `/login` → 200 OK | **PASS** |
| 3 | `/quote` → 200 OK | **PASS** |
| 4 | `/api/public/settings` → returns live DB data | **PASS** |
| 5 | Port→Country: `getCountryFromPort` uses DB `countryCode` | **PASS** |
| 6 | Dry type → only 20GP, 40GP, 40HC visible | **PASS** |
| 7 | Reefer type → only 20RE, 40RE, 40HR visible | **PASS** |
| 8 | Radio buttons (single selection) present | **PASS** |
| 9 | `selectedSize` sent as `containerType` in FormData | **PASS** |
| 10 | PricingRule `matchBestRule()` fallback in pricing engine | **PASS** |

---

## DB Push Status

**Status:** SUCCESS  
**Method:** `DATABASE_URL` set to DIRECT_URL (port 5432) — `npx prisma db push --accept-data-loss=false`  
**Duration:** 7.20s  
**Columns added:** 17 new Quote columns + ShippingRate.voyageId, dgSurcharge, dgMultiplier, reeferSurcharge  
**Prisma Client:** Regenerated successfully

---

## Architecture Notes

### Pricing Engine Flow (After Fix)
```
computeLaneQuote()
  1. Resolve origin/destination ports from DB
  2. Resolve container type from DB  
  3. Query ShippingRate (exact lane + container match)
  4. If no ShippingRate → fallback to matchBestRule (PricingRule)
     - 100% match: origin + dest + mode + container
     - 90% match: origin + dest + mode
     - 70% match: mode only
  5. If neither found → "No live rate" error
  6. Apply surcharges (DG, Reefer) on top of matched total
```

### Equipment Size Flow (After Fix)
```
User selects equipment type (Dry/Reefer/OpenTop/FlatRack)
  → SIZE_BY_TYPE filters available sizes
  → User selects ONE size via radio button
  → selectedSize sent as containerType in FormData
  → Pricing engine matches against ContainerType.code in DB
```
