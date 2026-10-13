/**
 * Tanzanian phone number helpers (adapted from the legacy `toE164` helper).
 * Accepts 07XXXXXXXX, 06XXXXXXXX, 2557XXXXXXXX, +2557XXXXXXXX (spaces/dashes allowed)
 * and returns E.164 (+255XXXXXXXXX). Only mobile ranges (6x/7x) are accepted.
 */
export function normalizeTzPhone(input: string): string | null {
  const clean = input.replace(/[\s\-().]/g, "");
  let national: string;
  if (/^\+255\d{9}$/.test(clean)) national = clean.slice(4);
  else if (/^255\d{9}$/.test(clean)) national = clean.slice(3);
  else if (/^0\d{9}$/.test(clean)) national = clean.slice(1);
  else if (/^\d{9}$/.test(clean)) national = clean;
  else return null;
  if (!/^[67]\d{8}$/.test(national)) return null;
  return `+255${national}`;
}

/** Formats +255712345678 as "+255 712 345 678". */
export function formatTzPhone(e164: string): string {
  const m = /^\+255(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+255 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export function whatsappLink(e164: string, text?: string): string {
  const digits = e164.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
