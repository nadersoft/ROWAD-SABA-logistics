# ANATOMY REPORT V2 — Post-Fix Audit

> Auditor: opencode  
> Date: 2026-08-20  
> Scope: 7 critical bugs from live screenshots (image_45d078, image_156c47, image_1fe3b2)

---

## CHECK 1: PDF DOWNLOADS JSON (Screenshot 156c47)

### Files
- `components/quote/client-quote-form.tsx:762-769` — the "PDF / حفظ" button handler
- `components/quotes/quote-pdf.tsx` — proper PDF component using `pdfmake` (EXISTS but NOT USED in quote form)
- `app/(dashboard)/quotes/[id]/page.tsx:88` — `QuotePdfButton` only used on saved quote detail page

### Code (the broken button)
```tsx
// client-quote-form.tsx:762-769
onClick={() => {
  const blob = new Blob(
    [JSON.stringify({ result, voyage: selectedVoyage }, null, 2)],
    { type: "application/json" }    // ← BUG: Blob MIME is application/json
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quote-${result.originCode}-${result.destinationCode}.json`;  // ← .json extension
  a.click();
  URL.revokeObjectURL(url);
}}
```

### Root Cause
The instant quote form's "PDF" button hardcodes a JSON Blob download. The proper `QuotePdfButton` component (using `pdfmake` library) EXISTS at `components/quotes/quote-pdf.tsx` and IS wired up on the saved quote detail page (`quotes/[id]/page.tsx:88`), but is **never imported or used** in `client-quote-form.tsx`.

The `pdfmake` package IS installed (`^0.3.11` in `package.json:41`). The infrastructure works. The instant quote form just doesn't use it.

### Confidence: **High**
### Type: Frontend

### Notes
- `app/api/quote/pdf/route.ts` — DOES NOT EXIST (no server-side PDF endpoint)
- `app/api/quote/download/route.ts` — DOES NOT EXIST
- Fix requires mapping `QuoteResult` → `QuotePdfData` format in the instant quote form

---

## CHECK 2: BOOK NOW BUTTON (Screenshot 156c47)

### Files
- `components/quote/client-quote-form.tsx:775-782` — the button
- `components/quote/client-quote-form.tsx:242-260` — `onSaveAndBook()` handler
- `lib/actions/quote.ts:512-517` — `requestQuote()` auth gate

### Code
```tsx
// Button (line 775-782)
<button
  type="button"
  onClick={onSaveAndBook}
  disabled={pending || !isAuthenticated}   // ← disabled when not authenticated
  className="flex-1 rounded-xl bg-blue-600 ... disabled:opacity-60"
>
  {pending ? "Saving..." : "طلب حجز / Book Now"}
</button>

// Handler (line 242-246)
async function onSaveAndBook() {
  if (!isAuthenticated || !session?.user) {
    toast.error("Please sign in to save and book.");
    return;
  }
  // ... calls requestQuote(fd)
}

// Server action (line 515-517)
const session = await auth();
if (!session?.user)
  return { ok: false, error: "SIGN_IN_REQUIRED", signInRequired: true };
```

### Root Cause
**The button is working as designed.** On the public `/quote` page, `isAuthenticated={false}` is passed (line 80 of `app/quote/page.tsx`). The button is disabled (opacity 60%) and the handler blocks with a toast.

On the authenticated `/dashboard/new-quote` page, `isAuthenticated={true}` is passed. The button IS clickable and calls `requestQuote()` which persists the quote to the DB.

**No `/api/bookings/route.ts` exists.** Booking is handled entirely by the `requestQuote` server action in `lib/actions/quote.ts`.

The Quote model in the DB has all required fields: `voyageId`, `customerId`, `status`, `validUntil`.

### Confidence: **High** — this is NOT a bug, it's auth gating working correctly
### Type: Frontend (by design)

---

## CHECK 3: COUNTRY AUTO-SYNC (Screenshot 45d078)

### Files
- `components/quote/client-quote-form.tsx:63-66` — `getCountryFromPort()`
- `app/quote/page.tsx:31` — port query with `include: { country: true }`
- `app/(dashboard)/dashboard/new-quote/page.tsx:33` — same

### Code
```tsx
// getCountryFromPort (line 63-66) — FIXED in last session
function getCountryFromPort(portCode: string, ports?: PortOption[]): string {
  const dbPort = ports?.find((p) => p.code === portCode);
  return dbPort?.countryCode ?? "";   // ← DB only, no fallback map
}

