// Custom composition: two labeled lanes (planned sources, planned destinations) funnel through the Oparax
// mark on one centered axis, with a separate works-today line. Authentic LogoTile artwork is never recolored.
"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { frame } from "../shared/shell";
import { LogoTile, OparaxMark } from "../shared/brand";
import { roadmap, type Channel } from "../content";
import { roadmapCopy } from "./content";
import { usePrefersReducedMotion } from "./reduced-motion";

function Lane({
  title,
  hint,
  channels,
  className,
  gridClass,
}: {
  title: string;
  hint: string;
  channels: Channel[];
  className?: string;
  gridClass: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-2xl border border-dashed border-border bg-card/60 px-4 py-5 desk:px-6", className)}
    >
      <header className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 text-center">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </header>
      <ul className={cn("mt-5 grid gap-x-2 gap-y-4", gridClass)}>
        {channels.map((channel) => (
          <li key={channel.label} className="flex flex-col items-center gap-2 text-center">
            <LogoTile channel={channel} size={48} />
            <span className="text-xs leading-tight text-muted-foreground">{channel.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Connector({ delay }: { delay: number }) {
  const reduce = usePrefersReducedMotion();
  return (
    <div aria-hidden="true" className="relative mx-auto h-10 w-px bg-border">
      <motion.span
        initial={reduce ? false : { scaleY: 0 }}
        animate={reduce ? { scaleY: 1 } : undefined}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.45, delay, ease: "easeOut" }}
        className="absolute inset-0 origin-top bg-primary"
      />
    </div>
  );
}

export function Roadmap() {
  return (
    <section id="roadmap" aria-labelledby="d4-roadmap-heading" className="border-t border-border">
      <div className={cn(frame, "py-16 desk:py-24")}>
        <header className="mx-auto max-w-2xl text-center">
          <h2 id="d4-roadmap-heading" className="text-3xl font-semibold tracking-tight desk:text-[40px] desk:leading-[1.1]">
            {roadmapCopy.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{roadmapCopy.intro}</p>
        </header>

        <div className="mx-auto mt-12 max-w-[1180px]">
          <Lane
            title={roadmap.inputsTitle}
            hint={roadmapCopy.sourcesHint}
            channels={roadmap.inputs}
            gridClass="grid-cols-4 desk:grid-cols-6 min-[1100px]:grid-cols-12"
          />
          <Connector delay={0.1} />
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-black text-white ring-1 ring-border shadow-[0_10px_30px_-12px_rgb(9_15_29/0.5)]">
            <OparaxMark className="size-9" />
            <span className="sr-only">Oparax</span>
          </div>
          <Connector delay={0.5} />
          <Lane
            title={roadmap.outputsTitle}
            hint={roadmapCopy.outputsHint}
            channels={roadmap.outputs}
            className="mx-auto max-w-[520px]"
            gridClass="grid-cols-4"
          />
        </div>

        <div className="mx-auto mt-10 flex max-w-[1180px] flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl bg-secondary/70 px-4 py-3 text-sm">
          <span className="font-semibold">{roadmap.today.label}</span>
          <span className="text-muted-foreground" aria-hidden="true">
            ·
          </span>
          {roadmap.today.inputs.map((channel) => (
            <span key={channel.label} className="flex items-center gap-1.5">
              <LogoTile channel={channel} size={24} className="rounded-md" />
              {channel.label}
            </span>
          ))}
          <ArrowRight className="size-4 text-muted-foreground" aria-label="to" />
          {roadmap.today.outputs.map((channel) => (
            <span key={channel.label} className="flex items-center gap-1.5">
              <LogoTile channel={channel} size={24} className="rounded-md" />
              {channel.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
