import "server-only";
import { storage } from "./storage";

/**
 * Streams a private object. `public` responses (published listing photos) may be cached;
 * everything else is marked private/no-store so shared caches never keep a copy.
 */
export async function fileResponse(
  key: string,
  opts: { cache: "public" | "private"; download?: boolean },
): Promise<Response> {
  const obj = await storage().get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(obj.body), {
    headers: {
      "Content-Type": obj.contentType,
      "Content-Length": String(obj.body.length),
      "Cache-Control":
        opts.cache === "public"
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Content-Disposition": opts.download ? "attachment" : "inline",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
