import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { assertSafeKey, contentTypeForKey, type ObjectStorage, type StoredObject } from "./types";

/**
 * Stores objects as files under one directory. Suitable for development and for a single
 * server with a persistent disk; use S3Storage anywhere the filesystem is ephemeral.
 */
export class LocalStorage implements ObjectStorage {
  private readonly root: string;

  constructor(dir: string) {
    this.root = path.resolve(dir);
  }

  private pathFor(key: string): string {
    assertSafeKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error(`Unsafe storage key: ${key}`);
    return full;
  }

  // The content type is implied by the key's extension, so it is not stored separately.
  async put(key: string, body: Buffer, _contentType?: string): Promise<void> {
    const full = this.pathFor(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    // Write to a temporary file first so readers never see a half-written object.
    const tmp = `${full}.${randomUUID()}.tmp`;
    await fs.writeFile(tmp, body, { mode: 0o600 });
    await fs.rename(tmp, full);
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      return { body: await fs.readFile(this.pathFor(key)), contentType: contentTypeForKey(key) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.pathFor(key), { force: true });
  }
}
