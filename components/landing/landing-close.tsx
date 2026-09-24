import { LandingCta } from "@/components/landing/landing-cta";
import { landingContent } from "@/lib/landing/content";

export function LandingClose() {
  const { close } = landingContent;
  return (
    <section className="bg-[radial-gradient(640px_300px_at_50%_100%,oklch(0.62_0.15_245/0.14),transparent_70%)] pt-[72px] pb-16 text-center">
      <div className="mx-auto max-w-[1356px] px-4">
        <h2 className="text-[36px] leading-[1.1] font-bold tracking-[-0.025em] text-balance">
          {close.heading}
        </h2>
        <p className="mx-auto mt-3 max-w-[30em] text-[16.5px] leading-[1.55] text-pretty text-text-body">
          {close.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <LandingCta cta="sign_up" placement="closing" />
          <LandingCta cta="log_in" placement="closing" />
        </div>
      </div>
    </section>
  );
}
