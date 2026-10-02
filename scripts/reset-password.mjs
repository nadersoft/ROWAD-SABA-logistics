// Reset a user's password by email or phone.
// Usage: node scripts/reset-password.mjs <email-or-phone> <new-password>
// Loads .env (DATABASE_URL / DIRECT_URL) for Prisma automatically.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

const prisma = new PrismaClient();

const [emailOrPhone, newPassword] = process.argv.slice(2);
if (!emailOrPhone || !newPassword) {
  console.log("Usage: node scripts/reset-password.mjs <email-or-phone> <new-password>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailOrPhone }, { phone: emailOrPhone }] },
  });
  if (!user) {
    console.error(`No user found for "${emailOrPhone}".`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  console.log(`Password reset for ${user.email ?? user.phone} (${user.role}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
