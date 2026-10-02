# CHECKPOINTS — سجل نقاط الاستعادة (Save Game) — Rowad Sabaa Logistics

> يُنشأ ويُحدَّث تلقائياً. لا تحذف أي Checkpoint.
> كل Checkpoint: ID · تاريخ · ما تم · Build log · curl tests · ملفات · hash.
> آخر نقطة أعلى رقم = آخر حالة. للمقارنة: قارن مع REQUIREMENTS_GOLD.md.

---

## Checkpoint cp-013 — 2026-08-15 — DONE: EXECUTION ENGINE BUGFIXES (BUG-1…6 MAP TO REAL FILES, KEEP COMPAT)
- **القرار:** "Map to real files, keep compat" — ملفات البرومبت الافتراضية (`lib/validations/auth.ts`، `lib/actions/master-data.ts`، `lib/data/countries.ts`، `lib/i18n/dictionary.ts`، `components/settings/origin-country-select.tsx`، `components/icons/phone-call.tsx`) لم تكن موجودة؛ عُيّن كل BUG على الملفات الحقيقية دون كسر cp-010/012.
- **BUG-1:** `lib/auth.ts` registerSchema أصلاً `name` (لا regex يرفض الأرقام) + رسائل محددة `issues[0].message`؛ فقط `max(80)→max(50)`. `phone/countryCode` بقيا optional (لا حذف — يحفظ flow الهاتف). الفورم email-only يعرض الرسالة المحددة أصلاً.
- **BUG-2:** `/login` تحوّل من glass-panel أبيض-على-داكن إلى كارد أبيض مطابق للتسجيل (bg-white / text-slate-900 / inputs slate-300). i18n AR/EN + `dir=rtl` موجودان مسبقاً (lib/i18n.ts + app/layout.tsx:53-54) — لا تكرار.
- **BUG-3:** `components/icons/phone-call.tsx` (جديد، PhoneCallIcon lucide-path currentColor) + أيقونات WhatsApp/Phone في فوتر `/` (عمود Connect) وفوتر جديد أسفل كارد الـ auth (`app/(auth)/layout.tsx`). روابط `tel:` + `wa.me` من settings `content.contact.phone` + `floating_whatsapp_number` (مع fallback legacy `appearance.floatingWhatsapp*`).
- **BUG-4 (الجذر الحقيقي):** `components/ui/switch.tsx` = Radix `<button>` لا يُرسل في FormData → كل update يقرأ isActive غائباً → false (هذا سبب وصول YE بـ isActive:false). الإصلاح في كل الـ dialogs: Switch متحكم به + `<input type="hidden" name="isActive|isEnabled" value="true|false">` في `master-data.tsx` (country/port/currency) · `users-manager.tsx` (user) · `pricing-matrix.tsx` (rule + field). أُضيف `revalidatePath` بعد كل طفرة في `lib/actions/{countries,currencies,users,pricing,fields}.ts`. **Seed:** اليمن `{code:"YE", dialCode:"+967"}` أُضيف (لا عمود priority في النموذج). صف YE في DB أصبح isActive:true.
- **BUG-5:** مكتمل سابقاً (MasterDataPicker + /settings يقرآن prisma isActive:true). أُنشئ المصدر الموحد `lib/data/get-active-data.ts` (getActiveCountries/Ports/Currencies/ContainerTypes) ورُبط في صفحة /settings. `countries-with-phone.ts` بقي (مستخدم في /account).
- **BUG-6:** الدردشة معطلة منذ cp-012 (`{false && <FloatingActions/>}` + TODO في app/layout.tsx:64-65) — لا widget عائم في HTML.
- **Build log (order per spec):** `npx prisma generate` EXIT 0 ✓ · `npx tsc --noEmit` EXIT 0 ✓ · `npm run lint` EXIT 0 ✓ (تحذير `<img>` سابق فقط) · `npm run build` green — **28 routes** ✓.
- **Manual checks (prod :3001 — أُعيد تشغيل الخادم):** `/` 200 — wa.me ✓ tel ✓ أيقونتا WhatsApp/Phone ✓ لا floating chat ✓ · `/login` كارد أبيض ✓ لا glass-panel ✓ · `/auth/register` 200 — كارد أبيض، لا حقل phone ✓ · login كأدمن (NextAuth) → `/admin/settings` 200 + كل التبويبات + Yemen ✓ · `/settings` 200 — Yemen ظاهر في origin picker (فلتر isActive يعمل) ✓.
- **DB:** لا هجرة جديدة (schema بلا تغيير). الخوادم: `next start -p 3001` (prod) يعمل. أرشيف `PROJECT_MAP.cp-012.md` باقٍ.

