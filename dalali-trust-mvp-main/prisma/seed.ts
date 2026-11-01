/**
 * DEVELOPMENT-ONLY seed data.
 *
 * Everything created here is fictional development data. No verification is
 * marked as VERIFIED, so sample advertisers never display verified badges.
 *
 * Refuses to run when NODE_ENV=production, or against a non-local database unless
 * SEED_ALLOW_REMOTE=true is set explicitly (e.g. for a throwaway staging database).
 */
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import { PrismaClient } from "../src/generated/prisma/client";
import type { PropertyType } from "../src/generated/prisma/enums";
import { listingAgentFeeAmount } from "../src/lib/fees";
import { LocalStorage } from "../src/server/storage/local";
import { S3Storage } from "../src/server/storage/s3";
import type { ObjectStorage } from "../src/server/storage/types";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed: NODE_ENV=production");
const host = new URL(url).hostname;
if (
  !["localhost", "127.0.0.1", "postgres", "db"].includes(host) &&
  process.env.SEED_ALLOW_REMOTE !== "true"
) {
  throw new Error(
    `Refusing to seed non-local database host "${host}". Set SEED_ALLOW_REMOTE=true if this is a disposable environment.`,
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const store: ObjectStorage =
  process.env.STORAGE_DRIVER === "s3"
    ? new S3Storage(process.env.S3_BUCKET!, {
        region: process.env.S3_REGION!,
        endpoint: process.env.S3_ENDPOINT,
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      })
    : new LocalStorage(process.env.STORAGE_LOCAL_DIR ?? "./storage");

const PASSWORD = process.env.SEED_PASSWORD ?? "dalali-dev-password";
const PALETTE = ["#1a2639", "#087342", "#946908", "#354a67", "#095c37", "#405b7f"];

async function placeholderImage(label: string, color: string, width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${color}"/>
    <path d="M${width / 2} ${height * 0.22} L${width * 0.3} ${height * 0.45} V${height * 0.72} H${width * 0.7} V${height * 0.45} Z" fill="rgba(255,255,255,0.18)"/>
    <text x="50%" y="84%" font-family="sans-serif" font-size="${Math.round(width / 26)}" fill="#fff" text-anchor="middle">${label}</text>
    <text x="50%" y="92%" font-family="sans-serif" font-size="${Math.round(width / 40)}" fill="rgba(255,255,255,0.8)" text-anchor="middle">SAMPLE PHOTO · DEVELOPMENT DATA ONLY</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 75 }).toBuffer();
}

const SEED_PHOTO_DIR = path.resolve("prisma", "seed-photos"); // npm scripts run from the project root
const PHOTO_EXT = /\.(jpe?g|png|webp)$/i;

/** Real photos for a sample listing, from prisma/seed-photos/<neighbourhood-slug>/ (up to 6). */
function seedPhotosFor(neighborhood: string): string[] {
  const dir = path.join(SEED_PHOTO_DIR, neighborhood.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => PHOTO_EXT.test(f))
    .sort()
    .slice(0, 6)
    .map((f) => path.join(dir, f));
}

/** Same processing as real uploads (src/server/uploads.ts): auto-rotate, resize, WebP, metadata stripped. */
async function processPhoto(file: string) {
  const buf = fs.readFileSync(file);
  const base = sharp(buf, { limitInputPixels: 40_000_000 }).rotate();
  const full = await base
    .clone()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 640, height: 480, fit: "cover" })
    .webp({ quality: 70 })
    .toBuffer();
  return {
    full: full.data,
    thumb,
    width: full.info.width,
    height: full.info.height,
    sha256: createHash("sha256").update(buf).digest("hex"),
  };
}

async function createUser(opts: {
  name: string;
  email: string;
  role: "TENANT" | "LANDLORD" | "AGENT" | "ADMIN";
  phone?: string;
}) {
  const id = randomUUID();
  const user = await prisma.user.create({
    data: {
      id,
      name: opts.name,
      email: opts.email,
      emailVerified: true,
      role: opts.role,
      phoneNumber: opts.phone ?? null,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(PASSWORD),
        },
      },
      ...(opts.role === "LANDLORD" || opts.role === "AGENT"
        ? {
            advertiserProfile: {
              create: {
                displayName: opts.name,
                contactPhone: opts.phone ?? null,
                whatsappNumber: opts.phone ?? null,
                serviceRegions: ["dar-es-salaam"],
                bio: "Fictional sample advertiser created by the development seed script.",
              },
            },
          }
        : {}),
    },
  });
  return user;
}

type SampleListing = {
  title: string;
  type: PropertyType;
  region: string;
  district: string;
  neighborhood: string;
  rent: number;
  advance: number;
  deposit: number;
  beds: number;
  baths: number;
  amenities: string[];
  status: "PUBLISHED" | "PENDING_REVIEW" | "DRAFT";
  lat?: number;
  lng?: number;
};

