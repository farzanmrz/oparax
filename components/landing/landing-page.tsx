import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";

export function LandingPage({ signedIn }: { readonly signedIn: boolean }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <LandingHeader signedIn={signedIn} />
      <main>
        <LandingHero signedIn={signedIn} />
      </main>
      <LandingFooter />
    </div>
  );
}
