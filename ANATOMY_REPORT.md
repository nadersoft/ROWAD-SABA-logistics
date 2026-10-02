# Anatomy Report — Rowad Sabaa Logistics Platform
## 6 Suspected Bugs Analysis

---

### BUG 1: PricingRule disconnected from quote flow (CRITICAL — root cause of "No live rate")

**Symptom:** User creates a PricingRule in admin → pricing engine returns "No live rate."

**Root cause:** Two separate systems exist with no connection:
- `PricingRule` (admin-created rules via `PricingMatrix` component)
- `ShippingRate` (base cost table used by `computeLaneQuote`)

The `instantQuote` server action at `lib/actions/quote.ts:248-261` queries **only** `ShippingRate`:
```sql
SELECT ... FROM "ShippingRate"
WHERE "originPortId" = ${origin.id}::uuid
  AND "destinationPortId" = ${destination.id}::uuid
  AND "containerTypeId" = ${containerType.id}::uuid
  AND "tier" = 'STANDARD'
  AND "isActive" = true
```

Meanwhile, `matchBestRule()` from `lib/engine/ruleMatcher.ts:166` is **never called** in the quote flow. It's only used by `smartGuard.ts` for validation/auditing.

**Impact:** Admin cannot configure pricing. All quotes fail unless ShippingRate rows exist manually.

**Fix needed:** `computeLaneQuote` must fall back to `matchBestRule()` when no ShippingRate is found, OR ShippingRate must be auto-populated from PricingRules.

---

### BUG 2: Port→Country auto-sync uses hardcoded map, not DB relations (MEDIUM)

**Symptom:** Country dropdown auto-updates to wrong country for ports not in the hardcoded map.

**Root cause:** `components/quote/client-quote-form.tsx:58-71` uses a hardcoded `PORT_COUNTRY` map:
```ts
const PORT_COUNTRY: Record<string, string> = {
  JED: "SA", DMM: "SA", ...  // only 24 ports covered
};
```

The DB has a `Port.countryId` + `Country` relation, but the form doesn't receive or use it. The `new-quote/page.tsx:33` only passes `{ code, name, type }`:
```ts
const portOptions = ports.map((p) => ({ code: p.code, name: p.name, type: p.type }));
```

**Impact:** Any port not in the 24-entry hardcoded map defaults to "SA". New ports added to DB won't auto-sync.

**Fix needed:** Pass `countryId` from Port → PortOption → form, use DB as source of truth, keep hardcoded map as fallback only.

---

### BUG 3: Equipment type/size selector has no effect on pricing (LOW)

**Symptom:** User selects "Reefer" + "40RE" but price shows no reefer surcharge unless they also change the container type dropdown.

**Root cause:** The form has two overlapping systems:
1. **Equipment type/size** (new MSC-style selector) → stored in `equipmentSizes[]`, `equipmentType`
2. **Container type dropdown** (original) → used by `computeLaneQuote` for ShippingRate lookup

The pricing engine only uses `containerType` (line 202-209 of quote.ts):
```ts
const containerType = await prisma.containerType.findFirst({
  where: { code: input.containerType.toUpperCase(), isActive: true },
});
```

The reefer surcharge check uses `equipmentType` (line 333):
```ts
if (input.equipmentType === "Reefer" || (input.temperature && input.temperature !== 0))
```

So if user selects Reefer equipment but keeps "20GP" in the container type dropdown, the ShippingRate lookup uses 20GP's ID, but the reefer surcharge does apply. The **equipment sizes** (`equipmentSizes[]`) are only stored — never used for pricing.

**Impact:** Equipment type affects reefer surcharge only. Equipment sizes are purely informational.

---

### BUG 4: LCL/AIR mode silently broken — contact card is intentional (INFO — not a bug)

**Observation:** LCL and AIR modes show a contact card (WhatsApp + email) instead of the pricing form.

**Root cause:** This is **intentional design** (lines 288-314 of client-quote-form.tsx). The comment `BUG 3` in the code is misleading — it's a feature label, not a bug marker.

**Impact:** LCL/AIR quotes cannot be instant-quoted. This is by design for now.

---

### BUG 5: Container type dropdown vs equipment size selector — UX confusion (MEDIUM)

**Symptom:** User sees two ways to select container size (dropdown + checkboxes) but they serve different purposes.

**Root cause:** The form has:
- Line 94: `const [containerType, setContainerType] = useState(containerTypes[0]?.code ?? "");` — used for pricing
- Line 100: `const [equipmentSizes, setEquipmentSizes] = useState<string[]>(["20GP"]);` — stored but not used for pricing

The container type dropdown (line 94) is the one that matters for pricing. The equipment size checkboxes (line 338-357) are a newer MSC-standard UI element but don't replace the dropdown's pricing function.

**Impact:** Users may think selecting equipment size is sufficient. They must also select the correct container type.

---

### BUG 6: Session check uses `lastActivity` but session cookie may not update (MEDIUM)

**Symptom:** Session expires unexpectedly or warning never shows.

**Root cause:** `auth.ts:76` sets `token.lastActivity = Date.now()` on `trigger === "update"`, but `updateAge: SESSION_UPDATE_AGE` (24 hours) means the JWT cookie only updates every 24 hours. The `session-check/route.ts:16` calculates:
```ts
const remainingTime = Math.max(0, SESSION_MAX_AGE - elapsed);
```

If `lastActivity` is stale (>24h old), the check still passes because `SESSION_MAX_AGE` is 30 days. The warning only triggers when `remainingTime <= 5 minutes`, which would be at ~29d 23h 55m — effectively never in normal use.

**Impact:** Session warning is effectively disabled. Users won't see it until the very end of 30 days.

---

## Summary of Critical Fixes Needed

| Priority | Bug | Fix |
|----------|-----|-----|
| P0 | PricingRule disconnected | Add matchBestRule fallback in computeLaneQuote |
| P1 | Port→Country hardcoded | Pass countryId from DB, use as primary source |
| P2 | Equipment sizes unused | Either remove or connect to pricing |
| P3 | Session warning threshold | Adjust WARNING_THRESHOLD or update logic |
