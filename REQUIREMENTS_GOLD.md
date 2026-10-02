# REQUIREMENTS_GOLD — المواصفات الذهبية 1-10 (لا تتغير)

> المصدر: PROMPT_MASTER_ALOLA_OS.md — تُستخدم للمقارنة مع CHECKPOINTS.md بعد كل جلسة.
> الحالة تُحدَّث في PROJECT_MAP.md وCHECKPOINTS.md فقط، لا في هذا الملف.

| # | المواصفة | المعيار القابل للقياس |
|---|----------|------------------------|
| 1 | بوابة العميل | `/auth/register` 200 + `/dashboard` + Wallet Export + Tickets + Realtime |
| 2 | الحاسبة | Get a Quote -> localStorage + `/auth/register?from=calculator` |
| 3 | FloatingActions | z-9999 في `layout.tsx` + مفاتيح SystemSetting |
| 4 | محرك الحقول | FieldDefinition + PricingRule + حذف الحقل = حذف قيمه في Transaction + لا Ghost Data |
| 5 | محرك التسعير الذكي | ruleMatcher أولوية 100/90/70 + smartGuard يمنع CRITICAL + Health 🟢🟡🔴 + Profit% + Impact |
| 6 | بلد + ميناء | Country + Port علاقة Cascade + `/admin/settings` CRUD + `/settings` Cascading Country->Port |
| 7 | العملات | Currency CRUD + Default Display |
| 8 | المستخدمون RBAC | Users CRUD + isActive + Reset Password + RBAC middleware فعلي + 403 |
| 9 | صيغة التسعير | Total = FCL_BASIC_RATE + SUM(enabled) + DG + FOB/EXW + REEFER + weight*rate + أيقونات Box, Package, Plane, Snowflake |
| 10 | الضمانات | CSS>101KB, لا 404, لا TODO, كل Action Transaction + AuditLog + Realtime |
