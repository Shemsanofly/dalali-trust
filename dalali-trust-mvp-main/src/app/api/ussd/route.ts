import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { handleUssd } from "@/server/ussd";

export const dynamic = "force-dynamic";

/**
 * Africa's Talking USSD callback. Set the callback URL in the Africa's Talking dashboard
 * (USSD → Service codes) to:  <APP_URL>/api/ussd?token=<USSD_CALLBACK_TOKEN>
 * Africa's Talking does not sign requests, so the secret token in the URL is what keeps
 * other callers out. See docs/AFRICASTALKING.md.
 */
function tokenMatches(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const e = env();
  if (e.USSD_ENABLED !== "true") return text("Not found", 404);
  if (!tokenMatches(new URL(req.url).searchParams.get("token"), e.USSD_CALLBACK_TOKEN))
    return text("Forbidden", 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return text("Bad request", 400);
  }
  const field = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v.slice(0, 500) : "";
  };
  const sessionId = field("sessionId");
  if (!sessionId) return text("Bad request", 400);

  try {
    return text(
      await handleUssd({
        sessionId,
        serviceCode: field("serviceCode"),
        phoneNumber: field("phoneNumber"),
        text: field("text"),
      }),
    );
  } catch (err) {
    console.error("[ussd] callback failed", err instanceof Error ? err.message : err);
    return text("END Sorry, something went wrong. Please try again later.");
  }
}
