import { readParams, SiteFooter, SiteHeader, type SearchParams } from "@/next/frame";
import { Hero } from "@/next/landing/hero";
import { HowItWorks } from "@/next/landing/how-it-works";
import { Roadmap } from "@/next/landing/roadmap";
import { Pricing } from "@/next/landing/pricing";

// Rough landing (LOCKED-PLAN scope): hero, How It Works, roadmap, pricing. No About, blog or timeline.
// ?settled=1 renders the hero in its end state, for timing-independent screenshots.
export default async function LandingPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader variant="landing" />
      <main className="flex-1">
        <Hero settled={param("settled") === "1"} />
        <HowItWorks />
        <Roadmap />
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  );
}
