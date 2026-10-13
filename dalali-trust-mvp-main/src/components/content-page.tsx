import type { ReactNode } from "react";
import type { PageContent } from "@/i18n/content";

export function ContentPage({ content, children }: { content: PageContent; children?: ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="display text-4xl sm:text-5xl">{content.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-navy-600">{content.intro}</p>
      <div className="prose-plain mt-6 text-navy-800">
        {content.sections.map((s) => (
          <section key={s.h}>
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
