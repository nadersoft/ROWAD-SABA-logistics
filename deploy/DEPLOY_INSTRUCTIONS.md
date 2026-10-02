# P45 YEMEN SMART EDITION - Hostinger Deploy Instructions

## Package Contents
```
hostinger-package-2026-08-23/
├── .env.production          (2 lines: DATABASE_URL + DIRECT_URL only)
├── server.js                (standalone entry)
├── .next/static/            (CSS/JS assets)
├── public/                  (favicon, images)
├── prisma/
│   ├── schema.prisma
│   └── migrations/20260823000000_p45_yemen_edition/migration.sql
└── backup/
    ├── current-db-snapshot.json    (88 settings, 9 users reference)
    ├── pre-deploy-check.json       (pre-deploy verification)
    └── infra-reference-backup.txt  (credentials backup)
```

## Deploy Steps (Hostinger Terminal)

```bash
# 1. Go to project directory
cd /home/u666621900/domains/alolalogistics.com/hbuilds/source

# 2. Stop old process
pkill -9 -f standalone 2>/dev/null; fuser -k 3000/tcp 2>/dev/null; sleep 1

# 3. Copy build artifacts from package
cp -r <package-path>/.next .next
cp -r <package-path>/public public
cp <package-path>/server.js server.js

# 4. Copy .env (2 lines only)
cp <package-path>/.env.production .env

# 5. Run migration (adds 4 P45 tables if not exists)
source /opt/alt/alt-nodejs22/enable
npm install --no-save prisma 2>&1 | tail -3
npx prisma migrate deploy

# 6. Copy Prisma client for standalone
cp -r node_modules/.prisma .next/standalone/node_modules/
cp -r node_modules/@prisma .next/standalone/node_modules/

# 7. Fix permissions
chmod -R 755 .next/standalone/node_modules/.prisma
chmod -R 755 .next/standalone/node_modules/@prisma
chmod -R 777 .next/standalone/public/uploads 2>/dev/null
mkdir -p .next/standalone/public/uploads
chmod 777 .next/standalone/public/uploads

# 8. Start
set -a; source .env; set +a
export NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
nohup node .next/standalone/server.js > /tmp/alola.log 2>&1 &

# 9. Verify
sleep 4
curl -I http://localhost:3000
```

## P45 Features
- **yemen-cache**: 3-layer cache (Memory → CacheStore → DB). No Upstash.
- **company-info-pro**: Smart fallback from DB CompanyInfo → SystemSettings → defaults
- **db-circuit-breaker**: Auto-reconnect after 5 failures, health tests
- **CacheStore auto-populates** on first request from 88 existing SystemSettings
- **No data deleted**: CompanyInfo empty in DB, fallback uses systemSettings "content.company.name"

## Health Check
After deploy: `curl https://alolalogistics.com/api/health`
Returns: { status, tests, circuit, latencyMs }

## Admin Panel
- `/admin/infra-setup` — Dashboard with health, stats, cache warm-up
- `/maintenance-db` — Static maintenance page
