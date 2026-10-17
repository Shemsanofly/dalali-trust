import { fmt, type Dictionary } from ".";

type NoticeData = Record<string, string | undefined>;

/**
 * Builds a notification's title and body in the reader's language from its type and the
 * values stored with it. Returns null for notifications without stored values (older
 * ones), which then show their saved English text. Free text written by moderators or
 * advertisers (reasons, messages) is shown as written.
 */
export function notificationText(
  t: Dictionary["notices"],
  type: string,
  raw: unknown,
): { title: string; body: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as NoticeData;
  const v = { listing: d.listing ?? "", reason: d.reason ?? "", message: d.message ?? "" };
  const withMessage = (body: string) => (d.message ? `${body} ${fmt(t.advertiserMessage, v)}` : body);
  switch (type) {
    case "viewing_requested":
      return { title: t.viewingRequestedTitle, body: fmt(t.viewingRequested, v) };
    case "viewing_accepted":
      return { title: t.viewingUpdateTitle, body: withMessage(fmt(t.viewingAccepted, v)) };
    case "viewing_declined":
      return { title: t.viewingUpdateTitle, body: withMessage(fmt(t.viewingDeclined, v)) };
    case "viewing_cancelled":
      return { title: t.viewingCancelledTitle, body: fmt(t.viewingCancelled, v) };
    case "listing_approve":
      return { title: t.listingTitle, body: fmt(t.listingApproved, v) };
    case "listing_reject":
      return { title: t.listingTitle, body: fmt(t.listingRejected, v) };
    case "listing_suspend":
      return {
        title: t.listingTitle,
        body: fmt(d.reason ? t.listingSuspended : t.listingSuspendedAfterReport, v),
      };
    case "listing_reinstate":
      return { title: t.listingTitle, body: fmt(t.listingReinstated, v) };
    case "verification_verified":
      return { title: t.verificationTitle, body: t.verificationVerified };
    case "verification_rejected":
      return { title: t.verificationTitle, body: fmt(t.verificationRejected, v) };
    case "verification_more_info_required":
      return { title: t.verificationTitle, body: fmt(t.verificationMoreInfo, v) };
    case "verification_expired":
      return { title: t.verificationExpiredTitle, body: t.verificationExpired };
    default:
      if (type.startsWith("report_")) return { title: t.reportTitle, body: d.response || t.reportChanged };
      return null;
  }
}
