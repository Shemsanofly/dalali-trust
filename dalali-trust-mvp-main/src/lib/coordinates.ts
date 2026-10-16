/**
 * Landlords often paste both numbers from Google Maps ("-6.7735, 39.2195") or a Maps link
 * into the first box. Split those into latitude and longitude; anything else passes through.
 */
export function coordinatesFromForm(lat?: string, lng?: string): [string | undefined, string | undefined] {
  const first = lat?.trim() ?? "";
  if (first && !lng?.trim()) {
    const m =
      /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(first) ??
      /[?&](?:q|query|ll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(first) ??
      /^\s*(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)\s*$/.exec(first);
    if (m) return [m[1], m[2]];
  }
  return [lat, lng];
}
