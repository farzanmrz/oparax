"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { alerts } from "@/next/copy";
import { cn } from "@/lib/utils";
import { AlertsButton, AlertsPreviewNote, AppFrame, BASE, Label, PrimaryButton, ShowProvider, TopBar, useShow } from "./chrome";
import { beat, brief, groups, sources, status, type Group, type Source } from "./data";
import { Dot, GroupGlyph, Segments, SourceMark } from "./marks";

// Window ready, v2. What the agent chose, readable in full: every source with its reason, grouped by what it is,
// GitHub and Product Hunt in the same list as the other sources (switched on here, as the product does after
// setup), then the brief, the free week and alerts, and one way into the feed.

export function Ready() {
  return (
    <ShowProvider>
      <div className="palette-council flex min-h-svh flex-col">
        <AppFrame
          bar={<TopBar />}
          grid
          className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]"
          heading={
            <>
              <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">Your agent is ready</h1>
              <p className="mt-2.5 text-[13.5px] text-t3">
                It chose these sources for “{beat}”. Each new post, article and release from them is checked against that sentence.
              </p>
            </>
          }
          side={
            <>
              <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--ok)]">
                <Dot tone="ok" pulse /> Live
              </p>
              <PrimaryButton href={`${BASE}/feed`} className="h-10 shrink-0 px-5">
                Open your feed <ArrowRight className="size-4" />
              </PrimaryButton>
            </>
          }
        >
              <section aria-label="Chosen sources" className="min-w-0 lg:border-r border-line">
                <div className="flex h-12 items-center gap-3 border-b border-line px-6">
                  <span className="text-[13px] font-semibold text-t1">Chosen sources</span>
                  <span className="text-[12.5px] text-t3">with the reason for each</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <Board groups={["x", "github", "producthunt"]} className="sm:border-r border-line" />
                  <Board groups={["rss", "website"]} />
                </div>
              </section>
              <aside aria-label="Your agent" className="bg-[var(--rail)]">
                <div className="border-b border-line px-5 py-5">
                  <Label>Your brief</Label>
                  <p className="mt-2.5 text-[13px] leading-[1.6] text-t2">{brief.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {brief.interests.map((t) => (
                      <span key={t} className="rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 py-0.5 text-[11.5px] text-t1">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="border-b border-line px-5 py-5">
                  <Label>Free week</Label>
                  <p className="mt-2 text-[13.5px] text-t1">
                    <span className="font-semibold tabular-nums">{status.daysLeft}</span> days and <span className="font-semibold tabular-nums">{status.poolLimit}</span> watched Twitter posts
                  </p>
                  <div className="mt-2.5">
                    <Segments total={status.trialDays} filled={status.daysLeft} />
                  </div>
                  <p className="mt-2 text-[12.5px] text-t3">Started now. Plans from $5 a month after it ends.</p>
                </div>
                <div className="px-5 py-5">
                  <Label>Alerts on Twitter</Label>
                  <p className="mt-2 flex items-center gap-2 text-[13px] text-t2">
                    <Dot tone="idle" /> Not connected
                  </p>
                  <AlertsButton full className="mt-3 h-9" />
                  <p className="mt-3 text-[12.5px] leading-[1.55] text-t3">{alerts.explain}</p>
                  <AlertsPreviewNote className="mt-2 border-t border-line pt-2" />
                </div>
              </aside>
        </AppFrame>
      </div>
    </ShowProvider>
  );
}

function Board({ groups: gs, className }: { groups: Group[]; className?: string }) {
  return (
    <div className={cn("min-w-0 px-5 pt-5 pb-6", className)}>
      {gs.map((g, i) => (
        <section key={g} className={cn(i > 0 && "mt-6")}>
          <div className="flex items-center gap-2 px-1">
            <GroupGlyph group={g} className="text-t2" />
            <Label className="text-t2">{groups.find((x) => x.id === g)!.label}</Label>
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {sources
              .filter((s) => s.group === g)
              .map((s) => (g === "github" || g === "producthunt" ? <Switched key={s.id} source={s} /> : <Chosen key={s.id} source={s} />))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Chosen({ source }: { source: Source }) {
  const { show } = useShow();
  return (
    <li className="flex items-start gap-3 rounded-lg border border-line bg-[var(--raised)] px-3 py-2.5 shadow-[var(--top-light)]">
      <SourceMark source={source} size={22} className="mt-0.5" />
      <div className="min-w-0">
        <p className="text-[13px] leading-tight font-medium text-t1">{show === "name" ? source.name : source.handle}</p>
        <p className="mt-1 text-[12.5px] leading-[1.5] text-t2">{source.why}</p>
      </div>
    </li>
  );
}

/** GitHub and Product Hunt sit in the same list; the product switches them on after setup, so they keep a switch. */
function Switched({ source }: { source: Source }) {
  const [on, setOn] = useState(true);
  const { show } = useShow();
  const line = source.group === "github" ? "Each release, explained in plain words" : "Daily launches, checked against your sentence like every other source";
  return (
    <li>
      <label className="flex items-start gap-3 rounded-lg border border-line bg-[var(--raised)] px-3 py-2.5 shadow-[var(--top-light)]">
        <SourceMark source={source} size={22} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-tight font-medium text-t1">{show === "name" ? source.name : source.handle}</span>
          <span className="mt-1 block text-[12.5px] leading-[1.5] text-t2">{line}</span>
        </span>
        <Switch checked={on} onCheckedChange={setOn} aria-label={`Watch ${source.name}`} className="mt-1" />
      </label>
    </li>
  );
}
