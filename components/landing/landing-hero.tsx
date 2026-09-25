import { LandingCta } from "@/components/landing/landing-cta";
import { landingContent } from "@/lib/landing/content";

export function LandingHero({ signedIn }: { readonly signedIn: boolean }) {
  const { hero } = landingContent;
  return (
    <section className="pt-16 pb-5 text-center">
      <div className="mx-auto max-w-[1356px] px-4">
        <h1 className="font-heading text-[42px] leading-[1.05] font-normal tracking-[-0.02em] text-balance desk:text-[60px]">
          {hero.headline}
        </h1>
        <p className="mt-[18px] text-[19px] leading-normal text-pretty text-foreground">
          {hero.description}
        </p>
        {!signedIn && (
          <div className="mt-7 flex flex-col items-center justify-center gap-3 desk:flex-row">
            <LandingCta cta="sign_up" placement="hero" />
          </div>
        )}
      </div>
    </section>
  );
}