---

## Checkpoint cp-012 — 2026-08-15 04:10 — DONE: ZERO-DEFECT v5 FINAL (EMAIL-ONLY REGISTER + READABLE COLORS + CHAT DISABLED + REAL WHATSAPP ICON)
- **A1 — Email-only register (`components/auth/register-form.tsx`):** حُذف استيراد `COUNTRIES_PHONE` والدول نهائياً، حُذف `usePhone`/`channel` وتبديل WhatsApp/SMS↔Email، حُذف حقل `phone` + `select` الدولة، حُذف أيقونتي Phone/Mail من اللوجين. بقي: Full name + Email + Password + زر واحد **"Send code by email"**. يرسل `sendOtp` بريداً فقط و`verifyOtpAndRegister` بـ name/email/password/otp (schema في lib/auth.ts لم يُلمس — متوافق لأن phone optional هناك). الزود schema لا يُغيَّر (الموجود يسمح email-only أصلاً).
- **A2 — Readable colors (نفس الملف):** الكارد أصبح أبيض `bg-white border-slate-200 rounded-2xl shadow-xl` بدل glass، العنوان `text-slate-900`، الـ Labels `text-slate-800`، الـ Inputs `text-slate-900 border-slate-300 focus:border-blue-500 bg-white`، النص المساعد `text-slate-600`، رسالة الخطوة 2 `text-slate-700/900`، روابط Sign in/Back `text-slate-600/blue-600`. لم يعد هناك نص أبيض على زجاج داكن.
- **A3 — Floating chat disabled (`app/layout.tsx`):** `<FloatingActions {...floating} />` مغلّف بـ `{false && ...}` + تعليق `TODO: enable via admin - will be replaced by DB setting when model Setting is created - currently disabled per requirement CP-011 A3`. `getFloatingProps` باقٍ (لا unused var). لا model Setting جديد، لا NEXT_PUBLIC.
- **B4 — Real WhatsApp icon (`components/icons/whatsapp.tsx` — جديد):** SVG حقيقي `#25D366` باسم `WhatsappIcon` (size + className). مستخدم في `components/account/phone-verification-card.tsx` (قسم "Verify your phone" في `/account`) بدل أيقونة `Phone` من lucide. (`page.tsx` لا يحتوي أيقونة Phone؛ القسم الفعلي في الكارد).
- **Build log (order per CP-011+012):** `npx prisma generate` EXIT 0 ✓ (بعد إيقاف الخوادم لأن DLL مقفول) · `npm run typecheck` (tsc --noEmit) EXIT 0 ✓ · `npm run lint` EXIT 0 ✓ (تحذير `<img>` سابق فقط في app/page.tsx) · `npm run build` Compiled successfully — **28 routes** ✓.
- **Manual checks (prod :3001):** `/auth/register` HTTP 200 — "Send code by email" موجود ✓ · لا "WhatsApp / SMS" toggle ✓ · لا countryCode select ✓ · `bg-white` + `text-slate-900` + `text-slate-800` + `text-slate-600` في HTML ✓ · `/` HTTP 200 — لا `wa.me` ولا livechat anchor (الأزرار العائمة غير موجودة) ✓ · `#25D366` موجود في `.next-prod/static/chunks/app/(dashboard)/account/page-*.js` ✓ (القسيم يتطلب auth → تحقق من bundle).
- **CSS:** نفس المسار لا CSS تغيّر (لم نلمس auth.css) — build CSS سابق ≥ 101KB.
- **DB:** لا هجرة جديدة (schema cp-009/cp-010 بلا تغيير). الخوادم: `next start -p 3001` (prod) + `next dev -p 3101` يعملان بالتوازي (distDir منفصل: `.next-prod` / `.next`).
- **أرشيف:** `PROJECT_MAP.cp-012.md` (31,372 B) محفوظ.

---