const LISTINGS: SampleListing[] = [
  {
    title: "Self-contained room near Sinza Mori",
    type: "BEDSITTER",
    region: "dar-es-salaam",
    district: "Ubungo",
    neighborhood: "Sinza",
    rent: 180000,
    advance: 6,
    deposit: 0,
    beds: 1,
    baths: 1,
    amenities: ["water_tank", "perimeter_wall", "tiled_floors", "near_public_transport"],
    status: "PUBLISHED",
    lat: -6.784,
    lng: 39.222,
  },
  {
    title: "Two-bedroom apartment in Mikocheni B",
    type: "APARTMENT",
    region: "dar-es-salaam",
    district: "Kinondoni",
    neighborhood: "Mikocheni",
    rent: 750000,
    advance: 6,
    deposit: 750000,
    beds: 2,
    baths: 2,
    amenities: ["parking", "security_guard", "backup_power", "private_kitchen", "balcony"],
    status: "PUBLISHED",
    lat: -6.763,
    lng: 39.249,
  },
  {
    title: "Single room with shared bathroom, Kijitonyama",
    type: "ROOM",
    region: "dar-es-salaam",
    district: "Kinondoni",
    neighborhood: "Kijitonyama",
    rent: 90000,
    advance: 3,
    deposit: 0,
    beds: 1,
    baths: 1,
    amenities: ["water_tank", "near_public_transport"],
    status: "PUBLISHED",
  },
  {
    title: "Three-bedroom house with garden, Mbezi Beach",
    type: "HOUSE",
    region: "dar-es-salaam",
    district: "Kinondoni",
    neighborhood: "Mbezi Beach",
    rent: 1500000,
    advance: 6,
    deposit: 1500000,
    beds: 3,
    baths: 2,
    amenities: ["parking", "perimeter_wall", "gate", "security_guard", "cctv", "pets_allowed"],
    status: "PUBLISHED",
    lat: -6.722,
    lng: 39.214,
  },
  {
    title: "Studio apartment near the ferry, Kigamboni",
    type: "APARTMENT",
    region: "dar-es-salaam",
    district: "Kigamboni",
    neighborhood: "Kigamboni",
    rent: 300000,
    advance: 3,
    deposit: 300000,
    beds: 1,
    baths: 1,
    amenities: ["tiled_floors", "ceiling_board", "private_kitchen"],
    status: "PUBLISHED",
  },
  {
    title: "Two-bedroom house in Njiro",
    type: "HOUSE",
    region: "arusha",
    district: "Arusha City",
    neighborhood: "Njiro",
    rent: 450000,
    advance: 6,
    deposit: 0,
    beds: 2,
    baths: 1,
    amenities: ["water_tank", "parking", "perimeter_wall"],
    status: "PUBLISHED",
    lat: -3.405,
    lng: 36.706,
  },
  {
    title: "Self-contained room, Area D",
    type: "BEDSITTER",
    region: "dodoma",
    district: "Dodoma City",
    neighborhood: "Area D",
    rent: 150000,
    advance: 6,
    deposit: 0,
    beds: 1,
    baths: 1,
    amenities: ["tiled_floors", "wardrobe"],
    status: "PENDING_REVIEW",
  },
  {
    title: "Apartment near Rock City Mall",
    type: "APARTMENT",
    region: "mwanza",
    district: "Ilemela",
    neighborhood: "Buswelu",
    rent: 400000,
    advance: 3,
    deposit: 400000,
    beds: 2,
    baths: 1,
    amenities: ["parking", "internet"],
    status: "DRAFT",
  },
];