// Server page query (line 31 of app/quote/page.tsx)
const portOptions = ports.map((p) => ({
  code: p.code, name: p.name, type: p.type,
  countryCode: p.country?.code ?? null   // ← reads from Country table
}));
```

### DB Evidence
```
NIN → country: { code: "CN", name: "China" }     ← FIXED (was "CH" = Switzerland)
IST → country: { code: "TR", name: "Turkey" }     ← correct
JED → country: { code: "SA", name: "Saudi Arabia" } ← correct
DMM → country: { code: "SA", name: "Saudi Arabia" } ← correct
```

### Root Cause (historical)
The screenshot was taken **before** the fix. The OLD code had:
1. A hardcoded `PORT_COUNTRY` map (lines 63-72, old) that didn't include NIN or IST
2. Fallback: `return PORT_COUNTRY[portCode] || "SA"` → NIN/IST defaulted to "SA"
3. NIN's country in DB was `CH` (Switzerland) instead of `CN` (China)

All three issues were fixed in the last session:
1. `PORT_COUNTRY` map deleted
2. `getCountryFromPort` now reads DB only
3. NIN country corrected to `CN` in DB
4. Country dropdowns are now dynamic from port data

### Confidence: **High** — screenshots are pre-fix. Current code is correct.
### Type: DB + Frontend (both fixed)

---

## CHECK 4: DG SURCHARGE WITHOUT CHECKING DG (Screenshot 45d078 vs 156c47)

### Files
- `components/quote/client-quote-form.tsx:105` — `isDG` state
- `lib/actions/quote.ts:78` — Zod parse for `isDG`
- `lib/actions/quote.ts:367-378` — DG surcharge calculation

### Code
```tsx
// State (line 105)
const [isDG, setIsDG] = useState(false);

// FormData (line 209 of buildFormData)
fd.set("isDG", String(isDG));  // sends "true" or "false"

// Zod schema (line 78) — FIXED in last session
isDG: z.string().optional().default("false")
  .transform((v) => v === "true" || v === "1"),

// Server calculation (line 367-378)
let dgSurcharge = 0;
if (input.isDG) {                    // ← only when isDG is true
  const rateDgSurcharge = num(rate.dgSurcharge ?? 150);
  // ...
  dgSurcharge = rateDgSurcharge;
}
```

### Root Cause (historical)
**The OLD Zod schema used `z.coerce.boolean()`.** `z.coerce.boolean()` calls `Boolean(value)`. Since `String(false)` = `"false"`, and `Boolean("false")` = `true` (non-empty string is truthy), the DG checkbox was ALWAYS treated as checked.

This was fixed in the last session by changing to:
```ts
z.string().optional().default("false").transform((v) => v === "true" || v === "1")
```

### Confidence: **High** — screenshot was pre-fix. Current code is correct.
### Type: Logic (fixed)

---

## CHECK 5: FAKE RATE WHEN NO RULE EXISTS

### DB Evidence — ShippingRates (all FCL)
| Route | Container | Tier | BaseCost |
|-------|-----------|------|----------|
| JED→DMM | 20GP | STANDARD | $1,200 |
| JED→DMM | 20GP | EXPRESS | $1,500 |
| JED→DMM | 40GP | STANDARD | $1,800 |
| JED→DMM | 40GP | EXPRESS | $2,200 |
| JED→DMM | 40HC | STANDARD | $1,900 |
| JED→DMM | 40HC | EXPRESS | $2,300 |

### DB Evidence — PricingRules (all FCL)
| Rule Name | Origin | Dest | Container | BaseRate |
|-----------|--------|------|-----------|----------|
| FCL — Jeddah → Dammam (40GP) | JED | DMM | 40GP | $1,800 |
| NINGBO PORT - ADEN PORT | NIN | YYY | 20GP | $5,600 |
| Ningbo to port said | NIN | CAI | 20GP | $2,500 |

### Files
- `lib/actions/quote.ts:250-320` — ShippingRate + PricingRule lookup chain
- `lib/engine/ruleMatcher.ts:100-112` — `ruleMatchPct()` scoring

### Code
```ts
// Line 290-311: PricingRule fallback (FIXED: only >= 90%)
if (!rate) {
  const matchedRule = await matchBestRule({ ... });
  if (matchedRule && matchedRule.matchPct >= 90) {  // ← was accepting 70%
    rate = {
      baseCost: matchedRule.breakdown.base,
      dgSurcharge: 150,   // ← hardcoded surcharges for PricingRule path
      dgMultiplier: 1.25,
      reeferSurcharge: 200,
      _matchedRule: matchedRule,
    };
  }
}

