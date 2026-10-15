import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { assertSafeKey, type ObjectStorage, type StoredObject } from "./types";

export type S3Options = {
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
};

/**
 * Any S3-compatible private bucket (AWS S3, Cloudflare R2, Backblaze B2, MinIO).
 * Objects are never public: they are streamed to authorised users by the app.
 */
export class S3Storage implements ObjectStorage {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    opts: S3Options,
  ) {
    this.client = new S3Client({
      region: opts.region,
      endpoint: opts.endpoint,
      forcePathStyle: opts.forcePathStyle ?? false,
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    assertSafeKey(key);
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return {
        body: Buffer.from(await res.Body.transformToByteArray()),
        contentType: res.ContentType ?? "application/octet-stream",
      };
    } catch (e) {
      if (e instanceof S3ServiceException && (e.name === "NoSuchKey" || e.$metadata.httpStatusCode === 404)) {
        return null;
      }
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
