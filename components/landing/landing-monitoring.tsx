import { LandingFeedExample, LandingSetupExample } from "@/components/landing/landing-examples";
import { landingContent } from "@/lib/landing/content";

export function LandingMonitoring() {
  const { monitoring } = landingContent;
  return (
    <section id="how-it-works" className="scroll-mt-[72px] pt-14 pb-[72px]">
      <div className="mx-auto max-w-[1356px] px-4">
        <div className="flex max-w-[46em] flex-col gap-3 pb-8">
          <h2 className="text-[36px] leading-[1.1] font-bold tracking-[-0.025em] text-balance desk:text-[44px]">
            {monitoring.heading}
          </h2>
          <p className="text-[16.5px] leading-[1.55] text-pretty text-text-body">
            {monitoring.description}
          </p>
        </div>
        <div className="grid items-start gap-8 min-[1100px]:grid-cols-[420px_minmax(0,1fr)]">
          <LandingSetupExample />
          <LandingFeedExample />
        </div>
      </div>
    </section>
  );
}
