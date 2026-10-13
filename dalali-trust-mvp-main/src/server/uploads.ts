import "server-only";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { AppError } from "./errors";

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGES_PER_LISTING = 12;
export const MAX_EVIDENCE_FILES = 6;

type Detected = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

/** Detects the real file type from magic bytes; the client-declared type is ignored. */
export function detectFileType(buf: Buffer): Detected | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  if (buf.length >= 5 && buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function fileToBuffer(file: File, maxBytes: number): Promise<Buffer> {
  if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Please choose a file.");
  if (file.size > maxBytes) {
    throw new AppError(
      "VALIDATION",
      `Each file must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    );
  }
  return Buffer.from(await file.arrayBuffer());
}

export type ProcessedImage = {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  sha256: string;
};

/**
 * Validates and re-encodes a photo. Re-encoding strips EXIF metadata (including GPS
 * coordinates that could reveal someone's home) and neutralises malformed payloads.
 */
export async function processListingImage(buf: Buffer): Promise<ProcessedImage> {
  const type = detectFileType(buf);
  if (!type || type === "application/pdf") {
    throw new AppError("VALIDATION", "Photos must be JPEG, PNG or WebP images.");
  }
  const hash = sha256(buf);
  try {
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
    return { full: full.data, thumb, width: full.info.width, height: full.info.height, sha256: hash };
  } catch {
    throw new AppError("VALIDATION", "That image could not be processed. Please try another photo.");
  }
}

/** Validates an evidence document. Images are re-encoded (metadata stripped); PDFs are stored as-is. */
export async function processEvidenceFile(
  buf: Buffer,
): Promise<{ body: Buffer; mimeType: string; sha256: string }> {
  const type = detectFileType(buf);
  if (!type) throw new AppError("VALIDATION", "Documents must be PDF, JPEG, PNG or WebP files.");
  const hash = sha256(buf);
  if (type === "application/pdf") return { body: buf, mimeType: type, sha256: hash };
  try {
    const body = await sharp(buf, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { body, mimeType: "image/jpeg", sha256: hash };
  } catch {
    throw new AppError("VALIDATION", "That document image could not be processed.");
  }
}

export function newStorageKey(prefix: "listings" | "evidence" | "reports", ext: string): string {
  const d = new Date();
  return `${prefix}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;
}
