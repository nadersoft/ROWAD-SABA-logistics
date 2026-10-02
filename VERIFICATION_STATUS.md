# Verification Status

| Fix | Status | Evidence (file:line + snippet) |
|-----|--------|-------------------------------|
| Fields values missing | **FIXED** | `components/admin/pricing-matrix.tsx:729-760` — Always renders checkbox + value input for every field; input uses `disabled={!isEnabled}` so it is always in DOM. No conditional `{includes() && <input>}`. |
| Booking flow localStorage | **NOT FIXED** | localStorage set works, but restore useEffect is missing and login page ignores callbackUrl. |
| PDF JSON | **FIXED** | `components/quote/client-quote-form.tsx:813-816` — Uses `QuotePdfButton` component. No Blob `.json` remains. |

---

## CHECK 1: Fields Values on New Rule — FIXED

**File:** `components/admin/pricing-matrix.tsx:729-760`

```tsx
{fields.map((f) => {
  const isEnabled = enabledFieldIds.includes(f.id);
  const val = fieldValueMap[f.id] ?? String(f.defaultValue ?? 0);
  return (
    <div key={f.id} className={`...${isEnabled ? "bg-white border-blue-400 shadow-sm" : "bg-gray-100 border-gray-200"}`}>
      <label className="flex items-center gap-2 cursor-pointer flex-1">
        <input type="checkbox" checked={isEnabled}
          onChange={(e) => {
            if (e.target.checked) setEnabledFieldIds([...enabledFieldIds, f.id]);
            else setEnabledFieldIds(enabledFieldIds.filter((k) => k !== f.id));
          }} />
        <span className="text-sm">{f.label}</span>
      </label>
      <input type="number" value={val}
        onChange={(e) => setFieldValueMap({ ...fieldValueMap, [f.id]: e.target.value })}
        disabled={!isEnabled}
        className={`...${!isEnabled ? "bg-gray-200 opacity-50 cursor-not-allowed" : "bg-white border-gray-300 ..."}`} />
    </div>
  );
})}
```

**Verdict:**
- Inputs ALWAYS render (controlled `value` + `disabled` prop), not conditionally.
- Checkboxes are controlled (`checked` + `onChange`) with `enabledFieldIds` state — toggling re-renders and enables/disables the input.
- Default values come from the `fields` prop (DB `FieldRow.defaultValue`), not a hardcoded `FIELD_DEFS` array. This is the correct dynamic approach.

---

## CHECK 2: Book Now localStorage Flow — NOT FIXED

### Part A: localStorage.setItem (WORKS)

**File:** `components/quote/client-quote-form.tsx:247-262`

```tsx
async function onSaveAndBook() {
  if (!isAuthenticated || !session?.user) {
    if (result) {
      localStorage.setItem("pendingQuote", JSON.stringify({
        origin: result.originCode,
        destination: result.destinationCode,
        containerType: result.containerTypeCode,
        mode: result.mode,
        total: result.offer?.total,
        currency: result.currency,
        timestamp: Date.now(),
      }));
    }
    router.push("/login?callbackUrl=/dashboard/new-quote");
    toast.info("Please sign in to complete your booking.");
    return;
  }
  // ... authenticated path
}
```

**Verdict: WORKS** — saves full quote context to localStorage before redirect.

### Part B: useEffect to restore pendingQuote (MISSING)

**File:** `components/quote/client-quote-form.tsx:121-128`

The only `useEffect` in the file fetches public settings. There is **no** `restorePending` useEffect that reads `localStorage.getItem("pendingQuote")` and calls `requestQuote()`.

```tsx
useEffect(() => {
  fetch("/api/public/settings")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => { if (data) setContact(data); })
    .catch(() => {});
}, []);
// <-- No restorePending useEffect exists
```

**Verdict: NOT FIXED** — after login, the pending quote is never restored or submitted.

### Part C: Login page callbackUrl handling (BROKEN)

**File:** `app/(auth)/login/page.tsx` — Server component, does **not** read `searchParams`.

**File:** `components/auth/login-form.tsx:12-14` — Accepts `redirectTo` prop but login page never passes `callbackUrl` from searchParams. The login page renders `<LoginForm companyName={companyName} />` with the default `redirectTo="/dashboard"`.

The `callbackUrl` query param sent by `router.push("/login?callbackUrl=/dashboard/new-quote")` is completely ignored.

**Verdict: NOT FIXED** — even if restore existed, user would land on `/dashboard` instead of `/dashboard/new-quote`.

---

## CHECK 3: PDF Fix — FIXED

**File:** `components/quote/client-quote-form.tsx:813-816`

```tsx
{pdfData && (
  <QuotePdfButton
    data={pdfData}
    filename={`quote-${result.originCode}-${result.destinationCode}.pdf`}
  />
)}
```

No more `Blob` with `application/json` type or `.json` extension. Uses proper `QuotePdfButton` component with `QuotePdfData` type (line 282).

**Verdict: FIXED**

---

## Summary: What Still Needs Fixing

1. **Restore useEffect missing** in `components/quote/client-quote-form.tsx` — Need a `useEffect` that on mount checks `localStorage.getItem("pendingQuote")`, parses it, and calls `requestQuote()` with the saved data, then clears localStorage.

2. **Login callbackUrl broken** in `app/(auth)/login/page.tsx` — The login page is a server component that does not read `searchParams.get("callbackUrl")` and does not pass it to `LoginForm`. Needs to:
   - Accept `searchParams` prop
   - Read `callbackUrl` from searchParams
   - Pass it to `<LoginForm redirectTo={callbackUrl ?? "/dashboard"} />`
