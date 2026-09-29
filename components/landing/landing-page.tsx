import { ExampleAgent, type LandingExample } from "@/components/landing/example-agent";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { landingContent } from "@/lib/landing/content";

export function LandingPage({
  signedIn,
  closed,
  error,
  handle,
  noAgent,
  example,
}: {
  readonly signedIn: boolean;
  readonly closed?: boolean;
  readonly error?: string;
  readonly handle?: string;
  readonly noAgent?: boolean;
  readonly example?: LandingExample | null;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#landing-content"
        className="sr-only z-30 rounded-md bg-background p-3 text-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-4"
      >
        {landingContent.navigation.skipToContent}
      </a>
      <SiteHeader signedIn={signedIn} />
      <main
        id="landing-content"
        tabIndex={-1}
        className="mx-auto w-[min(90%,1800px)] flex-1 space-y-16 pb-20"
      >
        <Hero closed={closed} error={error} handle={handle} noAgent={noAgent} />
        <HowItWorks />
        {example ? <ExampleAgent example={example} /> : null}
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  );
}
