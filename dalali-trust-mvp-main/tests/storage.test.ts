import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LocalStorage } from "@/server/storage/local";
import { assertSafeKey, contentTypeForKey } from "@/server/storage/types";

describe("storage keys", () => {
  it("accepts generated keys, including thumbnails", () => {
    expect(() => assertSafeKey("listings/2026/10/0b6a1c0e-1f.thumb.webp")).not.toThrow();
  });
  it("rejects traversal, absolute, empty and odd keys", () => {
    for (const bad of [
      "",
      "../x.jpg",
      "a/../../x.jpg",
      "/etc/passwd",
      "a//b.jpg",
      "a\\b.jpg",
      "a/..hidden.jpg",
      ".env",
    ]) {
      expect(() => assertSafeKey(bad), bad).toThrow();
    }
  });
  it("maps extensions to content types", () => {
    expect(contentTypeForKey("a/b.webp")).toBe("image/webp");
    expect(contentTypeForKey("a/b.pdf")).toBe("application/pdf");
    expect(contentTypeForKey("a/b.bin")).toBe("application/octet-stream");
  });
});

describe("LocalStorage", () => {
  let dir: string;
  let store: LocalStorage;
  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "dalali-storage-"));
    store = new LocalStorage(dir);
  });
  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("stores, reads and deletes an object", async () => {
    const key = "evidence/2026/10/doc.pdf";
    await store.put(key, Buffer.from("%PDF-1.7 test"), "application/pdf");
    const obj = await store.get(key);
    expect(obj?.body.toString()).toBe("%PDF-1.7 test");
    expect(obj?.contentType).toBe("application/pdf");
    await store.delete(key);
    expect(await store.get(key)).toBeNull();
  });
  it("returns null for a missing object and ignores deleting one", async () => {
    expect(await store.get("listings/none.webp")).toBeNull();
    await expect(store.delete("listings/none.webp")).resolves.toBeUndefined();
  });
  it("never writes outside its directory", async () => {
    await expect(store.put("../escape.jpg", Buffer.from("x"), "image/jpeg")).rejects.toThrow();
    await expect(fs.access(path.join(dir, "..", "escape.jpg"))).rejects.toThrow();
  });
  it("leaves no temporary files behind", async () => {
    await store.put("listings/a.webp", Buffer.from("x"), "image/webp");
    expect(await fs.readdir(path.join(dir, "listings"))).toEqual(["a.webp"]);
  });
});
