"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { type LandingCtaName, type LandingCtaPlacement, landingCtas } from "@/lib/landing/content";

type Props =
  | { cta: Exclude<LandingCtaName, "open_agent">; placement: LandingCtaPlacement }
  | { cta: "open_agent"; placement: LandingCtaPlacement; handle: string };

export function LandingCta(props: Props) {
  const { cta, placement } = props;
  const label = landingCtas[cta].label;
  const destination =
    props.cta === "open_agent" ? `/${props.handle}` : landingCtas[props.cta].destination;
  const variant = cta === "log_in" ? "ghost" : "default";

  function captureActivation() {
    try {
      posthog.capture("landing_cta_clicked", { cta, placement, destination });
    } catch {
      // Link navigation remains available when analytics cannot capture an event.
    }
  }

  return (
    <Button
      asChild
      variant={variant}
      className={
        placement === "header"
          ? "h-11 min-w-11 px-2 desk:h-8 desk:px-3"
          : "h-11 min-w-11 w-full px-[18px] text-[15px] desk:h-10 desk:w-auto"
      }
    >
      <Link href={destination} onClick={captureActivation}>
        {label}
      </Link>
    </Button>
  );
}
