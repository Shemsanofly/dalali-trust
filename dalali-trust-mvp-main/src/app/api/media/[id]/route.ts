import { fileResponse } from "@/server/file-response";
import { listingPreviewImage } from "@/server/og-image";
import { getActor } from "@/server/session";
import { canViewListingImage } from "@/server/services/listings";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response("Not found", { status: 404 });
  const actor = await getActor();
  const image = await canViewListingImage(actor, id);
  if (!image) return new Response("Not found", { status: 404 });
  const size = new URL(req.url).searchParams.get("size");

  // Link-preview image: only for published listings, since it is fetched by messaging apps.
  if (size === "og") {
    if (!image.isPublic) return new Response("Not found", { status: 404 });
    const jpeg = await listingPreviewImage(image.storageKey);
    if (!jpeg) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(jpeg.length),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return fileResponse(size === "thumb" ? image.thumbKey : image.storageKey, {
    cache: image.isPublic ? "public" : "private",
  });
}
