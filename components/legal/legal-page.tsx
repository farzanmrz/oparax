import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import type { LegalDocument } from "@/lib/legal/content";

export function LegalPage({
  document,
  signedIn,
}: {
  readonly document: LegalDocument;
  readonly signedIn: boolean;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingHeader signedIn={signedIn} />
      <main className="mx-auto max-w-[44rem] px-4 pt-12 pb-20">
        <h1 className="font-heading text-[34px] leading-tight font-bold tracking-[-0.02em] desk:text-[42px]">
          {document.title}
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">Last updated {document.updated}</p>
        <p className="mt-8 text-[17px] leading-relaxed">{document.intro}</p>
        {document.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="font-heading text-[21px] font-semibold tracking-[-0.01em]">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-[17px] leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.items && (
              <ul className="mt-3 list-disc space-y-2 pl-6 text-[17px] leading-relaxed">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
      <LandingFooter />
    </div>
  );
}
