import type { ReactNode } from "react";
import type { PageContent } from "@/i18n/content";

export function ContentPage({ content, children }: { content: PageContent; children?: ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-10">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">{content.title}</h1>
        <span
          className="mt-3 block h-1 w-16 rounded-full bg-linear-to-r from-brand-500 to-gold-400"
          aria-hidden
        />
        <p className="mt-4 text-lg text-navy-600">{content.intro}</p>
      </div>
      <div className="prose-plain mt-6 text-navy-800">
        {content.sections.map((s) => (
          <section key={s.h} data-reveal>
            <h2>{s.h}</h2>
            {s.p?.map((para) => (
              <p key={para}>{para}</p>
            ))}
            {s.ul ? (
              <ul>
                {s.ul.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      {children}
    </div>
  );
}
