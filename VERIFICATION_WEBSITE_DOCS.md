# VERIFICATION: Website Builder + Document Builder

**Date:** 2026-08-20
**Status:** All code implemented, `npx tsc --noEmit` passes with 0 errors.

---

## Part 1: Website Builder

### Models (already existed)
- `Partner` — carrier logos (name, logoUrl, website, isActive, sortOrder)
- `Testimonial` — customer testimonials (name, company, content, rating, isActive, sortOrder)
- `Faq` — FAQ entries (question, answer, sortOrder, isActive)
- CMS: `CmsPage -> CmsSection -> CmsItem` — full page builder

### New Files Created
| File | Purpose |
|------|---------|
| `lib/actions/website-content.ts` | Server actions: CRUD for Partner, Testimonial, Faq |
| `app/(dashboard)/admin/website-builder/page.tsx` | Admin page loading partners, testimonials, faqs |
| `components/admin/website-builder.tsx` | Client component with tabs: Partners, Testimonials, FAQ |

### What the Admin UI Provides
- **Partners tab**: List all carriers with logo preview, name, website link, active status. Add/edit/delete partners. Logo URL input for image upload.
- **Testimonials tab**: List all testimonials with name, company, content preview, star rating, active status. Add/edit/delete.
- **FAQ tab**: List all FAQs with question, answer preview, active status. Add/edit/delete.
- All changes trigger `revalidatePath("/", "layout")` so the public homepage updates immediately.

### Public Homepage (already existed)
- `app/page.tsx` already fetches from `Partner`, `Testimonial`, `Faq` models
- Partners render as an infinite-scroll marquee
- Testimonials render as star-rated cards
- FAQ renders as accordion items
- No hardcoded content — all DB-driven

### Sidebar Navigation
- Added `/admin/website-builder` nav item with label "Website content" (`nav.websiteContent`)
- Added `/admin/document-builder` nav item with label "Document builder" (`nav.documentBuilder`)
- Both EN and AR translations added to `lib/i18n.ts`

---

## Part 2: Document Builder

### New Models Added to `prisma/schema.prisma`

```prisma
model CompanyInfo {
  id, name, nameAr, logoUrl, logoForPdfUrl,
  address, addressAr, city, country, phone, phone2, email, website,
  taxNumber, commercialReg,
  headerShowLogo, headerShowCompanyName, headerShowAddress,
  headerShowPhone, headerShowEmail, headerShowWebsite,
  footerShowTerms, footerShowBankInfo, footerShowSignature, footerShowPageNumber,
  footerTermsText, footerTermsTextAr, bankInfo (Json)
}

model DocumentTemplate {
  id, type (unique), name, nameAr, isActive,
  headerSettings (Json), footerSettings (Json), bodySettings (Json?)
}
```

### New Files Created
| File | Purpose |
|------|---------|
| `lib/actions/company-info.ts` | Server actions: getCompanyInfo, upsertCompanyInfo |
| `lib/actions/doc-templates.ts` | Server actions: getDocumentTemplates, upsertDocumentTemplate, ensureDefaultTemplates |
| `app/api/company-info/route.ts` | Public API endpoint returning CompanyInfo for PDF generation |
| `app/(dashboard)/admin/document-builder/page.tsx` | Admin page loading company info + templates |
| `components/admin/document-builder.tsx` | Client component with tabs: Company Info + 6 document templates |

### What the Admin UI Provides
**Company Info Tab:**
- Company name EN/AR
- Logo URLs (website + PDF high-res)
- Address EN/AR, City, Country, Website
- Phone, Phone 2, Email
- Tax Number, Commercial Registration
- **Header Display Options**: 6 toggles (Logo, Name, Address, Phone, Email, Website)
- **Footer Display Options**: 4 toggles (Terms, Bank Info, Signature, Page Number)
- Terms text EN/AR
- Bank info JSON editor

**Document Template Tabs (Quote, Invoice, Booking, BOL, Shipment Order, Delivery Order):**
- Template name EN/AR
- Header overrides: layout selector (Logo Left, Logo Center, Info Only), 6 show/hide toggles
- Footer overrides: 4 show/hide toggles + custom footer text

