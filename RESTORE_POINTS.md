# RESTORE POINTS REGISTRY — ROWAD SABAA LOGISTICS

> بدأنا (نظام نقاط الاستعادة). بدأنا بـ git محلي (بدون ريموت) في **cp-017** (2026-10-02).
> كل نقطة استعادة = **tag/commit** في git + سطر في هذا السجل يشرح محتواها وأثر الرجوع عنها.

---

## كيف تستخدم النقاط (أوامر)

```bash
git log --oneline --decorate          # عرض كل النقاط بالترتيب
git tag -l "restores/*"               # عرض نقاط الاستعادة فقط
git show <نقطة> --stat                # بالضبط أي ملفات تغيرت في النقطة
git show <نقطة> -- app/page.tsx       # تفاصيل التغيير في ملف محدد
git diff <نقطة>..<نقطة>:<ملف>         # المقارنة بين نقطتين لملف
git checkout <نقطة> -- .              # استرجاع ملفات النقطة فوق العمل الحالي
```

**القاعدة:** تعمل النقاط على **الملفات فقط** (الكود + `public/uploads`). بيانات قاعدة البيانات (Supabase) **خارج git** — تُستعاد من مجلدات `backups/` (أو SLQ). أي تغيير بيانات (settings، شعار في DB، اسم...) يتطلب استرداد DB من النسخة الاحتياطية.

---

## سجل النقاط (القديمة = cp-* اليدوية، والجديدة = git tags)

| النقطة | التاريخ | التركيز | ماذا تحتوي | أثر الرجوع عنها |
|---|---|---|---|---|
| cp-001 | 2026-08-13 | FloatingActions | شارات عائمة (WhatsApp/About) z-9999 + إعدادات | اختفاء الشارات العائمة |
| cp-002 | 2026-08-13 | /auth/register + Auth Gate | صفحة تسجيل + نافذة تسجيل دخول محتجزة لـ"Book rate" | تعطّل التسجيل/الحجز السريع |
| cp-003 | 2026-08-13 | Schema + Migration + Seed | Country/Currency/FieldDefinition/PricingRule | فقدان نماذج التسعير |
| cp-004 | 2026-08-13 | Smart Engine | ruleMatcher + smartGuard | عودة الحساب البسيط |
| cp-005 | 2026-08-13 | Actions + Audit | $transaction + AuditLog لكل عمليات الإدارة | فقدان التدقيق |
| cp-006 | 2026-08-13 | Admin UI | /admin/pricing + /admin/settings + /admin/users | فقدان واجهات الإدارة |
| cp-007 | 2026-08-13 | Master Data + RBAC + Wallet | cascading picker + middleware + محفظة + Realtime | تعطل المحفظة/الصلاحيات |
| cp-008 | 2026-08-13 | **SMART PRICING** | Pricing Engine كامل (1-10) + لوحات | خسارة التسعير الذكي |
| cp-009 | 2026-08-13 | Self-Service Auth v2.1 | OTP (هاتف+بريد) | فقدان تسجيل الأرقام/OTP |
| cp-010/011 | 2026-08 | Auth + ZERO-DEFECT | OTP هاتف + ضبط ألوان/تعطيل شات | أثر المذكور بالأسطر أعلاه |
| cp-012 | 2026-08-13 | ZERO-DEFECT v5 | تسجيل بالبريد فقط + ألوان مقروءة + شات معطّل + أيقونة WhatsApp | عودة الشات/الألوان القديمة |
| cp-013 | 2026-08-13 | Execution Engine Bugfixes | إصلاحات BUG-1..6 + ثبات isActive toggle | عودة الأخطاء المصلحة |
| cp-014 | 2026-09-22 | **PDF LOGO FIX (P0)** | إصلاح pdfmake "Invalid image" + `getLogoAsDataUrl` | كسر PDF (إن وُجد logo مسار محلي) |
| cp-015 | 2026-09-22 | **LOGO UNIFIED** | شعار واحد للنافبار/التقارير/Favicon + حذف favicon.ico | شعارات متعددة/قديمة |
| cp-016 | 2026-09-22 | **Admin logo + colors + Homepage bg** | شعار ROWAD في السايدبار + مزامنة الألوان + نظام خلفيات الرئيسية | خلفيات وردية قديمة |
| **cp-018** | **2026-10-02** | Developer Restore Points panel | Developer control panel for restore points: list/create git restore points, view per-point diffs, hard-restore files (SUPER_ADMIN). Server actions + safe git engine (no shell). New page /admin/system/restore-points, sidebar entry, i18n keys. | files-استرجاع عبر git، والبيانات من backups/ |
| **cp-017** | **2026-10-02** | **Logos + Slider + Git baseline** | (تفصيل أدنى) شعار جديد بقرص أبيض + سلايدر Ken Burns + اسم ROWAD SABA'A + git | فقدان كل ما أُنجز اليوم |

