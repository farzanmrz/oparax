import { Atmosphere } from "@/components/landing/atmosphere";
import { LandingCta } from "@/components/landing/landing-cta";
import { Delivered } from "@/components/landing/scene/delivered";
import { EnginePanel } from "@/components/landing/scene/engine-panel";
import { Scene } from "@/components/landing/scene/scene";
import { SourceStack } from "@/components/landing/scene/source-stack";
import { landingContent } from "@/lib/landing/content";
import type { LandingEntrance } from "./landing-page";

export function Hero({ entrance }: { entrance: LandingEntrance }) {
  const copy = landingContent.hero;
  return (
    <section
      id="product"
      aria-labelledby="landing-title"
      className="relative isolate pt-10 desk:pt-16"
    >
      <Atmosphere />
      <div className="relative mx-auto max-w-4xl text-center">
        <h1
          id="landing-title"
          className="font-heading text-[36px] leading-tight font-semibold tracking-tight text-balance desk:text-[56px]"
        >
          {copy.headline}
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg text-muted-foreground">{copy.description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {entrance.kind === "signed_out" ? (
            <>
              <LandingCta cta="sign_up" placement="hero" />
              <LandingCta cta="log_in" placement="hero" />
            </>
          ) : entrance.kind === "setup" ? (
            <LandingCta cta="setup" placement="hero" />
          ) : (
            <LandingCta cta="open_agent" placement="hero" handle={entrance.handle} />
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{copy.trial}</p>
      </div>
      <div className="relative mt-10">
        <Scene sources={<SourceStack />} engine={<EnginePanel />} delivered={<Delivered />} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {landingContent.scene.caption}
        </p>
      </div>
    </section>
  );
}
