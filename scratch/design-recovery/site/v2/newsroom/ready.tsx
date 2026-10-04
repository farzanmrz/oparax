"use client";

import { CalendarDays, Gauge } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { beat, brief, droppedSample, groupLabel, HANDLE, sources, status, type Group, type Source } from "./data";
import { AlertsButton, Lifted, Masthead, Mono, Page, primaryClass, SAMPLE_NOTE, StatusTile } from "./chrome";
import { LiveLine } from "./live";
import { Dot, GroupGlyph, Segments, SiteIcon, SourceMark, XAvatar } from "./marks";
import Link from "next/link";

// Newsroom ready: what the agent chose, as the lifted table window grouped under X ACCOUNTS, RSS FEEDS and
// WEBSITES, each row with its reason; the brief and the free week beside it; then into the feed. The live
// row says the first check is running. Everything is the recorded run's answer.

const READY_GROUPS: Group[] = ["x", "rss", "website", "github"];
const COLS = "grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]";

export function Ready({ theme }: { theme?: string }) {
  const q = theme ? `?theme=${theme}` : "";
  const chosen = sources;
  const picked = sources.filter((s) => s.group !== "github").length;
  return (
    <Page>
      <Masthead title="Your agent is ready" note={SAMPLE_NOTE} />
      <main className="px-4 pt-4 pb-14 lg:px-7">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-start gap-3.5">
            <div>
              <p className="text-[13.5px] text-t3">
                {picked} sources chosen for <span className="text-t1">“{beat}”</span>, plus one GitHub repository
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-lg border border-line bg-[var(--ok-soft)]">
              <StatusMark status="done" size={22} color="var(--ok)" doneColor="var(--ok)" strokeWidth={2} />
            </span>
            <AlertsButton className="h-9 border border-transparent bg-[var(--window)] text-t1 shadow-[0_0_0_1px_var(--line-strong)] hover:brightness-100 [&_svg]:text-[var(--kind-post)]" />
            <Link href={`/v2/newsroom/feed${q}`} className={cn(primaryClass)}>
              Open your feed
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Lifted strong className="rounded-[14px]">
            <div
              className={cn("grid h-10 items-center gap-5 border-b border-line px-4 font-mono text-[10.5px] tracking-[0.08em] text-t3", COLS)}
              style={{ background: "linear-gradient(180deg, var(--raised), var(--window))" }}
            >
              <span>SOURCE</span>
              <span>WHY IT IS ON YOUR LIST</span>
            </div>
            <div className="flex h-11 items-center gap-4 border-b border-line bg-[var(--caution-soft)]/60 px-4">
              <span className="w-10 font-mono text-[10.5px] tracking-[0.08em] text-[var(--caution)]">LIVE</span>
              <LiveLine label="Checking your sources for the first time" />
            </div>
            {READY_GROUPS.map((g) => (
              <section key={g} aria-label={groupLabel[g]}>
                <p className="flex items-center gap-1.5 border-b border-line-soft bg-[var(--raised)]/50 px-4 py-1.5 font-mono text-[10px] tracking-[0.1em] text-t3">
                  <GroupGlyph group={g} className="size-2.5" /> {groupLabel[g]}
                </p>
                {chosen
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <ChosenRow key={s.id} source={s} />
                  ))}
              </section>
            ))}
            <div className="border-t border-line bg-[var(--raised)]/40 px-4 py-3">
              <p className="font-mono text-[10px] tracking-[0.08em] text-t3">READ AND LEFT OUT, A FEW OF THEM</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {droppedSample.slice(0, 8).map((d) => (
                  <span key={d.id} className="inline-flex h-6 items-center gap-1.5 rounded-md border border-line px-2 text-[12px] text-t3">
                    {d.kind === "x_account" ? <XAvatar handle={d.target.replace("https://x.com/", "")} size={14} /> : <SiteIcon host={new URL(d.target).hostname} size={14} />}
                    {d.focus ? `${d.name}, ${d.focus}` : d.name}
                  </span>
                ))}
              </div>
            </div>
          </Lifted>

          <aside className="space-y-3">
            <Lifted className="p-4">
              <Mono>YOUR BRIEF</Mono>
              <p className="mt-2 text-[13px] leading-[1.55] text-t1">{brief.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {brief.interests.map((x) => (
                  <span key={x} className="rounded-md border border-line px-2 py-0.5 text-[12px] text-t2">
                    {x}
                  </span>
                ))}
              </div>
            </Lifted>
            <section className="rounded-xl border border-line bg-[var(--window)] p-4" style={{ boxShadow: "var(--top-light)" }}>
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t3">
                  <CalendarDays className="size-3" /> FREE WEEK
                </p>
                <span className="text-[12.5px] text-t1">
                  <span className="font-semibold tabular-nums">{status.daysLeft}</span> days, starting now
                </span>
              </div>
              <div className="mt-2.5">
                <Segments total={status.trialDays} filled={status.daysLeft} />
              </div>
              <div className="mt-3.5 flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-t3">
                  <Gauge className="size-3" /> WATCHED X POSTS
                </p>
                <span className="text-[12.5px] tabular-nums text-t1">
                  {status.poolUsed} <span className="text-t3">of {status.poolLimit}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-line-strong" />
            </section>
            <StatusTile label="ALERTS ON X" icon={<XLogo className="size-4" />}>
              <span className="flex items-center gap-2">
                <Dot tone="idle" /> Not connected
              </span>
              <span className="mt-0.5 block text-[12px] text-t3">Send one message from @{HANDLE} to turn them on.</span>
            </StatusTile>
          </aside>
        </div>
      </main>
    </Page>
  );
}

function ChosenRow({ source }: { source: Source }) {
  return (
    <div className={cn("grid items-start gap-5 border-b border-line-soft px-4 py-3", COLS)}>
      <div className="flex min-w-0 items-start gap-2.5">
        <SourceMark source={source} size={24} className="mt-0.5" />
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-t1">
            {source.name} <span className="ml-1 font-mono text-[11px] font-normal break-all text-t3">{source.handle}</span>
          </p>
          {source.focus ? <p className="mt-0.5 text-[12.5px] text-t2">{source.focus}</p> : null}
        </div>
      </div>
      <p className="text-[13.5px] leading-[1.5] text-t1">
        {source.why ?? "Added for this preview so its releases reach your feed. The sample build did not check GitHub repositories."}
      </p>
    </div>
  );
}
