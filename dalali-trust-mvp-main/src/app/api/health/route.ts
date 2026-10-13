import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/** Liveness + database connectivity check for load balancers and uptime monitors. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503 });
  }
}
