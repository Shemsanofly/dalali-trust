/**
 * WhatsApp message templates. Automatic WhatsApp messages must use templates approved by
 * Meta, so the wording below must match the templates created in WhatsApp Manager exactly
 * (category: Utility; languages: English "en" and Swahili "sw"). docs/WHATSAPP.md lists them.
 */
export const WHATSAPP_TEMPLATES = {
  dalali_viewing_requested: {
    en: "New viewing request for {{1}} on {{2}}. Accept or decline it in your Estate dashboard: {{3}}",
    sw: "Ombi jipya la kuangalia {{1}} tarehe {{2}}. Likubali au ulikatae kwenye dashibodi yako ya Estate: {{3}}",
  },
  dalali_viewing_accepted: {
    en: "Good news: your viewing request for {{1}} on {{2}} was accepted. Details: {{3}} Never pay before you have seen the home.",
    sw: "Habari njema: ombi lako la kuangalia {{1}} tarehe {{2}} limekubaliwa. Maelezo: {{3}} Usilipe kabla ya kuona nyumba.",
  },
  dalali_viewing_declined: {
    en: "Your viewing request for {{1}} was declined. See other homes on Estate: {{2}}",
    sw: "Ombi lako la kuangalia {{1}} halikukubaliwa. Ona nyumba nyingine kwenye Estate: {{2}}",
  },
  dalali_listing_published: {
    en: "Your listing {{1}} has been reviewed and is now live on Estate: {{2}}",
    sw: "Tangazo lako {{1}} limekaguliwa na sasa liko hewani kwenye Estate: {{2}}",
  },
  dalali_listing_not_approved: {
    en: "Your listing {{1}} was not approved yet. Moderator's note: {{2}}. Fix it and submit again: {{3}}",
    sw: "Tangazo lako {{1}} bado halijakubaliwa. Maelezo ya msimamizi: {{2}}. Lirekebishe kisha ulitume tena: {{3}}",
  },
} as const;

export type WhatsAppTemplate = keyof typeof WHATSAPP_TEMPLATES;

/**
 * Meta rejects template parameters containing new lines, tabs or more than four spaces in
 * a row, so values are flattened and kept short.
 */
export function cleanParam(value: string, max = 200): string {
  const flat = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat || "-";
}

/** The message text as the recipient will read it (console mode, previews and tests). */
export function renderTemplate(template: WhatsAppTemplate, locale: "en" | "sw", params: string[]): string {
  return WHATSAPP_TEMPLATES[template][locale].replace(
    /\{\{(\d+)\}\}/g,
    (_, n: string) => params[Number(n) - 1] ?? "",
  );
}