---

## cp-017 — نقطة البناء الحالية (baseline) بالتفصيل

**tag:** `restores/cp-017-main` | **الالتزام النهائي (current state)**

| # | التغيير | الملفات | قاعدة البيانات/المرفوعات | أثر الرجوع |
|---|---|---|---|---|
| 1 | شعار أولي | - | `/uploads/company/company-1790943260468-site-logo.png` + `companyInfo.logoForPdfUrl/logoUrl` | رجوع للشعار السابق+حذف الملف |
| 2 | سلوك الشعار (إخفاء الخلفية + "RSL" + تكبير) | `components/landing/navbar.tsx`, `components/shell/app-sidebar.tsx` | - | عودة الخلفية الصفراء + حرف A |
| 3 | خلفية سلايدر + تأثير Ken Burns | `components/homepage/homepage-background.tsx`, `app/globals.css` | 4 صور `/uploads/homepage-slider/*.jpg` + `SystemSetting: homepage.backgroundType=slider, sliderImages[], sliderInterval=6, sliderOverlay=55` | عودة التدرج اللوني وحذف الصور |
| 4 | اسم العلامة ROWAD SABA'A | `components/landing/navbar.tsx` | `SystemSetting: company.name = "ROWAD SABA'A Logistics"` | عودة "ROWAD" فقط |
| 5 | الشعار النهائي (more_3_p) | - | `/uploads/company/company-1790950592341-logo.png` + `companyInfo` | عودة الشعار السابق |
| 6 | بروز الشعار (قرص أبيض شبه شفاف) | `components/landing/navbar.tsx` | - | شعار بلا قرص |
| 7 | نسخة احتياطية شاملة | `backups/2026-10-02_17-49-25-manual/` (خارج git) | `Backup` id `cmur3012z0000r9wl34u71g24` | - |
| 8 | نظام نقاط الاستعادة + git | `.gitignore`, `RESTORE_POINTS.md`, `PROJECT_MAP*`, `CHECKPOINTS.md`, `schema.cp-017.prisma` | - | فقدان الـ git history (غير وارد) |

**ملاحظات الاسترداد:**
- **الملفات:** `git checkout restores/cp-017-main -- .` يعيد الكود + الصور المرفوعة.
- **البيانات:** استعد قاعدة البيانات من `backups/2026-10-02_17-49-25-manual/database/` (42 جدولاً / 1179 صفاً) — ثم أعد رفع `uploads/`.
- **الأسرار:** `.env*` غير مدرجة في git بالعمد (ابدأ بأمان) — احتفظ بها مكانها أو انسخها من نسخة الاحتياطي الشاملة يدوياً.

---

## سياسة النقاط المستقبلية (من الآن)

1. بعد **كل تغيير** (أو دفعة تغيير مترابطة) أنشئ نقطة: commit + tag `restores/cp-0NN`.
2. أضف سطراً في هذا الجدول يشرح: **ماذا**، **أين (ملفات)**، **ماذا في DB/رفع**، **أثر الرجوع**.
3. أي تغيير لبيانات (لمسات إعدادات/شعار) يُوثَّق هنا بقيمه قبل/بعد.
4. عند الحاجة لعودة: استخدم `git checkout <tag> -- .` للملفات، واستردّ البيانات من `backups/` الأحدث.
---

## cp-018 — Developer Restore Points panel (2026-10-02)

**tag:** `restores/cp-018-developer-restore-points-panel` | **short:** `b3d80f0` | تعداد الملفات: 7

- **المحتوى:** `M pp/(dashboard)/admin/system/page.tsx`, `M components/shell/app-sidebar.tsx`, `M lib/i18n.ts`, `untracked app/(dashboard)/admin/system/restore-points/`, `untracked lib/actions/restore.ts`, `untracked lib/restore/`, `untracked scripts/_mk-point.ts`
- **ملاحظة المطور:** Developer control panel for restore points: list/create git restore points, view per-point diffs, hard-restore files (SUPER_ADMIN). Server actions + safe git engine (no shell). New page /admin/system/restore-points, sidebar entry, i18n keys.
- **استرداد الملفات:** `git reset --hard restores/cp-018-developer-restore-points-panel` — أو `git checkout restores/cp-018-developer-restore-points-panel -- .`
- **بيانات DB:** استردها من أحدث مجلد ضمن `backups/` بتاريخ 2026-10-02.
