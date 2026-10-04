// Adapted from React Bits Pro social-proof-1 (https://pro.reactbits.dev/docs/blocks/social-proof/social-proof-1). Changes: kept only the bordered-cell logo grid; "Trusted by" framing and mock company logos replaced by two labeled grids (planned sources, planned destinations) of authentic LogoTile marks with names; brightness-0/opacity/invert silhouette treatment removed so official colors stay intact; an Oparax node joins the two grids; a separate works-today line; neutral colors swapped for semantic tokens; frame from DESIGN.md; entrance fade removed so the grids are static (the page's one motion moment is the hero wire).
"use client";

import { cn } from "@/lib/utils";
import { LogoTile, OparaxMark } from "../../shared/brand";
import { frame } from "../../shared/shell";
import { roadmap, type Channel } from "../../content";
import { SectionHeading } from "../modes";
import { roadmapCopy } from "../content";

function LogoGrid({ channels, className }: { channels: readonly Channel[]; className?: string }) {
  return (
    <ul className={cn("grid gap-px overflow-hidden rounded-xl border border-border bg-border", className)}>
      {channels.map((channel) => (
        <li
          key={channel.id}
          className="flex flex-col items-center justify-center gap-2.5 bg-card px-2 py-6"
        >
          <LogoTile channel={channel} size={44} />
          <span className="text-center text-sm">{channel.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Today() {
  const { today } = roadmap;
  const item = (channel: Channel) => (
    <span key={channel.id + channel.label} className="inline-flex items-center gap-1.5">
      <LogoTile channel={channel} size={26} className="rounded-[7px]" />
      <span className="font-medium text-foreground">{channel.label}</span>
    </span>
  );
  return (
    <p className="mx-auto mt-6 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">{today.label}:</span>
      <span>{roadmapCopy.todayInputs}</span>
      {today.inputs.map(item)}
      <span>{roadmapCopy.todayOutputs}</span>
      {today.outputs.map(item)}
    </p>
  );
}

export function SocialProof1() {
  return (
    <section id="roadmap" aria-labelledby="d3-roadmap" className="border-t border-border bg-secondary/40 py-16 desk:py-24">
      <div className={frame}>
        <SectionHeading id="d3-roadmap" title={roadmap.title} intro={roadmap.intro} />
        <Today />
        <div className="mt-12 grid gap-x-4 gap-y-3 desk:grid-cols-[minmax(0,6fr)_auto_minmax(0,2fr)]">
          <h3 className="text-base font-semibold desk:col-start-1 desk:row-start-1">{roadmap.inputsTitle}</h3>
          <LogoGrid
            channels={roadmap.inputs}
            className="grid-cols-3 desk:col-start-1 desk:row-start-2 min-[1000px]:grid-cols-6"
          />
          <div
            aria-hidden="true"
            className="flex items-center justify-center py-3 desk:col-start-2 desk:row-start-2 desk:py-0"
          >
            <span className="h-px w-5 bg-primary/50 max-desk:hidden" />
            <span className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[0_0_0_6px_color-mix(in_oklch,var(--primary),transparent_88%)]">
              <OparaxMark className="size-6" />
            </span>
            <span className="h-px w-5 bg-primary/50 max-desk:hidden" />
          </div>
          <h3 className="text-base font-semibold max-desk:mt-2 desk:col-start-3 desk:row-start-1">
            {roadmap.outputsTitle}
          </h3>
          <LogoGrid channels={roadmap.outputs} className="grid-cols-4 desk:col-start-3 desk:row-start-2 desk:grid-cols-2" />
        </div>
      </div>
    </section>
  );
}

export default SocialProof1;