// Line 313-320: Final fallback
if (!rate) {
  return { ok: false, error: "No live rate for this route and container type yet..." };
}
```

### Root Cause Analysis
**For JED→DMM**: There ARE real ShippingRate records. The rate shown ($1,200–$2,300 depending on container/tier) is **legitimate**. PricingRule at $1,800 for 40GP is also legitimate. This is NOT a fake rate.

**For NIN→DMM or NIN→IST**: There is NO ShippingRate and NO PricingRule that matches at >=90%. After the fix (rejecting 70% matches), these lanes correctly return "No live rate" error.

**Historical bug**: The OLD code accepted 70% matches (mode-only). So ANY PricingRule for FCL mode (e.g., "JED→DMM 40GP" at $1,800) would match ANY FCL lane (like NIN→IST) at 70%, producing a fabricated rate for a completely unrelated lane. This was fixed to require >=90%.

**Remaining concern**: The PricingRule path hardcodes `dgSurcharge: 150` and `reeferSurcharge: 200` (lines 305-307). These are always set on the rate object even though they're not from the DB rule. The `computeLaneQuote` then checks `input.isDG` before using them, so DG is correctly gated. But the hardcoded defaults may confuse debugging.

### Confidence: **High**
### Type: Logic (fixed — 70% fallback removed)

---

## CHECK 6: VALID UNTIL DATE MALFORMED "202026/8/"

### Files
- `lib/actions/quote.ts:449` — `validUntil` created in `instantQuote()`
- `lib/actions/quote.ts:542` — `validUntil` created in `requestQuote()`
- `components/quote/client-quote-form.tsx:681` — display (offer card)
- `components/quote/client-quote-form.tsx:658` — display (confirmed state)

### Code
```ts
// Server action (line 449)
const validUntil = new Date(Date.now() + 24 * 3_600_000);
// Returns as part of QuoteResult { validUntil?: Date }
// Through Next.js server action serialization: Date → ISO string

// Client display (line 681) — FIXED in last session
{result.validUntil
  ? `Valid until ${new Date(result.validUntil).toLocaleDateString(
      "en-GB", { day: "numeric", month: "short", year: "numeric" }
    )}`
  : ""}
```

### Root Cause (historical)
The OLD code used `toLocaleDateString()` with **no locale argument**. On certain browser/OS locale combinations (particularly Arabic or RTL locales), `Date.toLocaleDateString()` with no locale can produce unexpected formats. The "202026/8/" pattern suggests year concatenation from a locale that outputs year-first format and then the date was concatenated incorrectly.

**Server Action serialization**: Next.js Server Actions serialize `Date` objects as ISO strings over the wire. `new Date(isoString)` on the client should parse correctly. The serialization itself is not the problem.

**Fix applied**: Changed to `toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })` which forces consistent output like "20 Aug 2026".

### Confidence: **High** — fix is correct for the formatting. Screenshots were pre-fix.
### Type: Frontend (fixed)

---

## CHECK 7: DISPLAY / LAYOUT ISSUE

### Files
- `components/quote/client-quote-form.tsx:666-786` — offer card section

### Code Structure
```tsx
// Offer card container (line 668)
<div>
  {/* Route header — flex wrap */}
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
    ...
  </div>

  {/* Main card */}
  <div className="rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-lg">
    {/* Total price — 4xl font */}
    <div className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900">
      {symbol}{formatNumber(result.offer.total)}
    </div>

    {/* Breakdown list — xs text, space-y-1.5 */}
    <div className="mb-4 space-y-1.5 border-t pt-4 text-xs">
      {[...].map((row) => (
        <div key={row.label} className="flex justify-between text-gray-500">
          <span>{row.label}</span>
          <span className="font-medium text-gray-700">{symbol}{formatNumber(row.value)}</span>
        </div>
      ))}
    </div>

    {/* Voyage details — 2-col grid */}
    <div className="grid grid-cols-2 gap-2">
      ...
    </div>

    {/* Buttons */}
    <div className="flex gap-3">...</div>
  </div>