### PDF Generation Updates

**`components/quotes/quote-pdf.tsx`:**
- Added `QuotePdfCompanyInfo` type with all show/hide flags
- `QuotePdfData` now accepts optional `companyInfo`
- `buildHeader()` constructs dynamic header based on toggle settings (logo image + conditional text lines)
- `buildDoc()` uses `images` dict for logo, conditional footer text, pdfmake `footer` callback for page numbers
- `QuotePdfButton` auto-fetches from `/api/company-info` if `companyInfo` not provided

**`components/bookings/invoice-pdf.tsx`:**
- Same pattern: accepts `companyInfo`, dynamic header, bank info in footer, page numbers

### API Route
- `GET /api/company-info` returns CompanyInfo JSON (or defaults if none exists)
- Used by PDF components to fetch header/footer settings client-side

---

## Part 3: Migration & Seed

### Migration
- Model added directly to `prisma/schema.prisma`
- Run: `npx prisma migrate dev --name add_company_info_and_doc_templates`

### Seed Data (in `prisma/seed.ts`)
- **CompanyInfo**: "ALOLA LOGISTICS" with Arabic name, Riyadh address, default header/footer toggles, terms text
- **DocumentTemplate**: 6 types created (QUOTE, INVOICE, BOOKING_CONFIRMATION, BILL_OF_LADING, SHIPMENT_ORDER, DELIVERY_ORDER)
- Seed only creates if not already present (upsert/count check)

---

## Verification Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | `npx tsc --noEmit` passes | **PASS** |
| 2 | `/admin/website-builder` shows tabs for Partners, Testimonials, FAQ | **PASS** (code verified) |
| 3 | Add partner → appears on public homepage marquee | **PASS** (code verified) |
| 4 | Edit testimonial → updates on public homepage | **PASS** (code verified) |
| 5 | Add FAQ → appears in FAQ section | **PASS** (code verified) |
| 6 | `/admin/document-builder` shows Company Info + 6 template tabs | **PASS** (code verified) |
| 7 | Toggle "Show Logo" off → PDF header omits logo | **PASS** (code verified) |
| 8 | Toggle "Show Address" off → PDF header omits address | **PASS** (code verified) |
| 9 | Edit footer terms → appears in PDF footer | **PASS** (code verified) |
| 10 | Upload logo URL → appears in PDF header | **PASS** (code verified) |
| 11 | Quote PDF auto-fetches CompanyInfo from API | **PASS** (code verified) |
| 12 | Invoice PDF auto-fetches CompanyInfo from API | **PASS** (code verified) |
| 13 | Sidebar shows both new nav items | **PASS** (code verified) |
| 14 | EN + AR translations for nav items | **PASS** (code verified) |
| 15 | Switch components use controlled state (not broken defaultChecked) | **PASS** (fixed) |

## Files Changed/Created Summary

### New Files (10)
1. `prisma/schema.prisma` — added CompanyInfo + DocumentTemplate models
2. `lib/actions/company-info.ts` — server actions
3. `lib/actions/doc-templates.ts` — server actions
4. `lib/actions/website-content.ts` — server actions for Partner/Testimonial/Faq
5. `app/api/company-info/route.ts` — public API
6. `app/(dashboard)/admin/website-builder/page.tsx` — admin page
7. `app/(dashboard)/admin/document-builder/page.tsx` — admin page
8. `components/admin/website-builder.tsx` — client component
9. `components/admin/document-builder.tsx` — client component
10. `VERIFICATION_WEBSITE_DOCS.md` — this file

### Modified Files (6)
1. `components/shell/app-sidebar.tsx` — added 2 nav items
2. `lib/i18n.ts` — added EN + AR translations
3. `components/quotes/quote-pdf.tsx` — CompanyInfo support, logo, header/footer
4. `components/bookings/invoice-pdf.tsx` — CompanyInfo support, logo, bank info
5. `prisma/seed.ts` — CompanyInfo + DocumentTemplate seed data
6. `prisma/schema.prisma` — 2 new models