async function main() {
  const existing = await prisma.user.count({ where: { email: { endsWith: "@sample.dalali.test" } } });
  if (existing > 0) {
    console.log("Sample data already present — skipping. Reset the database to re-seed.");
    return;
  }

  const admin = await createUser({
    name: "Sample Administrator",
    email: "admin@sample.dalali.test",
    role: "ADMIN",
  });
  const landlord = await createUser({
    name: "Landlord Asha",
    email: "landlord@sample.dalali.test",
    role: "LANDLORD",
    phone: "+255700000101",
  });
  const agent = await createUser({
    name: "Agent Juma",
    email: "agent@sample.dalali.test",
    role: "AGENT",
    phone: "+255700000102",
  });
  const tenant = await createUser({
    name: "Tenant Neema",
    email: "tenant@sample.dalali.test",
    role: "TENANT",
    phone: "+255700000103",
  });

  const now = Date.now();
  const created = [];
  for (const [i, l] of LISTINGS.entries()) {
    const advertiser = i % 2 === 0 ? landlord : agent;
    const property = await prisma.property.create({
      data: {
        slug: `sample-${l.neighborhood.toLowerCase().replace(/\W+/g, "-")}-${i + 1}`,
        advertiserId: advertiser.id,
        title: l.title,
        description: `FICTIONAL LISTING FOR DEVELOPMENT AND TESTING ONLY.\n\nThis sample ${l.type.toLowerCase()} in ${l.neighborhood} shows how a complete Estate listing looks: clear costs, utilities, amenities and availability. It does not describe a real property.`,
        propertyType: l.type,
        region: l.region,
        district: l.district,
        neighborhood: l.neighborhood,
        latitude: l.lat ?? null,
        longitude: l.lng ?? null,
        rentAmount: l.rent,
        advanceMonths: l.advance,
        depositAmount: l.deposit,
        agentFeeAmount: listingAgentFeeAmount(advertiser.role, l.rent),
        agentFeeNote: advertiser.role === "AGENT" ? "Paid after signing the tenancy agreement" : null,
        paymentTerms: `${l.advance} months upfront, paid only after viewing and signing a written agreement.`,
        bedrooms: l.beds,
        bathrooms: l.baths,
        amenities: l.amenities,
        electricity: "SEPARATE_METER",
        water: i % 3 === 0 ? "SHARED_SPLIT" : "INCLUDED_IN_RENT",
        status: l.status,
        submittedAt: l.status !== "DRAFT" ? new Date(now - (i + 2) * 86_400_000) : null,
        publishedAt: l.status === "PUBLISHED" ? new Date(now - (i + 1) * 86_400_000) : null,
        availabilityConfirmedAt: new Date(now - i * 5 * 86_400_000),
        charges: {
          create: [
            { label: "Security", amount: 10000, frequency: "MONTHLY" },
            { label: "Garbage collection", amount: 3000, frequency: "MONTHLY" },
          ],
        },
      },
    });
    const photos = seedPhotosFor(l.neighborhood);
    for (let n = 0; n < Math.max(photos.length, 3); n++) {
      const key = `listings/sample/${property.id}-${n}.webp`;
      const thumbKey = `listings/sample/${property.id}-${n}.thumb.webp`;
      const photo = photos[n];
      let img: { full: Buffer; thumb: Buffer; width: number; height: number; sha256: string };
      if (photo) {
        img = await processPhoto(photo);
      } else if (photos.length) {
        break; // real photos supplied: don't pad them with placeholders
      } else {
        const color = PALETTE[(i + n) % PALETTE.length]!;
        const label = `${l.neighborhood} — photo ${n + 1}`;
        img = {
          full: await placeholderImage(label, color, 1200, 800),
          thumb: await placeholderImage(label, color, 640, 480),
          width: 1200,
          height: 800,
          sha256: `sample-${property.id}-${n}`,
        };
      }
      await store.put(key, img.full, "image/webp");
      await store.put(thumbKey, img.thumb, "image/webp");
      await prisma.propertyImage.create({
        data: {
          propertyId: property.id,
          storageKey: key,
          thumbKey,
          width: img.width,
          height: img.height,
          sizeBytes: img.full.length,
          sha256: photo ? img.sha256 : `sample-${property.id}-${n}`,
          sortOrder: n,
          altText: photo ? `${l.title}, photo ${n + 1}` : `Sample placeholder image ${n + 1}`,
        },
      });
    }
    created.push(property);
  }

  // A pending identity check (with a placeholder document) so reviewers can try the workflow.
  const evKey = `evidence/sample/${randomUUID()}.jpg`;
  const evBody = await sharp(await placeholderImage("SAMPLE ID DOCUMENT — NOT REAL", "#77520c", 1000, 640))
    .jpeg()
    .toBuffer();
  await store.put(evKey, evBody, "image/jpeg");
  await prisma.verificationRequest.create({
    data: {
      subjectUserId: agent.id,
      type: "IDENTITY",
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
      applicantNote: "Sample request created by the seed script.",
      evidence: {
        create: {
          uploadedById: agent.id,
          kind: "NATIONAL_ID",
          storageKey: evKey,
          mimeType: "image/jpeg",
          sizeBytes: evBody.length,
          sha256: "sample-evidence",
        },
      },
    },
  });

  const published = created.filter((p) => p.status === "PUBLISHED");
  await prisma.savedProperty.create({ data: { userId: tenant.id, propertyId: published[0]!.id } });
  await prisma.viewingRequest.create({
    data: {
      propertyId: published[1]!.id,
      requesterId: tenant.id,
      advertiserId: published[1]!.advertiserId,
      proposedAt: new Date(now + 3 * 86_400_000),
      message: "Sample viewing request.",
    },
  });
  await prisma.report.create({
    data: {
      reporterId: tenant.id,
      propertyId: published[2]!.id,
      subjectUserId: published[2]!.advertiserId,
      category: "INCORRECT_PRICE_OR_AVAILABILITY",
      description: "Sample report: the price quoted on the phone was higher than the listing.",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed.run",
      entityType: "System",
      metadata: { listings: created.length },
    },
  });

  console.log(
    `Seeded fictional sample data. Sign in with any of these (password: ${process.env.SEED_PASSWORD ? "$SEED_PASSWORD" : PASSWORD}):`,
  );
  for (const u of [admin, landlord, agent, tenant]) console.log(`  ${u.role.padEnd(8)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
