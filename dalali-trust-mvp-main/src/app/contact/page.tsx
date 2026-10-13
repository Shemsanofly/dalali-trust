import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback-form";
import { getDictionary } from "@/i18n/server";
import { formatTzPhone, whatsappLink } from "@/lib/phone";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const { t } = await getDictionary();
  const e = env();
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl font-extrabold text-navy-900">{t.footer.contact}</h1>
      <ul className="mt-4 space-y-1 text-navy-700">
        {e.SUPPORT_EMAIL ? (
          <li>
            Email:{" "}
            <a className="underline" href={`mailto:${e.SUPPORT_EMAIL}`}>
              {e.SUPPORT_EMAIL}
            </a>
          </li>
        ) : null}
        {e.SUPPORT_PHONE ? (
          <li>
            Simu / Phone:{" "}
            <a className="underline" href={`tel:${e.SUPPORT_PHONE}`}>
              {formatTzPhone(e.SUPPORT_PHONE)}
            </a>
          </li>
        ) : null}
        {e.SUPPORT_WHATSAPP ? (
          <li>
            WhatsApp:{" "}
            <a
              className="underline"
              href={whatsappLink(e.SUPPORT_WHATSAPP)}
              rel="noopener noreferrer"
              target="_blank"
            >
              {formatTzPhone(e.SUPPORT_WHATSAPP)}
            </a>
          </li>
        ) : null}
      </ul>
      <div className="card mt-6 p-6">
        <FeedbackForm
          kind="CONTACT"
          page="/contact"
          labels={{
            prompt: t.common.feedbackPrompt,
            submit: t.common.submit,
            thanks: t.common.feedbackThanks,
            name: t.auth.name,
            email: t.auth.email,
          }}
        />
      </div>
    </div>
  );
}
