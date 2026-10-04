import { ContactDialog } from "@/components/landing/contact-dialog";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { type LegalDocument, legalContent } from "@/lib/legal/content";

export function LegalPage({
  document,
  signedIn,
}: {
  readonly document: LegalDocument;
  readonly signedIn: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader signedIn={signedIn} />
      <main className="mx-auto w-[min(90%,1800px)] flex-1 pt-12 pb-20">
        <h1 className="font-heading text-[34px] leading-tight font-normal tracking-[-0.02em] desk:text-[42px]">
          {document.title}
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {legalContent.updated} {document.updated}
        </p>
        <p className="mt-8 text-[17px] leading-relaxed">{document.intro}</p>
        {document.sections.map((section) => (
          <section key={section.heading} className="mt-10">
            <h2 className="font-heading text-[21px] font-bold tracking-[-0.01em]">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) =>
              typeof paragraph === "string" ? (
                <p key={paragraph} className="mt-3 text-[17px] leading-relaxed">
                  {paragraph}
                </p>
              ) : (
                <p key={paragraph.before} className="mt-3 text-[17px] leading-relaxed">
                  {paragraph.before}
                  <ContactDialog
                    label={legalContent.contact}
                    triggerClassName="text-primary underline underline-offset-4"
                  />
                  {paragraph.after}
                </p>
              ),
            )}
            {section.items && (
              <ul className="mt-3 list-disc space-y-2 pl-6 text-[17px] leading-relaxed">
                {section.items.map((item) => (
                  <li key={item.text}>
                    {item.label && <strong className="font-bold">{item.label}: </strong>}
                    {item.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
