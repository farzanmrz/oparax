"use client";

// Custom composition (no Pro block): a directory-style panel in the workspace's language. Planned sources and
// planned destinations are two labeled rows of the shared LogoTile on one cell grid, so both read at the same
// scale; what works today sits above them as a separate, smaller line.
import { ArrowRight } from "lucide-react";
import { LogoTile } from "../shared/brand";
import { roadmap, type Channel } from "../content";
import { frame } from "../shared/shell";
import { roadmapCopy } from "./content";

function TileGrid({ channels, label }: { channels: Channel[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-4 gap-y-1 desk:grid-cols-6 min-[1200px]:grid-cols-12">
      {channels.map((channel) => (
        <li key={channel.id} className="flex flex-col items-center gap-2 px-1 py-3 text-center">
          <LogoTile channel={channel} size={48} />
          <span className="text-[13px] leading-tight text-foreground">{channel.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Group({ title, note, channels }: { title: string; note: string; channels: Channel[] }) {
  return (
    <div className="grid gap-4 px-5 py-6 desk:grid-cols-[220px_minmax(0,1fr)] desk:gap-8 desk:px-7">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{note}</p>
      </div>
      <TileGrid channels={channels} label={title} />
    </div>
  );
}

export function Roadmap() {
  const { today } = roadmap;
  return (
    <section id="roadmap" className="border-t border-border py-16 desk:py-24">
      <div className={frame}>
        <h2 className="text-3xl font-semibold tracking-tight desk:text-4xl">{roadmap.title}</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{roadmap.intro}</p>

        <p className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{today.label}:</span>
          {today.inputs.map((channel) => (
            <span key={channel.label} className="inline-flex items-center gap-1.5">
              <LogoTile channel={channel} size={24} />
              {channel.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-2.5">
            <ArrowRight className="size-4" aria-label={roadmapCopy.deliveredTo} />
            {today.outputs.map((channel) => (
              <span key={channel.label} className="inline-flex items-center gap-1.5">
                <LogoTile channel={channel} size={24} />
                {channel.label}
              </span>
            ))}
          </span>
        </p>

        <div className="mt-5 divide-y divide-border overflow-hidden rounded-[calc(var(--radius)+8px)] border border-border bg-card">
          <Group
            title={roadmap.inputsTitle}
            note={roadmapCopy.inputsNote}
            channels={roadmap.inputs}
          />
          <Group
            title={roadmap.outputsTitle}
            note={roadmapCopy.outputsNote}
            channels={roadmap.outputs}
          />
        </div>
      </div>
    </section>
  );
}
