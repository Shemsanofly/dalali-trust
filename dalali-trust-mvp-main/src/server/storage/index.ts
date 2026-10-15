import "server-only";
import { env } from "../env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { ObjectStorage } from "./types";

export type { ObjectStorage, StoredObject } from "./types";

let instance: ObjectStorage | undefined;

/** The configured object store (STORAGE_DRIVER=local | s3). */
export function storage(): ObjectStorage {
  if (!instance) {
    const e = env();
    instance =
      e.STORAGE_DRIVER === "s3"
        ? new S3Storage(e.S3_BUCKET!, {
            region: e.S3_REGION!,
            endpoint: e.S3_ENDPOINT,
            accessKeyId: e.S3_ACCESS_KEY_ID!,
            secretAccessKey: e.S3_SECRET_ACCESS_KEY!,
            forcePathStyle: e.S3_FORCE_PATH_STYLE === "true",
          })
        : new LocalStorage(e.STORAGE_LOCAL_DIR);
  }
  return instance;
}

/** Lets integration tests swap in an in-memory store. */
export function setStorageForTesting(store: ObjectStorage | undefined): void {
  instance = store;
}
