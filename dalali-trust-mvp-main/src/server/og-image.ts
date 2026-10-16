import "server-only";
import sharp from "sharp";
import { storage } from "./storage";

/** Storage key of the link-preview copy of a listing photo. */
export function ogImageKey(storageKey: string): string {
  return `${storageKey}.og.jpg`;
}

/**
 * A 1200×630 JPEG of a listing photo for link previews (WhatsApp, Facebook, X). Messaging
 * apps do not reliably show WebP, so a JPEG copy is generated once and then served from storage.
 */
export async function listingPreviewImage(storageKey: string): Promise<Buffer | null> {
  const store = storage();
  const key = ogImageKey(storageKey);
  const cached = await store.get(key);
  if (cached) return cached.body;
  const original = await store.get(storageKey);
  if (!original) return null;
  const jpeg = await sharp(original.body)
    .resize({ width: 1200, height: 630, fit: "cover" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  await store.put(key, jpeg, "image/jpeg");
  return jpeg;
}
