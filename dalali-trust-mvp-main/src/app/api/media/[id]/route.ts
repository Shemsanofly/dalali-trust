import { fileResponse } from "@/server/file-response";
import { getActor } from "@/server/session";
import { canViewListingImage } from "@/server/services/listings";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return new Response("Not found", { status: 404 });
  const actor = await getActor();
  const image = await canViewListingImage(actor, id);
  if (!image) return new Response("Not found", { status: 404 });
  const thumb = new URL(req.url).searchParams.get("size") === "thumb";
  return fileResponse(thumb ? image.thumbKey : image.storageKey, {
    cache: image.isPublic ? "public" : "private",
  });
}
