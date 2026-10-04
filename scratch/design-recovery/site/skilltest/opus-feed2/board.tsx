"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import type { FeedStory } from "@/next/data/feed";
import { beat, HANDLE } from "@/next/council/data";
import { Checking, NewFlag, useArrival } from "@/next/council/live";
import {
  AfterMount,
  AgentState,
  AlertsAction,
  Cover,
  EmptyKind,
  Evidence,
  FactsMore,
  feed,
  FreeWeek,
  GithubRelease,
  Img,
  inWeek,
  KindIndex,
  Preview,
  Publishers,
  showsGithub,
  storyMatches,
  StoryMeta,
  useThemeGuard,
  type KindKey,
} from "./shared";

// Direction B, Board (council gate, October 2: Grok's "Blotter" and Astra's "integrated board", both revisions
// of the builder's bento sketch). The whole screen is one lit tray, edge to edge, with the controls along its
// top edge: who, the sources, the agent's state, the alert action. On the tray lie paper sheets of unequal
// size: the newest story as the large lead sheet, open in full, and the rest of the week as slips that tuck
// onto one another in reading order, each shaped by its content. Earlier stories and the GitHub release lie
// along the bottom of the tray.

export function BoardFeed() {
  useThemeGuard();
  const [kind, setKind] = useState<KindKey>("all");
  const { pending } = useArrival();

  const shown = feed.filter((s) => storyMatches(s, kind));
  const week = shown.filter(inWeek);
  const earlier = shown.filter((s) => !inWeek(s));
  const [lead, ...rest] = week;
  // Reading order alternates between the middle and right columns, newest first.
  const mid = rest.filter((_, i) => i % 2 === 0 && i < 4).concat(rest.slice(4));
  const right = rest.filter((_, i) => i % 2 === 1 && i < 4);
  const gh = showsGithub(kind);
  const nothing = !shown.length && !gh;

  return (
    <div className="palette-council relative min-h-svh px-3 pt-3 pb-10 sm:px-5 sm:pt-5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[700px]" style={{ background: "var(--stage-light)" }} />

      <div
        className="relative mx-auto max-w-[1480px] rounded-[18px] border border-line-strong"
        style={{ background: "var(--stage-frame)", boxShadow: "var(--window-shadow), var(--top-light)" }}
      >
        {/* The tray's top edge: the person, the sources, the agent, the alert action. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-2.5 text-[13px] text-t1">
            <OparaxMark className="size-[18px]" />
            <span className="grid size-5 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">F</span>@{HANDLE}
            <FreeWeek compact className="ml-1" />
          </span>
          <KindIndex value={kind} onChange={setKind} marks={4} className="order-last w-full overflow-x-auto xl:order-none xl:mx-auto xl:w-auto" />
          <div className="ml-auto flex items-center gap-3 xl:ml-0">
            <AlertsAction />
            <ThemeToggle className="size-8 text-t3" />
          </div>
        </div>

        <div className="relative rounded-b-[18px] p-4 sm:p-5">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-b-[18px] opacity-60" style={{ backgroundImage: "var(--dot-grid)", backgroundSize: "18px 18px" }} />

          <div className="relative">
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="min-w-0 text-[13.5px] text-t2">
                <span className="mr-2 font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">Your beat</span>
                {beat}
              </p>
              <AgentState pending={pending} className="ml-auto" />
            </div>

            {nothing ? (
              <Sheet className="mx-auto max-w-[560px]">
                <EmptyKind kind={kind} />
              </Sheet>
            ) : (
              <>
                {lead ? (
                  <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
                    <Sheet className="lg:col-span-5" lifted>
                      <LeadSheet story={lead} fresh={lead === feed[0] && kind === "all"} />
                    </Sheet>
                    <div className="flex flex-col lg:col-span-4">
                      {mid.map((s, i) => (
                        <Slip key={s.id} story={s} index={i} shape={i % 2 === 0 ? "tall" : "wide"} />
                      ))}
                    </div>
                    <div className="flex flex-col lg:col-span-3">
                      {pending > 0 && kind === "all" ? (
                        <div className="mb-4 flex h-11 items-center rounded-[10px] border border-dashed border-[var(--caution)]/50 bg-[var(--caution-soft)] px-3.5">
                          <AfterMount>
                            <Checking pending={pending} compact />
                          </AfterMount>
                        </div>
                      ) : null}
                      {right.map((s, i) => (
                        <Slip key={s.id} story={s} index={i} shape="tall" />
                      ))}
                    </div>
                  </div>
                ) : null}

                {earlier.length || gh ? (
                  <section aria-label="Earlier" className={cn(lead && "mt-6")}>
                    <p className="mb-3 font-mono text-[10.5px] tracking-[0.08em] text-t4 uppercase">Earlier</p>
                    <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {earlier.map((s) => (
                        <Sheet key={s.id}>
                          <EarlierSheet story={s} />
                        </Sheet>
                      ))}
                      {gh ? (
                        <Sheet>
                          <div className="p-4">
                            <GithubRelease compact />
                          </div>
                        </Sheet>
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative mx-auto mt-3 flex max-w-[1480px] justify-end">
        <Preview />
      </div>
    </div>
  );
}

/** A sheet lying on the tray. The lead sheet uses the window lift; the others the card lift. */
function Sheet({ children, className, lifted = false }: { children: React.ReactNode; className?: string; lifted?: boolean }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[10px] border border-line-strong bg-[var(--window)]", className)}
      style={{ boxShadow: lifted ? "var(--window-shadow), var(--top-light)" : "var(--card-shadow), var(--top-light)" }}
    >
      {children}
    </div>
  );
}

function LeadSheet({ story, fresh }: { story: FeedStory; fresh: boolean }) {
  return (
    <article>
      {story.card.image ? (
        <div className="relative h-[250px] border-b border-line">
          <Img src={story.card.image} />
          {fresh ? <NewFlag className="absolute top-3 left-3" /> : null}
        </div>
      ) : null}
      <div className="p-5">
        <StoryMeta story={story} />
        <h2 className="mt-2.5 text-[26px] leading-[1.18] font-semibold tracking-[-0.025em] text-balance text-t1">{story.card.headline}</h2>
        <FactsMore story={story} first={story.card.facts.length} size="md" className="mt-3.5" />
        <Evidence story={story} cols={1} className="mt-5" />
        <Publishers story={story} className="mt-5 border-t border-line-soft pt-4" />
      </div>
    </article>
  );
}

/**
 * A slip: one story, shaped by what it carries. "tall" puts the picture on top; "wide" sets it beside the text.
 * Each slip after the first tucks its top edge onto the one above, the way papers lie on a desk.
 */
function Slip({ story, index, shape }: { story: FeedStory; index: number; shape: "tall" | "wide" }) {
  const joined = story.items.length > 1;
  const picture = story.card.image ? <Img src={story.card.image} /> : <Cover item={story.items[0]} />;
  return (
    <div className={cn("relative", index > 0 && "-mt-2.5")} style={{ zIndex: 10 + index }}>
      <Sheet className={cn( index % 2 === 1 && "lg:ml-5", index % 2 === 0 && index > 0 && "lg:mr-5")}>
        <article className="pb-6">
          {shape === "tall" ? (
            <div className="relative h-[136px] border-b border-line">
              {picture}
              {joined ? (
                <span className="absolute top-2.5 left-2.5 inline-flex h-[22px] items-center gap-1.5 rounded-full bg-black/55 px-2 text-[11px] font-medium text-white backdrop-blur-sm">
                  <Layers className="size-3" /> Joined from {story.items.length} sources
                </span>
              ) : null}
            </div>
          ) : null}
          <div className={cn("p-4", shape === "wide" && "grid grid-cols-[112px_1fr] gap-3.5")}>
            {shape === "wide" ? <div className="h-[84px] overflow-hidden rounded-[7px] border border-line">{picture}</div> : null}
            <div className="min-w-0">
              <StoryMeta story={story} />
              <h3 className="mt-2 text-[15.5px] leading-snug font-semibold tracking-[-0.01em] text-t1">{story.card.headline}</h3>
            </div>
          </div>
          <div className="px-4">
            <FactsMore story={story} first={joined ? 2 : 1} />
            <Publishers story={story} size={15} className="mt-3" />
          </div>
        </article>
      </Sheet>
    </div>
  );
}

function EarlierSheet({ story }: { story: FeedStory }) {
  return (
    <article className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[132px_1fr] sm:gap-4">
      <div className="h-[150px] overflow-hidden sm:h-[100px] rounded-[8px] border border-line">
        {story.card.image ? <Img src={story.card.image} /> : <Cover item={story.items[0]} />}
      </div>
      <div className="min-w-0">
        <StoryMeta story={story} />
        <h3 className="mt-1.5 text-[15.5px] leading-snug font-semibold tracking-[-0.01em] text-t1">{story.card.headline}</h3>
        <FactsMore story={story} first={2} className="mt-1.5" />
        <Publishers story={story} size={15} className="mt-3" />
      </div>
    </article>
  );
}
