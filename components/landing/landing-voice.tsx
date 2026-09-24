import { LandingDraftExample, LandingGuideExample } from "@/components/landing/landing-examples";
import { landingContent } from "@/lib/landing/content";

export function LandingVoice() {
  const { voice } = landingContent;
  return (
    <section className="border-y border-border bg-[var(--header-bg)] pt-14 pb-[72px]">
      <div className="mx-auto max-w-[1356px] px-4">
        <div className="flex max-w-[46em] flex-col gap-3 pb-8">
          <h2 className="text-[36px] leading-[1.1] font-bold tracking-[-0.025em] text-balance desk:text-[44px]">
            {voice.heading}
          </h2>
          <p className="text-[16.5px] leading-[1.55] text-pretty text-text-body">
            {voice.description}
          </p>
        </div>
        <div className="grid items-start gap-8 min-[1100px]:grid-cols-[400px_minmax(0,1fr)]">
          <LandingGuideExample />
          <LandingDraftExample />
        </div>
      </div>
    </section>
  );
}
