/**
 * Picks the visitor's IP address from request headers, for rate limiting only.
 *
 * - Without a trusted proxy, client-supplied headers are ignored (they can be faked).
 * - `CLIENT_IP_HEADER` names one header that the hosting edge sets itself and overwrites,
 *   e.g. `cf-connecting-ip` behind Cloudflare. It is preferred when present.
 * - Otherwise the first `X-Forwarded-For` entry is used. Note that some proxies append to
 *   a client-supplied X-Forwarded-For, which is why a dedicated header is preferred.
 */
export function clientIp(
  get: (name: string) => string | null,
  opts: { trustProxy: boolean; preferredHeader?: string },
): string | null {
  if (!opts.trustProxy) return null;
  const preferred = opts.preferredHeader ? get(opts.preferredHeader)?.trim() : undefined;
  if (preferred) return preferred;
  return get("x-forwarded-for")?.split(",")[0]?.trim() || get("x-real-ip")?.trim() || null;
}

/** Header names Better Auth should read, most trusted first. */
export function clientIpHeaders(opts: { trustProxy: boolean; preferredHeader?: string }): string[] {
  if (!opts.trustProxy) return [];
  return [...(opts.preferredHeader ? [opts.preferredHeader] : []), "x-forwarded-for", "x-real-ip"];
}
