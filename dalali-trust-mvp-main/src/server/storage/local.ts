import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeKey, type ObjectStorage, type StoredObject } from "./types";

function metadataPath(filePath: string): string {
  return `${filePath}.meta.json`;
}

function inferContentType(key: string): string {
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export class LocalStorage implements ObjectStorage {
  constructor(private readonly rootDir: string) {}

  private fullPath(key: string): string {
    assertSafeKey(key);
    return path.join(this.rootDir, key);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const filePath = this.fullPath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
    await writeFile(metadataPath(filePath), JSON.stringify({ contentType }));
  }

  async get(key: string): Promise<StoredObject | null> {
    const filePath = this.fullPath(key);
    try {
      const body = await readFile(filePath);
      let contentType = inferContentType(key);
      try {
        const metadata = JSON.parse(await readFile(metadataPath(filePath), "utf8")) as { contentType?: string };
        if (metadata.contentType) contentType = metadata.contentType;
      } catch {
        // tolerate old files without sidecar metadata
      }
      return { body, contentType };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.fullPath(key);
    await Promise.allSettled([
      rm(filePath, { force: true }),
      rm(metadataPath(filePath), { force: true }),
    ]);
  }
}
