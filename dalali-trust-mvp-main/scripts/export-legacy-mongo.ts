/**
 * READ-ONLY export of the legacy SahaShares MongoDB database for manual review.
 *
 * The legacy app stored investment, wallet and ledger data that has no equivalent in
 * Dalali Trust (see docs/MIGRATION.md). This script never modifies MongoDB; it writes
 * JSON files so the owners can (1) settle any real wallet balances, (2) contact
 * legacy users, and (3) manually recreate genuine rental listings.
 *
 * Secrets are excluded: password hashes, OTPs and NIDA numbers are never exported.
 *
 *   npm install --no-save mongodb@6
 *   LEGACY_MONGODB_URI="mongodb+srv://..." npx tsx scripts/export-legacy-mongo.ts ./legacy-export
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OMIT = new Set(["passwordHash", "otp", "otpExpiresAt", "nidaId", "__v"]);

function scrub(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (OMIT.has(k)) continue;
    // Base64 images embedded by the legacy app can be huge; keep only a marker.
    if (typeof v === "string" && v.startsWith("data:image/")) out[k] = "[embedded image omitted]";
    else if (Array.isArray(v))
      out[k] = v.map((x) =>
        typeof x === "string" && x.startsWith("data:image/") ? "[embedded image omitted]" : x,
      );
    else out[k] = v;
  }
  return out;
}

async function main() {
  const uri = process.env.LEGACY_MONGODB_URI;
  if (!uri) throw new Error("Set LEGACY_MONGODB_URI to the legacy database connection string.");
  const outDir = path.resolve(process.argv[2] ?? "./legacy-export");
  // Optional dependency: installed only by operators who need to run this export.
  type Doc = Record<string, unknown>;
  type Mongo = {
    MongoClient: new (
      uri: string,
      opts: object,
    ) => {
      connect(): Promise<void>;
      close(): Promise<void>;
      db(): { collection(name: string): { find(q: object): { toArray(): Promise<Doc[]> } } };
    };
  };
  const moduleName = "mongodb";
  const { MongoClient } = (await import(moduleName)) as Mongo;
  const client = new MongoClient(uri, { readPreference: "secondaryPreferred" });
  await client.connect();
  try {
    const db = client.db();
    await mkdir(outDir, { recursive: true, mode: 0o700 });
    for (const name of ["users", "properties", "investments", "ledgertransactions", "pendingpayments"]) {
      const docs = await db.collection(name).find({}).toArray();
      await writeFile(path.join(outDir, `${name}.json`), JSON.stringify(docs.map(scrub), null, 2), {
        mode: 0o600,
      });
      console.log(`${name}: ${docs.length} documents`);
    }
    console.log(`Export written to ${outDir}. Treat it as confidential personal and financial data.`);
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