</div>
```

### Analysis
- The parent form has `className="space-y-4"` (line 250) — no max-width constraint
- The offer card has `p-6` padding and `text-xs` for breakdown rows
- The two-column grid for voyage details (`grid grid-cols-2`) could overflow on very narrow screens (under ~320px) when vessel names are long
- The `text-4xl` total price combined with Arabic text labels could cause wrapping issues
- **No horizontal scroll / overflow-hidden** on the card

### Potential Issues
1. On mobile (< 375px), long route codes like `DXB → LHR · 40HC` with chargeable info could wrap awkwardly
2. The breakdown labels (English) + values (currency) in `text-xs` are compact but may not be readable on very small screens
3. The `flex gap-3` for PDF/Book buttons could compress the text on narrow screens

### Confidence: **Low** — need actual mobile screenshots to diagnose. Code structure is reasonable.
### Type: Frontend

---

## SUMMARY TABLE

| # | Bug | File(s) | Root Cause | Status | Risk if Fixed Wrong |
|---|-----|---------|------------|--------|---------------------|
| 1 | PDF downloads JSON | `client-quote-form.tsx:762-769` | "PDF" button creates JSON Blob instead of using existing `QuotePdfButton` component | **NOT YET FIXED** | Breaking the instant quote form; pdfmake font loading issues |
| 2 | Book Now not working | `client-quote-form.tsx:775-782` | Button correctly disabled for unauthenticated users on public page | **NOT A BUG** — auth gating | N/A |
| 3 | Country shows SA/YE | `client-quote-form.tsx:63-66` + DB | Hardcoded map + wrong DB country + fixed | **FIXED** | Empty country dropdowns if DB ports lack countryId |
| 4 | DG surcharge always on | `quote.ts:78` (Zod) | `z.coerce.boolean("false")` → `true` | **FIXED** | Breaking all boolean form fields |
| 5 | Fake rate no rule | `quote.ts:290-311` (ruleMatcher) | 70% mode-only match returned unrelated PricingRule rates | **FIXED** | All routes without exact PricingRule showing error instead of ShippingRate |
| 6 | Date "202026/8/" | `client-quote-form.tsx:681` | `toLocaleDateString()` without locale in RTL browser | **FIXED** | Dates breaking on non-English locales |
| 7 | Display/layout | `client-quote-form.tsx:666-786` | Minor responsive issues on narrow screens | **LOW PRIORITY** | Breaking mobile layout |

---

## FIX DEPLOYMENT CLASSIFICATION

### Can be fixed without DB push (safe):
- **CHECK 1 (PDF)**: Wire up `QuotePdfButton` in instant quote form — frontend only
- **CHECK 7 (Layout)**: Responsive CSS adjustments — frontend only

### Already fixed in last session:
- **CHECK 3 (Country)**: PORT_COUNTRY map removed, DB corrected
- **CHECK 4 (DG)**: Zod boolean transform fixed
- **CHECK 5 (Fake rate)**: 70% matchPct rejected
- **CHECK 6 (Date)**: en-GB locale formatting applied

### Not a bug:
- **CHECK 2 (Book Now)**: Auth gating working correctly

### Remaining architectural concerns:
1. `requestSchema` in `quote.ts:485-509` duplicates `quoteSchema` — should reuse one schema
2. PricingRule fallback hardcodes `dgSurcharge: 150` and `reeferSurcharge: 200` — these should come from settings or the rule itself
3. No `/api/bookings/route.ts` or `/api/quote/pdf/route.ts` — booking is purely via server action, PDF is purely client-side via pdfmake
4. `QuoteResult.validUntil` is typed as `Date` but crosses the server action boundary as ISO string — potential serialization confusion on client