## Checkpoint cp-010 — 2026-08-15 01:40 — DONE: ADD/VERIFY PHONE LATER ON /account (AUTH v2.1)
- **ما تم:** مستخدمو البريد فقط يستطيعون إضافة + تحقق من رقم الهاتف لاحقاً من `/account`. بطاقة "Verify your phone" تظهر فقط عند `phoneVerified=false`: اختيار دولة + رقم → OTP واتساب/SMS (نفس سلسلة Twilio→console) → تحقق → `phoneVerified=true` + `phone` + `countryCode` بمعاملة واحدة + AuditLog `PHONE_OTP_SENT`/`PHONE_VERIFIED` + إشعار في التطبيق.
- **Refactor:** استخراج مساعدي OTP المشتركين إلى `lib/otp.ts` (normalizePhone، deliverOtp، deliverEmailOtp، persistOtp، OTP_MAX_ATTEMPTS) — يستخدمه كل من `lib/auth.ts` (تسجيل) و`lib/actions/account.ts` (صفحة الحساب)؛ لا تكرار.
- **ملفات:** lib/otp.ts (جديد)، lib/auth.ts (يستورد المشترك)، lib/actions/account.ts (sendPhoneOtp + verifyPhone)، components/account/phone-verification-card.tsx (جديد)، components/account/account-form.tsx (بطاقة فقط عند عدم التوثيق + سطر "verified" مشروط)، app/(dashboard)/account/page.tsx (يمرر phoneVerified + isDev).
- **Build log:** `npm run build` — Compiled successfully (28 routes)، 0 أخطاء lint/type (تحذير `<img>` سابق فقط). `tsc --noEmit` clean. `next lint` clean.
- **DB test:** `scripts/test-phone-verify.ts` (حذف بعد النجاح) — أنشأ مستخدم email-only → persist OTP → تحقق → `phone:+96771234567` + `phoneVerified:true` → PASS + cleanup.
- **curl tests (next start -p 3001):** `/` 200 · `/auth/register` 200 · `/quote` 200 · `/login` 200 · `/dashboard` `/account` `/admin/*` `/wallet` `/settings` `/support` `/customers` `/integrations` 307 · `/api/notifications` 401 · `/track/ZZZ-9999` 404.
- **CSS:** 130,693 بايت (117,753 + 12,940) ≥ 101KB ✓
- **DB:** لا هجرة جديدة (نفس schema cp-009). الخوادم: `next start -p 3001` (prod) + `next dev -p 3101` يعملان بالتوازي عبر distDir منفصل.
- **أرشيف:** لا يتغير schema؛ PROJECT_MAP.md/CHECKPOINTS.md يُحدَّثان.

---

## Checkpoint cp-009 — 2026-08-14 03:10 — DONE: OPTIONAL PHONE + EMAIL OTP (SELF-SERVICE AUTH v2)
- **ما تم:** التسجيل أصبح اختيارياً بين قناتين: WhatsApp/SMS (رقم + OTP) أو Email (OTP عبر Resend→console). مشاركة دليل الدول `COUNTRIES_PHONE` (اليمن أولاً، السعودية ثانياً، ثم أبجدياً — 150+ دولة بأكواد + أعلام) في `lib/data/countries-with-phone.ts`. حقل `User.phoneVerified Boolean @default(false)` + migration `20260814120000_add_user_phone_verified` + `prisma generate`. تفكيك `.next` (dev) عن `.next-prod` (build/start) في `next.config.js` + Dockerfile حتى يتعايش `next dev -p 3101` مع `next start -p 3001`.
- **Build log:** `npm run build` — Compiled successfully (28 routes)، 0 أخطاء lint/type (إصلاح: `getEnvFallback` في command-center يغطي `resend.key`/`resend.from`).
- **curl tests (next start -p 3001):** `/` 200 · `/auth/register` 200 · `/quote` 200 · `/login` 200 · `/dashboard` 307 · `/admin/*` `/wallet` `/settings` `/support` `/customers` `/integrations` 307 · `/api/notifications` 401 · `/track/ZZZ-9999` 404.
- **CSS:** مخرجات build = 128,278 بايت (115,338 + 12,940) ≥ 101KB ✓
- **DB:** migration `20260814120000_add_user_phone_verified` deployed ✓ · `prisma migrate status` up-to-date (9 migrations).
- **ملفات متأثرة:** prisma/schema.prisma + migration، lib/auth.ts (channel phone/email)، lib/data/countries-with-phone.ts (جديد)، lib/integration-keys.ts + lib/integrations.ts (Resend)، components/auth/register-form.tsx، app/(dashboard)/integrations/page.tsx، app/(dashboard)/admin/command-center/page.tsx، next.config.js (distDir)، Dockerfile.
- **Hash:** schema.cp-009.prisma = D12CD77B10C0B57593429C14CE5AF46E2C71EF8E71FBF8A277F41362A0650B6F.
- **أرشيف:** `PROJECT_MAP.cp-009.md` + `schema.cp-009.prisma` محفوظان.

