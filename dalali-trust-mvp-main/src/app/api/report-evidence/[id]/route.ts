import { isAppError } from "@/server/errors";
import { fileResponse } from "@/server/file-response";
import { getActor } from "@/server/session";
import { getReportEvidenceForDownload } from "@/server/services/reports";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ev = await getReportEvidenceForDownload(await getActor(), id);
    return fileResponse(ev.storageKey, { cache: "private", download: ev.mimeType === "application/pdf" });
  } catch (e) {
    if (isAppError(e) && e.code === "UNAUTHENTICATED") return new Response("Unauthorized", { status: 401 });
    return new Response("Not found", { status: 404 });
  }
}
