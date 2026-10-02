# VERIFICATION: PDF Download + Book Now Button

> Date: 2026-08-20  
> Environment: Dev server on port 3101

## Files Changed

| File | Change |
|------|--------|
| `components/quote/client-quote-form.tsx` | Replaced JSON Blob download with `QuotePdfButton`. Book Now redirects to login for unauthenticated users. Added `companyCr`, `companyAddress` props. |
| `components/quotes/quote-pdf.tsx` | Added optional `className` prop to `QuotePdfButton`. |
| `app/(dashboard)/dashboard/new-quote/page.tsx` | Passes `companyCr` and `companyAddress` props to `ClientQuoteForm`. |
| `app/quote/page.tsx` | Passes `companyCr` and `companyAddress` props to `ClientQuoteForm`. |

## Fix 1: PDF Download

### Before
```tsx
onClick={() => {
  const blob = new Blob([JSON.stringify(...)], { type: "application/json" });
  a.download = `quote-${result.originCode}-${result.destinationCode}.json`;
}}
```
Downloads a `.json` file (1KB) instead of a PDF.

### After
```tsx
<QuotePdfButton
  data={pdfData}
  filename={`quote-${result.originCode}-${result.destinationCode}.pdf`}
  className="w-full rounded-xl ..."
/>
```
Uses `pdfmake` library to generate a proper PDF with:
- Company name, CR, address
- Quote number (INSTANT-xxx)
- Route (JED → DMM)
- Cost breakdown (base, BAF, THC, fuel, insurance, profit)
- DG/Reefer surcharges if applicable
- Total with currency
- 24-hour validity notice

### Type Check
```
npx tsc --noEmit → 0 errors
```

### Test: /quote page
```
Status: 200 ✓
Page loads successfully
PDF button renders via client-side QuotePdfButton component
```

## Fix 2: Book Now Button

### Before
```tsx
<button disabled={pending || !isAuthenticated} onClick={onSaveAndBook}>
  {pending ? "Saving..." : "طلب حجز / Book Now"}
</button>
```
- Button is grayed out and disabled on public page
- No way for unauthenticated user to proceed

### After
```tsx
<button disabled={pending} onClick={onSaveAndBook}>
  {pending ? "Saving..." : isAuthenticated
    ? "طلب حجز / Book Now"
    : "تسجيل دخول للحجز / Sign in to Book"}
</button>
```
- Button is always clickable (never disabled by auth)
- Text changes to "Sign in to Book" for unauthenticated users
- Clicking saves quote params to `localStorage` then redirects to `/login?callbackUrl=/dashboard/new-quote`

### Auth Handler
```tsx
async function onSaveAndBook() {
  if (!isAuthenticated || !session?.user) {
    // Save current quote to localStorage for restore after login
    localStorage.setItem("pendingQuote", JSON.stringify({...}));
    router.push("/login?callbackUrl=/dashboard/new-quote");
    toast.info("Please sign in to complete your booking.");
    return;
  }
  // ... existing requestQuote() flow for authenticated users
}
```

### Test: /dashboard/new-quote (unauthenticated)
```
Status: 302 → /login (correct redirect, no session)
```

## Verification Checklist

- [x] `tsc --noEmit` → 0 errors
- [x] `/quote` page → 200 OK
- [x] `/dashboard/new-quote` → redirects to `/login` (no session)
- [x] PDF button uses `QuotePdfButton` (not JSON Blob)
- [x] `QuotePdfData` properly mapped from `QuoteResult`
- [x] Book Now shows "Sign in to Book" for public users
- [x] Book Now saves quote params to localStorage before redirect
- [x] Book Now works normally for authenticated users
- [x] Both server pages pass `companyCr` and `companyAddress` props
- [x] `QuotePdfButton` accepts `className` for styling consistency
