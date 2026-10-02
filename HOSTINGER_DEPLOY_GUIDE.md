# How to Deploy to Hostinger Web Apps (Rowad Sabaa Logistics)

## Prerequisites
- Hostinger Web Apps plan (Node.js supported)
- Supabase project with PostgreSQL database
- Domain: alolalogistics.com (or your domain)

## Step 1: Create ZIP for Upload

1. In the project root, ensure `.gitignore` excludes:
   - `node_modules/` (DO NOT include)
   - `.next/` (DO NOT include)
   - `.env` (DO NOT include — real secrets must NOT be in the ZIP)

2. Right-click project root → Download as ZIP (or use your tool)

3. Upload the ZIP to Hostinger

## Step 2: Hostinger Dashboard Setup

1. Go to `hpanel.hostinger.com/websites`
2. Click **Get started** → Select **Node.js** as the framework
3. Upload the ZIP file

## Step 3: Build Settings

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Node Version | 20 |
| Install Command | `npm install` |

## Step 4: Environment Variables

Add these in the Hostinger environment variables panel:

```
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
NEXTAUTH_URL=https://alolalogistics.com
NEXTAUTH_SECRET=generate_random_32_chars_here
NEXT_PUBLIC_BASE_URL=https://alolalogistics.com
```

### How to get Supabase URLs:

1. Go to Supabase Dashboard → Your Project → Settings → Database
2. **Connection string → URI**: Use this for `DIRECT_URL` (port 5432)
3. **Connection string → Transaction mode**: Use this for `DATABASE_URL` (port 6543)
4. Replace `YOUR_PASSWORD` with your database password

### Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Step 5: Deploy

1. Select your domain (alolalogistics.com)
2. Click **Deploy**
3. Wait for build to complete (~2-5 minutes)

## Step 6: Post-Deploy

After first deploy, you need to seed the database:

1. In Hostinger Terminal (or SSH), run:
```bash
npx prisma db push --accept-data-loss
npx tsx prisma/seed-docs.ts
npx tsx prisma/seed.ts
```

Or if Hostinger doesn't provide terminal, add this to your build command temporarily:
```
prisma generate && prisma db push --accept-data-loss && npx tsx prisma/seed-docs.ts && next build
```

Then remove the seed commands after first run.

## Troubleshooting

- **Build fails**: Check that all env vars are set correctly
- **Database errors**: Ensure `DATABASE_URL` uses port 6543 (pooled) and `DIRECT_URL` uses port 5432 (direct)
- **Auth not working**: Ensure `NEXTAUTH_URL` matches your domain exactly
- **Images not loading**: Check `NEXT_PUBLIC_BASE_URL` is set correctly
