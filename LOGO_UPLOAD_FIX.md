# LOGO UPLOAD FIX - Unified Company Identity System

## Problem
- Settings page (`/settings`) had Google Drive link fields for Logo (light), Logo (dark), Favicon
- Document Builder (`/admin/document-builder`) had upload buttons but didn't cover favicon
- User confused where to upload Website logo vs PDF logo vs Favicon

## Solution: Single Source of Truth

### Where to Upload
**Document Builder** (`/admin/document-builder`) → Company Info tab

| Field | Purpose | Recommended Size |
|-------|---------|-----------------|
| Logo (Website) | Navbar, public pages | 200x60 PNG transparent |
| Logo (PDF / high-res) | Quotes, Invoices, BOL, Documents | 1000px+ wide |
| Favicon | Browser tab icon | 32x32 ICO or PNG |

### Where Each Logo Appears

| Location | Source Field |
|----------|-------------|
| Navbar (public site) | `CompanyInfo.logoUrl` |
| Favicon (browser) | `CompanyInfo.faviconUrl` |
| PDF Quote header | `CompanyInfo.logoForPdfUrl` (fallback: `logoUrl`) |
| PDF Invoice header | `CompanyInfo.logoForPdfUrl` (fallback: `logoUrl`) |

### Files Changed

1. **Prisma Schema** - Added `faviconUrl` field to `CompanyInfo` model
2. **Migration** - `prisma/migrations/20260821000000_add_favicon_url/migration.sql`
3. **`lib/actions/company-info.ts`** - Added `faviconUrl` to string fields and defaults
4. **`components/admin/logo-uploader.tsx`** - Upgraded with drag-drop, preview, delete confirmation, file info display
5. **`components/admin/document-builder.tsx`** - Added favicon upload, 3-column logo grid
6. **`components/landing/navbar.tsx`** - Accepts `logoUrl` prop, displays uploaded logo instead of hardcoded Anchor icon
7. **`app/page.tsx`** - Passes `companyInfo.logoUrl` to Navbar
8. **`app/layout.tsx`** - Sets favicon from `CompanyInfo.faviconUrl`
9. **`app/(dashboard)/settings/page.tsx`** - Added redirect message to Document Builder for logos
10. **`lib/settings-config.ts`** - Removed `company.logoLight`, `company.logoDark`, `company.favicon` text fields
11. **`app/api/upload/logo/route.ts`** - Added `image/x-icon` to allowed types

### Upload API
- **Endpoint**: `POST /api/upload/logo`
- **Storage**: `public/uploads/company/` (local filesystem)
- **Allowed types**: PNG, JPG, SVG, WEBP, ICO
- **Max size**: 5MB
- **Fields**: `file` (FormData), `type` (company/carrier/website)

### After Deploying
1. Run `npx prisma db push` (or migration) to add `faviconUrl` column
2. Go to `/admin/document-builder` → Company Info tab
3. Upload your 3 logos using the drag-drop uploaders
4. Click "Save Company Info"
5. Verify logos appear in Navbar, Favicon, and PDFs

### Old Settings Cleanup
The Settings page (`/settings`) no longer has logo/favicon link fields. It shows a blue info box directing users to Document Builder for company identity management.
