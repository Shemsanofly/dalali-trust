"use client";

import { Check, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

/**
 * "Share on WhatsApp" (opens WhatsApp with a ready message and the link) plus a general
 * Share button: the phone's own share sheet where available, otherwise copy the link.
 */
export function ShareButtons({
  path,
  text,
  labels,
}: {
  path: string;
  text: string;
  labels: { share: string; shareWhatsapp: string; linkCopied: string };
}) {
  const [copied, setCopied] = useState(false);
  const url = () => new URL(path, window.location.origin).toString();

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text, url: url() });
        return;
      }
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // The visitor closed the share sheet, or the browser blocked it: nothing to do.
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${path}`)}`}
        onClick={(e) => {
          // Build the message with the full address at click time (the server only knows the path).
          e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${text} ${url()}`)}`;
        }}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary flex-1 border-[#25d366]/40 hover:border-[#25d366] hover:text-[#128c7e]"
      >
        <MessageCircle className="h-4 w-4" aria-hidden /> {labels.shareWhatsapp}
      </a>
      <button type="button" onClick={share} className="btn-secondary" aria-live="polite">
        {copied ? (
          <Check className="h-4 w-4 text-brand-600" aria-hidden />
        ) : (
          <Share2 className="h-4 w-4" aria-hidden />
        )}
        {copied ? labels.linkCopied : labels.share}
      </button>
    </div>
  );
}
