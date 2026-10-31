import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { beforeEach } from "vitest";
import type { Role } from "@/generated/prisma/enums";
import type { Actor } from "@/server/actor";
import { prisma } from "@/server/db";
import { setStorageForTesting, type ObjectStorage } from "@/server/storage";

export class MemoryStorage implements ObjectStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();
  async put(key: string, body: Buffer, contentType: string) {
    this.objects.set(key, { body, contentType });
  }
  async get(key: string) {
    return this.objects.get(key) ?? null;
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
}

export const memoryStorage = new MemoryStorage();

const TABLES = [
  "analytics_event",
  "feedback",
  "notification",
  "audit_log",
  "moderation_action",
  "report_evidence",
  "report",
  "viewing_request",
  "verification_evidence",
  "verification_request",
  "saved_property",
  "property_charge",
  "property_image",
  "property",
  "advertiser_profile",
  "rate_limit",
  "verification",
  "account",
  "session",
  "user",
];

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
  memoryStorage.objects.clear();
}

/** Registers the per-test database reset. Call once at the top of each test file. */
export function withCleanDatabase() {
  setStorageForTesting(memoryStorage);
  beforeEach(async () => {
    await resetDatabase();
  });
}

export async function createUser(
  role: Role = "TENANT",
  overrides: Partial<{ status: "ACTIVE" | "SUSPENDED"; name: string }> = {},
): Promise<Actor> {
  const id = randomUUID();
  const user = await prisma.user.create({
    data: {
      id,
      name: overrides.name ?? `${role.toLowerCase()} ${id.slice(0, 4)}`,
      email: `${role.toLowerCase()}-${id}@example.test`,
      role,
      status: overrides.status ?? "ACTIVE",
      ...(role === "LANDLORD" || role === "AGENT"
        ? { advertiserProfile: { create: { displayName: "Test Advertiser" } } }
        : {}),
    },
  });
  return { id: user.id, role: user.role, status: user.status, name: user.name, email: user.email };
}

export function validListingInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Self-contained room near Mwenge market",
    description:
      "Clean self-contained room with tiled floors, private bathroom and a secure compound. Five minutes to the daladala stand.",
    propertyType: "BEDSITTER",
    region: "dar-es-salaam",
    district: "Kinondoni",
    neighborhood: "Mwenge",
    rentAmount: 150000,
    advanceMonths: 3,
    depositAmount: 0,
    bedrooms: 1,
    bathrooms: 1,
    furnished: false,
    amenities: ["water_tank", "perimeter_wall"],
    electricity: "SEPARATE_METER",
    water: "SHARED_SPLIT",
    availabilityStatus: "AVAILABLE",
    charges: [{ label: "Security", amount: 10000, frequency: "MONTHLY" }],
    ...overrides,
  };
}

export async function pngFile(name = "photo.png", color = { r: 200, g: 120, b: 40 }): Promise<File> {
  const buf = await sharp({ create: { width: 64, height: 48, channels: 3, background: color } })
    .png()
    .toBuffer();
  return new File([new Uint8Array(buf)], name, { type: "image/png" });
}

export function pdfFile(name = "doc.pdf"): File {
  const body = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF";
  return new File([body], name, { type: "application/pdf" });
}
