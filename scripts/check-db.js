const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const REQUIRED_ENVS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'AUTH_SECRET',
  'NEXTAUTH_URL',
];

async function checkEnvFile() {
  console.log("\n===== 1. .env check =====");
  const missing = REQUIRED_ENVS.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.log("Missing env vars:", missing);
    return false;
  }
  console.log("All required env vars present");

  const dbUrl = process.env.DATABASE_URL;
  console.log("\n===== 2. DATABASE_URL analysis =====");
  console.log(`URL: ${dbUrl.slice(0,60)}...`);

  if (!dbUrl.includes('pooler.supabase.com')) {
    console.log("Warning: not using Pooler");
  }
  if (!dbUrl.includes('pgbouncer=true')) {
    console.log("Warning: missing ?pgbouncer=true");
  }
  if (dbUrl.includes('localhost')) {
    console.log("Error: DATABASE_URL points to localhost");
    return false;
  }
  console.log("DATABASE_URL format OK");
  return true;
}

async function testConnection() {
  console.log("\n===== 3. Testing DB connection =====");
  const prisma = new PrismaClient();
  try {
    console.log("Connecting to:", process.env.DATABASE_URL.split('@')[1]?.split('/')[0]);
    await prisma.$connect();
    console.log("$connect OK");

    const count = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("Query test OK:", count);

    try {
      const company = await prisma.companyInfo.findFirst();
      console.log("companyInfo.findFirst OK:", company ? "data exists" : "empty but connected");
    } catch (e) {
      console.log("companyInfo failed but connection works:", e.message.slice(0,100));
    }

    try {
      const settings = await prisma.systemSetting.findMany({ take: 3 });
      console.log("systemSetting.findMany OK:", settings.length, "rows");
    } catch (e) {
      console.log("systemSetting failed but connection works:", e.message.slice(0,100));
    }

    await prisma.$disconnect();
    return true;
  } catch (e) {
    console.log("\nConnection FAILED:");
    const msg = e.message;

    if (msg.includes('Authentication failed') || msg.includes('password')) {
      console.log("Cause: Wrong or expired password");
      console.log("Fix: Supabase -> Settings -> Database -> Reset password");
    } else if (msg.includes("Can't reach") || msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
      console.log("Cause: DNS or network issue");
    } else if (msg.includes('Timed out') || msg.includes('timeout')) {
      console.log("Cause: Supabase project paused or blocked");
      console.log("Fix: Open Supabase Dashboard, ensure project is Active");
    } else if (msg.includes('does not exist')) {
      console.log("Cause: Database does not exist");
    } else {
      console.log("Unknown cause:", msg.slice(0,500));
    }
    await prisma.$disconnect().catch(() => {});
    return false;
  }
}

async function generateHostingerEnv() {
  console.log("\n===== 4. Generating .env.production for Hostinger =====");

  const hostingerEnv = `# === Auto-generated for Hostinger - ${new Date().toISOString()} ===
DATABASE_URL="${process.env.DATABASE_URL}"
DIRECT_URL="${process.env.DIRECT_URL || process.env.DATABASE_URL.replace('6543','5432').replace('?pgbouncer=true','')}"
AUTH_SECRET="${process.env.AUTH_SECRET}"
NEXTAUTH_URL="${process.env.NEXTAUTH_URL}"
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"
`;

  require('fs').writeFileSync('.env.production', hostingerEnv);
  require('fs').writeFileSync('.env.hostinger.ready', hostingerEnv);

  console.log("Created:");
  console.log("  .env.production (for Hostinger)");
  console.log("  .env.hostinger.ready (backup)");
  console.log("\nContent (password hidden):");
  console.log(hostingerEnv.replace(/:[^@]+@/g, ':****@'));
}

(async () => {
  const envOk = await checkEnvFile();
  if (!envOk) {
    console.log("\nFix .env first");
    process.exit(1);
  }

  const connected = await testConnection();
  if (!connected) {
    console.log("\nCannot proceed - fix connection first");
    process.exit(1);
  }

  console.log("\nConnection 100% OK - ready for Hostinger");
  await generateHostingerEnv();

  console.log("\nNext steps:");
  console.log("1. Upload .env.production to Hostinger as .env");
})();
