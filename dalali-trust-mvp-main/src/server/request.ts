import "server-only";
import { headers } from "next/headers";
import { clientIp } from "@/lib/client-ip";
import { hashIdentifier } from "./rate-limit";

/** A hashed client identifier for rate limiting anonymous requests. Raw IPs are never stored. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip =
    clientIp((name) => h.get(name), {
      trustProxy: process.env.TRUST_PROXY_HEADERS === "true",
      preferredHeader: process.env.CLIENT_IP_HEADER?.toLowerCase() || undefined,
    }) ?? "unknown";
  return hashIdentifier(`${ip}|${h.get("user-agent") ?? ""}`);
}

/** Only allow same-site relative redirect targets (prevents open redirects). */
export function safeNext(next: string | undefined | null, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
