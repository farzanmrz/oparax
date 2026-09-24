import { LandingCta } from "@/components/landing/landing-cta";
import { landingContent } from "@/lib/landing/content";

export function LandingHero() {
  const { hero } = landingContent;
  return (
    <section className="bg-[radial-gradient(900px_360px_at_50%_0%,oklch(0.62_0.15_245/0.14),transparent_70%)] pt-16 pb-5 text-center">
      <div className="mx-auto max-w-[1356px] px-4">
        <p className="flex items-center justify-center gap-2 text-[13px] font-medium tracking-[0.02em] text-text-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          {hero.eyebrow}
        </p>
        <h1 className="mt-4 text-[42px] leading-[1.02] font-bold tracking-[-0.03em] text-balance desk:text-[60px]">
          {hero.headline[0]} <span className="text-[oklch(0.74_0.14_245)]">{hero.headline[1]}</span>
        </h1>
        <p className="mx-auto mt-[18px] max-w-[36em] text-[19px] leading-normal text-pretty text-text-body">
          {hero.description}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 desk:flex-row">
          <LandingCta cta="sign_up" placement="hero" />
          <LandingCta cta="see_how_it_works" placement="hero" />
        </div>
      </div>
    </section>
  );
}
