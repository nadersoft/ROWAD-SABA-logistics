# FIXED: Logo Upload from Computer + Central Logo System + Developer Contact Widget

## Problem
User pasted Google Drive view links (`https://drive.google.com/file/d/.../view?usp=drive_link`) as `logoUrl` — these are NOT direct image URLs and browsers cannot render them. Needed real file upload from computer to `/public/uploads/`.

## What Was Built

### Part 1: Google Drive Link Converter
**`lib/utils/logo-helpers.ts`**
- `normalizeLogoUrl()` converts Google Drive view links to direct image links
- `https://drive.google.com/file/d/FILE_ID/view?usp=...` → `https://drive.google.com/uc?export=view&id=FILE_ID`
- Used everywhere logo URLs are displayed

### Part 2: Real File Upload System

**`app/api/upload/logo/route.ts`** — Upload API endpoint
- Accepts `file` + `type` (company/carrier/website) via FormData
- Validates file type (PNG, JPG, SVG, WEBP) and size (max 5MB)
- Saves to `public/uploads/{type}/` with unique filenames
- Returns the public URL path

**`components/admin/logo-uploader.tsx`** — Reusable upload component
- Shows current logo preview (if any)
- "Upload Logo" button opens file picker
- Local preview shown immediately via `URL.createObjectURL`
- Uploads to API in background, updates preview on success
- Displays validation info (file types, max size)

**`lib/pdf-helpers.ts`** — PDF logo helper
- `getLogoDataUrl()` converts any URL to base64 data URL for pdfmake
- Handles local `/uploads/` paths and remote URLs

### Part 3: Admin Pages Updated

**`components/admin/document-builder.tsx`**
- Replaced logo URL text inputs with `<LogoUploader type="company">`
- Website logo and PDF logo have separate upload buttons
- Hidden inputs pass logo URLs to form submission

**`components/admin/website-builder.tsx`**
- Replaced partner logo URL text input with `<LogoUploader type="carrier">`
- Partner table shows normalized logo via `normalizeLogoUrl()`

### Part 4: Central Logo System

**`components/quotes/quote-pdf.tsx`**
- Imports `normalizeLogoUrl` — all PDF logos go through the normalizer

**`components/bookings/invoice-pdf.tsx`**
- Same — `normalizeLogoUrl()` applied to `logoForPdfUrl`

### Part 5: Developer Contact Widget

**`components/admin/developer-contact-widget.tsx`**
- Contact card with developer info, phone, WhatsApp, email buttons

**`components/admin/developer-fab.tsx`**
- Floating action button (bottom-left, blue, chat icon)
- Click opens `DeveloperContactWidget` popup

**`app/(dashboard)/layout.tsx`**
- `<DeveloperFab />` added — appears on ALL admin/dashboard pages

## Files Created (6)
| File | Purpose |
|------|---------|
| `lib/utils/logo-helpers.ts` | Google Drive URL converter |
| `app/api/upload/logo/route.ts` | File upload API |
| `components/admin/logo-uploader.tsx` | Reusable upload component |
| `components/admin/developer-contact-widget.tsx` | Developer contact card |
| `components/admin/developer-fab.tsx` | Floating action button |
| `lib/pdf-helpers.ts` | PDF logo data URL helper |

## Files Modified (5)
| File | Change |
|------|--------|
| `components/admin/document-builder.tsx` | LogoUploader for website + PDF logos |
| `components/admin/website-builder.tsx` | LogoUploader for partner logos |
| `components/quotes/quote-pdf.tsx` | normalizeLogoUrl applied |
| `components/bookings/invoice-pdf.tsx` | normalizeLogoUrl applied |
| `app/(dashboard)/layout.tsx` | DeveloperFab added |

## Verification

1. `npx tsc --noEmit` → 0 errors
2. `/admin/document-builder` → Upload buttons for website logo + PDF logo
3. Upload PNG → saves to `/uploads/company/` → shows preview → appears in PDF
4. Paste Google Drive link → auto-converts to direct image URL
5. `/admin/website-builder` → Partner rows have upload button
6. Upload partner logo → appears in homepage carrier marquee
7. Blue floating button bottom-left on all admin pages → opens developer contact
8. WhatsApp button opens `wa.me/967777250138` with prefilled message
