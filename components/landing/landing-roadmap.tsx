import { PlatformLogo } from "@/components/landing/platform-logo";
import { Card } from "@/components/ui/card";
import { landingContent } from "@/lib/landing/content";

export function LandingRoadmap() {
  const { roadmap } = landingContent;
  return (
    <section className="pt-14 pb-[72px]">
      <div className="mx-auto max-w-[1356px] px-4">
        <div className="flex max-w-[46em] flex-col gap-3 pb-8">
          <h2 className="text-[36px] leading-[1.1] font-bold tracking-[-0.025em] text-balance desk:text-[44px]">
            {roadmap.heading}
          </h2>
          <p className="text-[16.5px] leading-[1.55] text-pretty text-text-body">
            {roadmap.description}
          </p>
        </div>
        <div className="grid gap-5 desk:grid-cols-2 min-[1100px]:grid-cols-4">
          {roadmap.cards.map((card) => (
            <Card
              key={card.title}
              className="min-w-0 gap-0 rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] p-0 shadow-[var(--card-shadow)] ring-0"
            >
              <h3 className="border-b border-[var(--band-border)] bg-[var(--band-bg)] px-5 py-2.5 text-sm font-medium text-band-header-text">
                {card.title}
              </h3>
              <div className="flex min-h-44 flex-1 flex-col gap-3 px-5 py-[18px]">
                <p className="flex-1 text-[14.5px] leading-[1.55] text-text-body">
                  {card.description}
                </p>
                {card.platforms.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                    {card.platforms.map((platform) => (
                      <PlatformLogo key={platform} platform={platform} />
                    ))}
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
