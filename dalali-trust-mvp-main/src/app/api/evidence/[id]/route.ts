import { isAppError } from "@/server/errors";
import { fileResponse } from "@/server/file-response";
import { getActor } from "@/server/session";
import { getEvidenceForDownload } from "@/server/services/verification";

/** Private identity / property evidence. Only the submitter and administrators. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ev = await getEvidenceForDownload(await getActor(), id);
    return fileResponse(ev.storageKey, { cache: "private", download: ev.mimeType === "application/pdf" });
  } catch (e) {
    if (isAppError(e) && e.code === "UNAUTHENTICATED") return new Response("Unauthorized", { status: 401 });
    return new Response("Not found", { status: 404 });
  }
}
