"use client";

import { ArrowRight } from "lucide-react";
import { alerts } from "@/next/copy";
import { brief } from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { AlertsButton, BASE, Header, lift, liftStyle, PrimaryLink, Stage, Tile } from "./chrome";
import { sources, status, stories, type Group } from "./data";
import { GroupGlyph, GroupLabel, Segments, SourceMark } from "./marks";
import { StoryCard, StoryStack } from "./stack";

// Deck v2 ready: what the agent chose, each source with its reason under its group header, and the first stories
// waiting in the feed as a stack, then into the feed. Tiles carry what the person needs next: the free week that
// just started and alerts on Twitter, which are not connected yet.

const groupsHere: { id: Group; label: string }[] = [
  { id: "x", label: "Twitter accounts" },
  { id: "rss", label: "RSS feeds" },
  { id: "website", label: "Websites" },
];

export function DeckReady() {
  const lead = stories.clustered[3];
  const next = [stories.clustered[0]];
  return (
    <Stage light={620}>
      <main className="relative mx-auto w-full max-w-[1400px] px-4 pt-8 pb-20 lg:px-8">
        <Header
          title="Your agent is ready"
          actions={
            <PrimaryLink href={`${BASE}/feed`} size="lg">
              Open your feed <ArrowRight className="size-4" aria-hidden="true" />
            </PrimaryLink>
          }
          sub={<p className="text-[14px] text-t2">These are the sources it watches for you, each with the reason it was chosen.</p>}
          note="Illustrative example run and preview stories, not your agent."
        />

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <Tile label="Free week, started now">
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[22px] leading-none font-semibold tabular-nums text-t1">{status.daysLeft}</span>
              <span className="text-[13px] text-t2">days left</span>
              <span className="ml-auto text-[12px] tabular-nums text-t3">{status.poolLimit} watched Twitter posts</span>
            </p>
            <div className="mt-3">
              <Segments total={status.trialDays} filled={status.daysLeft} />
            </div>
            <p className="mt-3 text-[12px] text-t3">Plans from $5 a month when the week ends.</p>
          </Tile>
          <Tile label="Alerts on Twitter">
            <div className="mt-1.5 flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[13px] text-t2">
                <span className="size-2 rounded-full border border-t3" aria-hidden="true" /> Not connected
              </span>
              <AlertsButton className="ml-auto" />
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-t3">{alerts.explain}</p>
          </Tile>
          <Tile label="Your brief">
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brief.interests.map((t) => (
                <span key={t} className="rounded-full border border-line bg-[var(--well)] px-2.5 py-0.5 text-[12px] text-t2">
                  {t}
                </span>
              ))}
            </div>
          </Tile>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div className="grid gap-6">
              <Group id="x" label="Twitter accounts" />
              <Group id="website" label="Websites" />
              <Group id="github" label="GitHub" />
            </div>
            <Group id="rss" label="RSS feeds" />
          </div>

          <div>
            <p className="mb-3 flex items-center justify-between text-[12.5px] text-t3">
              <span className="font-medium text-t2">First in your feed</span>
              <span>Preview stories</span>
            </p>
            <StoryStack story={lead} imageHeight={168} />
            <div className="mt-5 grid gap-5">
              {next.map((s) => (
                <StoryCard key={s.id} story={s} imageHeight={140} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </Stage>
  );
}

function Group({ id, label }: { id: Group; label: string }) {
  const members = sources.filter((s) => s.group === id);
  return (
    <section className={cn(lift, "p-2")} style={liftStyle}>
      <GroupLabel glyph={<GroupGlyph group={id} />} count={members.length} className="px-3 pt-2.5 pb-1.5">
        {label}
      </GroupLabel>
      <ul>
        {members.map((s) => (
          <li key={s.id} className="flex gap-3 rounded-lg px-3 py-2.5">
            <SourceMark source={s} size={28} className={cn("mt-0.5", s.group === "x" ? "" : "rounded-[7px]")} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[14px] font-semibold text-t1">{s.name}</span>
                <span className="text-[12px] text-t3">{s.group === "x" ? s.handle : s.focus}</span>
              </p>
              {s.why ? (
                <p className="mt-0.5 text-[13px] leading-snug text-t2">{s.why}</p>
              ) : (
                <p className="mt-0.5 text-[12.5px] leading-snug text-t3">In this preview&apos;s feed; not chosen by the example run.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { groupsHere };
