import "server-only";
import { env } from "../env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { ObjectStorage } from "./types";

export type { ObjectStorage } from "./types";

let testingStorage: ObjectStorage | undefined;
let singleton: ObjectStorage | undefined;

export function storage(): ObjectStorage {
  if (testingStorage) return testingStorage;
  if (!singleton) {
    const cfg = env();
    singleton =
      cfg.STORAGE_DRIVER === "s3"
        ? new S3Storage(cfg.S3_BUCKET!, {
            region: cfg.S3_REGION!,
            endpoint: cfg.S3_ENDPOINT,
            accessKeyId: cfg.S3_ACCESS_KEY_ID!,
            secretAccessKey: cfg.S3_SECRET_ACCESS_KEY!,
            forcePathStyle: cfg.S3_FORCE_PATH_STYLE === "true",
          })
        : new LocalStorage(cfg.STORAGE_LOCAL_DIR);
  }
  return singleton;
}

export function setStorageForTesting(store: ObjectStorage | undefined): void {
  testingStorage = store;
}
