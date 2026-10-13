import { execSync } from "node:child_process";
import "dotenv/config";
import { Client } from "pg";

/** Resets the e2e database, applies migrations and loads the fictional seed data. */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL!;
  if (url === process.env.DATABASE_URL) throw new Error("E2E_DATABASE_URL must differ from DATABASE_URL");
  const env = { ...process.env, DATABASE_URL: url, STORAGE_LOCAL_DIR: "./storage-e2e" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} CASCADE`);
  await client.end();
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
}
