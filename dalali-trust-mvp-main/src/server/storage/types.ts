import { AppError } from "../errors";

export type StoredObject = {
  body: Buffer;
  contentType: string;
};

export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

/** Rejects absolute, traversal and malformed object keys. */
export function assertSafeKey(key: string): void {
  if (typeof key !== "string" || key.length === 0) {
    throw new AppError("VALIDATION", "Invalid storage key.");
  }
  if (key.startsWith("/") || key.startsWith("\\")) {
    throw new AppError("VALIDATION", "Invalid storage key.");
  }
  if (key.includes("\\") || key.includes("\0")) {
    throw new AppError("VALIDATION", "Invalid storage key.");
  }
  const segments = key.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new AppError("VALIDATION", "Invalid storage key.");
  }
}