---

## Checkpoint cp-008 — 2026-08-13 19:30 — DONE: SMART PRICING ENGINE COMPLETE (LOOP 3+4)
- **ما تم:** كل المواصفات 1-10 مكتملة. محرك التسعير الذكي (ruleMatcher + smartGuard + Health 🟢🟡🔴 + Profit% + Impact)، مصفوفة الأسعار /admin/pricing، Master Data /admin/settings (Country+Port+Currency)، Users RBAC /admin/users، /settings Cascading، Wallet Export، Realtime، /auth/register.
- **Build log:** `npm run build` — Compiled successfully (24 routes)، 0 أخطاء lint/type (إصلاح: unused imports, `fieldIds ?? []`, `symbol || ""`, deps useEffect). تحذير واحد فقط `<img>` في app/page.tsx:198.
- **curl tests (npm start -p 3799):** `/` 200 · `/auth/register` 200 · `/quote` 200 · `/login` 200 · `/dashboard` 307→/login · `/admin/pricing` 307→/login?callbackUrl · `/admin/settings` 307 · `/admin/users` 307 · `/wallet` 307 · `/settings` 307 · `/support` 307 · `/customers` 307 · `/api/notifications` 401 · `/track/ZZZ-9999` 404 (notFound صحيح).
- **CSS:** 2 ملفات = 116,240 بايت (106,081 + 12,940) ≥ 101KB ✓
- **DB:** migration `20260813195224_add_country_currency_pricing_engine` deployed ✓ · seed: Countries=6, Currencies=7, Ports=8, FieldDefinitions=5, PricingRules=1 ("FCL — Jeddah → Dammam (40GP)")، PricingRuleFields=4.
- **ملفات متأثرة:** schema.prisma، migration الجديدة، lib/engine/*، lib/actions/{fields,pricing,users,countries,currencies}.ts، app/(dashboard)/admin/{pricing,settings,users}، components/admin/*، app/(auth)/auth/register، app/(dashboard)/wallet، components/shell/notification-bell.tsx، app/api/notifications، components/settings/master-data-picker.tsx، auth.ts، middleware.ts.
- **Hash:** schema.cp-008.prisma = SHA256 عند أرشفة الملف (انظر أدناه).
- **أرشيف:** `PROJECT_MAP.cp-008.md` + `schema.cp-008.prisma` محفوظان.

---

## Checkpoint cp-007 — 2026-08-13 18:20 — DONE: Settings Cascading + RBAC middleware + Wallet + Realtime
- **ما تم:** MasterDataPicker (Country→Port + عملة العرض من DB)، middleware STAFF_ONLY/OPS_ONLY + isActive، Wallet صفحة + تصدير Excel/CSV، NotificationBell SWR poll 30s، /api/notifications.
- **Build log:** ناجح (قبل cp-008).
- **ملفات:** app/(dashboard)/settings/page.tsx، components/settings/master-data-picker.tsx، lib/settings-config.ts، app/(dashboard)/wallet، components/shell/notification-bell.tsx، app/api/notifications/route.ts، middleware.ts، auth.ts.

## Checkpoint cp-006 — 2026-08-13 17:30 — DONE: Admin UI (Pricing Matrix / Master Data / Users)
- **ما تم:** /admin/pricing (تقرير Smart Guard + Health + Profit% + Impact + أيقونات Box/Package/Plane/Ship/Snowflake)، /admin/settings (دول/موانئ/عملات CRUD + Set default)، /admin/users (CRUD + isActive + إعادة تعيين كلمة مرور + حماية ذات).
- **Build log:** ناجح.
- **ملفات:** app/(dashboard)/admin/{pricing,settings,users}/page.tsx، components/admin/{pricing-matrix,master-data,users-manager}.tsx.

## Checkpoint cp-005 — 2026-08-13 16:20 — DONE: Actions آمنة ($transaction + AuditLog)
- **ما تم:** lib/actions/{fields,pricing,users,countries,currencies}.ts — كلها OP-guard + $transaction + AuditLog؛ pricing يستدعي runSmartGuard بعد كل تغيير؛ createUser CLIENT يزامن Customer؛ deleteUser يحمي SUPER_ADMIN الوحيد.
- **Build log:** ناجح.
- **ملفات:** lib/actions/*.ts.

## Checkpoint cp-004 — 2026-08-13 15:10 — DONE: Smart Engine (ruleMatcher + smartGuard)
- **ما تم:** lib/engine/ruleMatcher.ts (أولوية 100/90/70، computeBreakdown بالصيغة الذهبية #9)، lib/engine/smartGuard.ts (يمنع CRITICAL، يكتشف التداخل عبر laneKey، يخزن SystemAlert بمعاملة، guardHealthBadge).
- **Build log:** ناجح.
- **ملفات:** lib/engine/*.

## Checkpoint cp-003 — 2026-08-13 14:00 — DONE: Schema + Migration + Seed
- **ما تم:** Country، Currency، FieldDefinition، PricingRule، PricingRuleField (Cascade، @@unique([ruleId,fieldId]))، SystemAlert، User.isActive، Port.countryId. Migration `20260813195224_add_country_currency_pricing_engine` (no-BOM) + migrate deploy + prisma generate + seed.
- **Build log:** ناجح.
- **ملفات:** prisma/schema.prisma، prisma/migrations/20260813195224_*، prisma/seed.ts.

## Checkpoint cp-002 — 2026-08-13 12:00 — DONE: مسارات + ترحيل /auth/register
- **ما تم:** /register → /auth/register، إصلاح روابط quote-form + auth-gate-dialog، معاينة الحاسبة → /auth/register?from=calculator.
- **ملفات:** app/(auth)/auth/register، components/quote/quote-form.tsx، components/quote/auth-gate-dialog.tsx.

## Checkpoint cp-001 — 2026-08-13 10:00 — DONE: FloatingActions + CSS 104KB (أساس المشروع)
- **ما تم:** FloatingActions z-9999 في layout.tsx + مفاتيح SystemSetting + لوحة Appearance. CSS ≥ 101KB.
- **ملفات:** app/layout.tsx، components/FloatingActions.tsx.


---

## Checkpoint cp-017 - 2026-10-02 - DONE: Logos + Homepage Slider + Git baseline
- **???:** 8 changes (see PROJECT_MAP.md [RESTORE_POINT_BASELINE]): site logo, navbar/sidebar logo behavior (hidden badge bg + RSL onError fallback + enlarged), homepage slider background (4 images + Ken Burns animation), brand name ROWAD SABA-A, final logo (more_3_p.png) on semi-transparent white chip, comprehensive backup (backups/2026-10-02_17-49-25-manual, 42 tables/1179 rows, Backup id cmur3012z0000r9wl34u71g24), and the git restore-point system.
- **Repo:** git initialized (no remote), .gitignore hardened (.env* except .env.example, /backups/, build/log), baseline commit tagged restores/cp-017-main. RESTORE_POINTS.md = registry of every restore point (contents + revert impact).
- **Files:** components/landing/navbar.tsx, components/shell/app-sidebar.tsx, components/homepage/homepage-background.tsx, app/globals.css, public/uploads/company/, public/uploads/homepage-slider/, RESTORE_POINTS.md, PROJECT_MAP.md (+ cp-017 copy), CHECKPOINTS.md, schema.cp-017.prisma, .gitignore.
- **DB (site = .env.local ap-southeast):** companyInfo.logoForPdfUrl+logoUrl = /uploads/company/company-1790950592341-logo.png; SystemSetting company.name = "ROWAD SABA-A Logistics"; homepage.backgroundType=slider, sliderImages=4, sliderInterval=6, sliderOverlay=55.
- **Hash:** schema.cp-017.prisma = BD733EF775FC5F59CDBA1297317B28FC4D665C01D347CAA78E0F512FBAD80399.
- **???:** RESTORE_POINTS.md + PROJECT_MAP.cp-017.md + schema.cp-017.prisma.
