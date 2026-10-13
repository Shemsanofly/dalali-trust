"use client";

import { MessageCircle, Phone } from "lucide-react";
import { trackContactAction } from "@/app/actions/common";

export function ContactButtons({
  propertyId,
  phone,
  whatsapp,
  labels,
}: {
  propertyId: string;
  phone: string | null;
  whatsapp: string | null;
  labels: { call: string; whatsapp: string };
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="btn-secondary flex-1"
          onClick={() => void trackContactAction(propertyId, "contact_reveal")}
        >
          <Phone className="h-4 w-4" aria-hidden /> {labels.call} {phone.replace(/^\+255/, "0")}
        </a>
      ) : null}
      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex-1"
          onClick={() => void trackContactAction(propertyId, "whatsapp_click")}
        >
          <MessageCircle className="h-4 w-4" aria-hidden /> {labels.whatsapp}
        </a>
      ) : null}
    </div>
  );
}
