import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";

export function LandingPage({ signedIn }: { readonly signedIn: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <LandingHeader signedIn={signedIn} />
      <main className="flex-1">
        <LandingHero signedIn={signedIn} />
      </main>
      <LandingFooter />
    </div>
  );
}
