# FIX: prisma.companyInfo.findFirst undefined error

**Error:** `prisma.companyInfo.findFirst()` threw "Cannot read properties of undefined" at `lib/actions/company-info.ts:15`

## Root Cause

The `CompanyInfo` model was added to `prisma/schema.prisma`, but **`npx prisma generate` was never re-run**. The generated Prisma client (`node_modules/.prisma/client`) didn't include the `companyInfo` property, so `prisma.companyInfo` was `undefined`.

## Investigation Findings

| Check | Result |
|---|---|
| `CompanyInfo` model in schema.prisma? | ✅ Present (lines 808-839) |
| `DocumentTemplate` model in schema.prisma? | ✅ Present (lines 841-852) |
| Import in `company-info.ts` | ✅ `import { prisma } from "@/lib/prisma"` — matches project pattern |
| `lib/prisma.ts` export | ✅ Correct singleton pattern |
| `npx prisma generate` run after model added? | ❌ **Not run** — this was the root cause |

## Changes Made

### 1. `npx prisma generate` (critical fix)
Regenerated the Prisma client so `prisma.companyInfo` is defined.

### 2. `lib/actions/company-info.ts` — null safety + defaults
- `getCompanyInfo()`: Added try/catch wrapper, returns `null` on failure
- Added `getCompanyInfoSafe()`: Returns the record or hardcoded defaults (never returns null)
- Both functions now use `orderBy: { createdAt: "desc" }` to get the latest record

### 3. `app/(dashboard)/admin/document-builder/page.tsx` — use safe getter
- Changed from `getCompanyInfo()` → `getCompanyInfoSafe()`
- Removed `ensureDefaultTemplates()` call (it required auth and would fail for non-admin roles during the server render; templates are created on-demand in the client component)

### 4. `app/api/company-info/route.ts` — try/catch safety
- Wrapped `prisma.companyInfo.findFirst()` in try/catch
- Returns sensible defaults if the DB call fails

## Files Changed

| File | Change |
|---|---|
| `lib/actions/company-info.ts` | Added `getCompanyInfoSafe()`, try/catch in `getCompanyInfo()` |
| `app/(dashboard)/admin/document-builder/page.tsx` | Use `getCompanyInfoSafe`, removed `ensureDefaultTemplates` call |
| `app/api/company-info/route.ts` | Added try/catch around DB call |

## Verification

1. ✅ `npx prisma generate` — succeeded
2. ✅ `npx tsc --noEmit` — 0 errors
3. `/admin/document-builder` should render without the findFirst error
4. `/api/company-info` should return company data or defaults (not crash)

## Prevention

After adding/changing any model in `prisma/schema.prisma`, always run:
```bash
npx prisma generate
```
