import "server-only";
import { prisma } from "../db";

/**
 * Privacy-respecting product events. Only the event name and (optionally) a listing id
 * are stored — never user ids, IP addresses, or device fingerprints.
 */
export const EVENTS = [
  "listing_view",
  "contact_reveal",
  "whatsapp_click",
  "listing_saved",
  "viewing_requested",
  "report_submitted",
  "signup_completed",
  "listing_submitted",
  "ussd_listing_view",
  "ussd_sms_details",
] as const;

export type EventName = (typeof EVENTS)[number];

export async function track(name: EventName, propertyId?: string): Promise<void> {
  try {
    await prisma.analyticsEvent.create({ data: { name, propertyId: propertyId ?? null } });
  } catch (e) {
    // Analytics must never break a user journey.
    console.warn("[analytics] failed to record event", name, (e as Error).message);
  }
}
