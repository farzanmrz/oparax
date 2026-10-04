import { Hero } from "@/components/landing/hero";
import { Platforms } from "@/components/landing/platforms";
import { Pricing } from "@/components/landing/pricing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { landingContent } from "@/lib/landing/content";

export type LandingEntrance =
  | { kind: "signed_out" }
  | { kind: "setup" }
  | { kind: "owner"; handle: string };

export function LandingPage({
  signedIn,
  entrance,
}: {
  readonly signedIn: boolean;
  readonly entrance: LandingEntrance;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#landing-content"
        className="sr-only z-30 rounded-md bg-background p-3 text-primary focus:fixed focus:top-2 focus:left-4 focus:not-sr-only focus-visible:outline-2 focus-visible:outline-ring"
      >
        {landingContent.navigation.skipToContent}
      </a>
      <SiteHeader signedIn={signedIn} />
      <main
        id="landing-content"
        tabIndex={-1}
        className="mx-auto flex w-[min(90%,1800px)] flex-1 flex-col gap-20 pb-20"
      >
        <Hero entrance={entrance} />
        <Platforms />
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  );
}
