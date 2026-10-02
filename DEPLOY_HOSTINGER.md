# دليل الرفع النهائي لمنصة Rowad Sabaa Logistics على هوستنجر

هذا الدليل يغطي 3 سيناريوهات. اختر واحد فقط.

### ملاحظة حاسمة قبل الرفع:
في `next.config.js` يجب اضافة هذا السطر ليشتغل الـ Dockerfile:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true } // مهم لهوستنجر
}
module.exports = nextConfig
```

---
### السيناريو A: الرفع على Vercel (موصى به - 5 دقائق)
هذا الافضل لـ Next.js

1. ارفع مشروعك على GitHub
2. ادخل vercel.com -> Add New Project -> Import from GitHub
3. في Environment Variables الصق قيم `.env` (خاصة DATABASE_URL من Supabase)
4. اضغط Deploy
5. بعد النجاح، اذهب لـ Hostinger -> Domains -> DNS / Nameservers -> Manage
   - اضف CNAME: Name: app | Points to: cname.vercel-dns.com
   - في Vercel -> Settings -> Domains -> Add Domain: app.yourdomain.com

**انتهى.**

---
### السيناريو B: الرفع على Hostinger VPS (Ubuntu)
اذا عندك VPS من هوستنجر:

```bash
# 1. ادخل للسيرفر عبر SSH
ssh root@YOUR_VPS_IP

# 2. ثبت Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# 3. اسحب المشروع
git clone https://github.com/YOUR_USERNAME/alola-logistics.git
cd alola-logistics

# 4. انشئ ملف .env
cp .env.example .env
nano .env # الصق القيم الحقيقية

# 5. شغل
docker compose -f docker-compose.prod.yml up -d --build

# 6. سيعمل على http://YOUR_VPS_IP:3000
# لربط دومين، ثبت Nginx واعمل Reverse Proxy
```

لعمل Reverse Proxy بـ Nginx:
```nginx
server {
    server_name app.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---
### السيناريو C: الرفع على Hostinger Cloud (hPanel مع Node.js)

**هذا يعمل فقط اذا خطتك Cloud Startup او اعلى.**

1. hPanel -> Websites -> Dashboard -> Advanced -> Node.js
2. Create Application:
   - Node version: 20
   - Application root: alola
   - Startup file: server.js (سيتم انشاؤه تلقائيا من standalone)
3. لا ترفع عبر FTP! استخدم Git:
   - في hPanel -> Git -> Add Repository -> الصق رابط GitHub
4. في hPanel -> Node.js -> Environment Variables -> اضف DATABASE_URL (يجب ان يكون Supabase لان هوستنجر لا يوفر Postgres)
5. في Terminal الخاص بـ hPanel نفذ:
```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```
6. اضغط Restart Application

---
### قاعدة البيانات - حل مشكلة PostgreSQL في هوستنجر:

هوستنجر الاستضافة المشتركة لا تدعم PostgreSQL. الحل المجاني:

1. ادخل supabase.com -> New Project
2. انسخ Connection String (Pooler Mode)
3. ضعه في DATABASE_URL
4. نفذ `npx prisma migrate deploy` مرة واحدة فقط

الان مشروعك سيستخدم Supabase كقاعدة بيانات حتى لو مستضاف في هوستنجر.

---
### بعد الرفع - اول دخول للادمن:

1. ادخل `https://yourdomain.com/admin/command-center`
2. سجل دخول بحساب ADMIN (الذي سينشأ من seed)
3. اذهب لـ TAB C Integrations وضع مفاتيح Mapbox وغيرها
4. اذهب لـ TAB D Appearance وغير الشعار والالوان - سترى التغيير مباشرة!

انتهى. منصتك الان Live بدون لمس الكود.
