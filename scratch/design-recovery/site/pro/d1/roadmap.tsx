"use client";

// Roadmap: two equal static banks of official logo tiles, planned sources and planned destinations,
// with the Oparax mark between them. What works today sits apart, below, so it never reads as planned.
import { ArrowDown, ArrowRight, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LogoTile, OparaxMark } from "../shared/brand";
import { frame } from "../shared/shell";
import { roadmap, type Channel } from "../content";
import { roadmapCopy } from "./content";

function Bank({ title, items, large }: { title: string; items: Channel[]; large?: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6 text-card-foreground desk:p-7">
      <div className="flex items-center gap-2.5">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <Badge variant="outline" className="text-muted-foreground">
          {roadmap.planned}
        </Badge>
      </div>
      <ul
        className={cn(
          "my-auto grid gap-x-3 gap-y-5 pt-6",
          large ? "mx-auto w-full max-w-72 grid-cols-2 gap-y-7" : "grid-cols-3 desk:grid-cols-4",
        )}
      >
        {items.map((item) => (
          <li key={item.label} className="flex flex-col items-center gap-2 text-center">
            <LogoTile channel={item} size={large ? 64 : 48} />
            <span className="text-xs leading-tight text-muted-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Hub() {
  const line = "bg-gradient-to-r from-transparent via-primary/50 to-transparent";
  return (
    <div className="flex items-center justify-center gap-2 lg:flex-col lg:justify-center" aria-hidden="true">
      <span className={cn("h-px w-10 max-lg:hidden", line)} />
      <ArrowDown className="size-4 text-primary lg:hidden" />
      <span className="grid size-16 place-items-center rounded-[22%] border border-border bg-card text-foreground shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--primary)_55%,transparent)]">
        <OparaxMark className="size-8" />
      </span>
      <ArrowDown className="size-4 text-primary lg:hidden" />
      <span className={cn("h-px w-10 max-lg:hidden", line)} />
    </div>
  );
}

export function Roadmap() {
  return (
    <section id="roadmap" aria-labelledby="d1-roadmap-title" className="py-16 desk:py-20">
      <div className={frame}>
        <div className="max-w-2xl">
          <h2 id="d1-roadmap-title" className="text-3xl font-semibold tracking-tight text-balance desk:text-4xl">
            {roadmap.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground desk:text-lg">{roadmap.intro}</p>
        </div>

        <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-5">
          <Bank title={roadmap.inputsTitle} items={roadmap.inputs} />
          <div className="relative flex items-center justify-center lg:flex-col">
            <span className="sr-only">{roadmapCopy.hub}</span>
            <Hub />
          </div>
          <Bank title={roadmap.outputsTitle} items={roadmap.outputs} large />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border pt-6 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
            <CircleCheck className="size-4 text-primary" aria-hidden="true" />
            {roadmapCopy.todayLead}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {roadmap.today.inputs.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2 pr-1">
                <LogoTile channel={item} size={28} />
                {item.label}
              </span>
            ))}
            <ArrowRight className="size-4 text-primary" aria-label="to" />
            {roadmap.today.outputs.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2">
                <LogoTile channel={item} size={28} />
                {item.label}
              </span>
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
