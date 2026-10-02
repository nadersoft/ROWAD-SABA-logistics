import { PrismaClient } from "@prisma/client";

/**
 * Quote expiry cron — flips PENDING quotes whose validUntil has passed to EXPIRED.
 * Run alongside the web server:
 *   pnpm cron:quotes           (loop, default every 15 min)
 *   pnpm cron:quotes:once      (single pass — used for smoke tests / manual runs)
 * Interval override: QUOTE_EXPIRY_INTERVAL_MIN (minutes).
 */

const prisma = new PrismaClient();

async function expireOnce() {
  const now = new Date();
  const expired = await prisma.quote.findMany({
    where: { status: "PENDING", validUntil: { not: null, lt: now } },
    select: { id: true, quoteNumber: true, validUntil: true, customer: { select: { email: true } } },
  });

  if (expired.length === 0) {
    console.log(`[cron:quotes] ${now.toISOString()} no quotes to expire`);
    return 0;
  }

  const ids = expired.map((q) => q.id);
  const result = await prisma.quote.updateMany({
    where: { id: { in: ids }, status: "PENDING" },
    data: { status: "EXPIRED" },
  });
  console.log(`[cron:quotes] ${now.toISOString()} expired ${result.count} quote(s): ${expired.map((q) => q.quoteNumber).join(", ")}`);

  await prisma.notification.create({
    data: {
      userId: (await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } }))?.id ?? "",
      title: "Quotes expired",
      body: `${result.count} quote(s) expired because their validity window passed.`,
      type: "info",
    },
  }).catch(() => {});

  for (const q of expired) {
    if (!q.customer?.email) continue;
    const user = await prisma.user.findUnique({ where: { email: q.customer.email.toLowerCase() } });
    if (!user) continue;
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Your quote has expired",
        body: `Quote ${q.quoteNumber} expired on ${q.validUntil?.toISOString().slice(0, 10)}. Request a new one to continue.`,
        type: "warning",
      },
    }).catch(() => {});
  }

  return result.count;
}

async function main() {
  const once = process.argv.includes("--once");
  if (once) {
    await expireOnce();
    await prisma.$disconnect();
    return;
  }

  const intervalMin = Math.max(1, Number(process.env.QUOTE_EXPIRY_INTERVAL_MIN ?? 15));
  console.log(`[cron:quotes] loop started, checking every ${intervalMin} minute(s)`);
  const tick = async () => {
    try {
      await expireOnce();
    } catch (err) {
      console.error("[cron:quotes] error:", err);
    }
  };
  await tick();
  const timer = setInterval(tick, intervalMin * 60_000);
  timer.unref();
  process.on("SIGINT", async () => {
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  });
}

main();
