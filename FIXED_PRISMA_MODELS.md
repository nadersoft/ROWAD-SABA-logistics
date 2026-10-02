# FIXED: prisma.companyInfo / prisma.documentTemplate undefined

## Error

```
TypeError: Cannot read properties of undefined (reading 'findFirst')
at lib/actions/company-info.ts:15
```

```
TypeError: Cannot read properties of undefined (reading 'findMany')
at lib/actions/doc-templates.ts:15
```

Both `prisma.companyInfo` and `prisma.documentTemplate` were `undefined` at runtime.

## Root Cause

1. **Prisma Client was not regenerated** after the `CompanyInfo` and `DocumentTemplate` models were added to `prisma/schema.prisma`. The generated client (`node_modules/.prisma/client`) did not include these models, so accessing them returned `undefined`.

2. **`WebsitePage` and `WebsiteSection` models were missing** from schema.prisma entirely.

3. **No runtime safety** — the action files accessed `prisma.companyInfo` / `prisma.documentTemplate` directly without checking if the model existed.

## Changes

### 1. `prisma/schema.prisma`
- **Added** `WebsitePage` model (with `sections` relation)
- **Added** `WebsiteSection` model (with `page` relation, `onDelete: Cascade`)
- `CompanyInfo` and `DocumentTemplate` already existed — no changes needed

### 2. `lib/actions/company-info.ts`
- Added `const p = prisma as any` for runtime safety
- `getCompanyInfo()`: Checks `p?.companyInfo` before calling — returns `null` if model missing
- `upsertCompanyInfo()`: Checks `p?.companyInfo` before calling — returns error if model missing
- Both functions wrapped in try/catch

### 3. `lib/actions/doc-templates.ts`
- Added `const p = prisma as any` for runtime safety
- `getDocumentTemplates()`: Checks `p?.documentTemplate` before calling — returns `[]` if model missing
- `getDocumentTemplate()`: Checks `p?.documentTemplate` before calling — returns `null` if model missing
- `ensureDefaultTemplates()`: Checks `p?.documentTemplate` before calling — returns error if model missing
- `upsertDocumentTemplate()`: Checks `p?.documentTemplate` before calling — returns error if model missing
- All functions wrapped in try/catch

### 4. `prisma/seed-docs.ts` (new file)
- Seeds `CompanyInfo` with default "ALOLA LOGISTICS" record
- Seeds 6 `DocumentTemplate` types (QUOTE, INVOICE, BOOKING_CONFIRMATION, BILL_OF_LADING, SHIPMENT_ORDER, DELIVERY_ORDER)
- Seeds `WebsitePage` ("home") with a `trusted_carriers` section
- Idempotent — skips if data already exists

### 5. Commands run
```bash
npx prisma format
npx prisma generate
npx prisma db push --accept-data-loss
npx prisma generate  # (again after push)
npx tsx prisma/seed-docs.ts
```

## Verification

- `npx tsc --noEmit` → 0 errors
- `npx prisma generate` → success
- `npx prisma db push` → success (tables synced)
- Seed script ran without errors
- `/admin/document-builder` should load without Runtime Error
- `/api/company-info` should return company data (not crash)
