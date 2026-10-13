/**
 * Promotes an existing account to ADMIN. This is the only way to create the first
 * administrator: there is no self-service path to the ADMIN role.
 *
 *   npm run admin:promote -- someone@example.com
 *
 * Requires direct access to DATABASE_URL (i.e. an operator with infrastructure access).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run admin:promote -- <email>");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "ACTIVE")
      throw new Error("No active account with that email. Ask the person to sign up first.");
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.auditLog.create({
        data: {
          actorId: null,
          action: "user.role.promote_cli",
          entityType: "User",
          entityId: user.id,
          metadata: { from: user.role, to: "ADMIN" },
        },
      }),
    ]);
    console.log(`${email} is now an administrator. They must sign in again.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
