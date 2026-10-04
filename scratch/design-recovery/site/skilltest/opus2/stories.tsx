"use client";

import { Check, GitMerge, Layers, MessageCircleOff, Send } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { KindChip, SiteIcon } from "@/next/council/marks";
import { Head } from "./atoms";
import { agentStory, clock, hostOf, maiStory, mistralStory, olmoStory, reportCount, solStory, storyCount, when, type ItemView } from "./data";

// Screen 3: how reports become one story. The two source pages with the exact spans the facts rest on,
// the story card those spans produced (lifted), and the story's own log under the product's join rules.

const story = solStory;
const ordered = [...story.items].sort((a, b) => (a.published_at < b.published_at ? -1 : 1));

function spansFor(item: ItemView) {
  const out: { n: number; span: string }[] = [];
  story.card.facts.forEach((f, i) => f.evidence.filter((e) => e.item === item.id).forEach((e) => out.push({ n: i + 1, span: e.span })));
  return out;
}

export function Stories() {
  return (
    <section id="stories" className="stage h-[900px] border-t border-line pt-[88px]">
      <div className="mx-auto max-w-[1360px] px-8">
        <Head
          title="Many reports, one story, every line cited"
          line="Reports of the same event within 72 hours join one card. Each fact keeps the exact words it came from."
        >
          <MergeCount />
        </Head>

        <div className="mt-7 grid grid-cols-[372px_1fr_316px] gap-5">
          <div className="flex flex-col gap-4">
            {ordered.map((item) => (
              <SourcePage key={item.id} item={item} />
            ))}
          </div>

          <article className="lift self-start overflow-hidden">
            <div className="flex h-11 items-center gap-2 border-b border-line px-5 text-[12.5px] text-t3">
              <Layers className="size-3.5 text-[var(--brand)]" />
              Story
              <span className="text-t4">/</span>
              <span className="font-mono text-[11.5px] text-t2">oparax.ai/farzanmrz/{story.id}</span>
            </div>
            <div className="px-6 pb-5 pt-4">
              <div className="flex items-center gap-2">
                <KindChip kind="article" count={story.items.length} />
                <span className="ml-auto font-mono text-[11px] text-t4">updated {when(ordered[ordered.length - 1].published_at)}</span>
              </div>
              <h3 className="mt-3 text-[22px] font-semibold leading-[1.22] tracking-[-0.01em] text-t1">{story.card.headline}</h3>
              <ol className="mt-4 space-y-3">
                {story.card.facts.map((f, i) => {
                  const cited = [...new Set(f.evidence.map((e) => e.item))].map((id) => story.items.find((x) => x.id === id)!);
                  return (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-[var(--kind-article-soft)] font-mono text-[10.5px] font-semibold text-[var(--kind-article)]">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] leading-[1.5] text-t1">{f.text}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {cited.map((c) => (
                            <span key={c.id} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-raised px-1.5 py-0.5 text-[11px] text-t3">
                              <SiteIcon host={hostOf(c.url)} size={11} />
                              {c.publisher}
                            </span>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </article>

          <div className="flex flex-col gap-4">
            <StoryLog />
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Fit line", "0.5", "var(--ok)"],
                ["Join line", "0.75", "var(--brand)"],
                ["Window", "72 h", "var(--caution)"],
              ].map(([k, v, c]) => (
                <div key={k} className="tile px-3 py-2.5">
                  <p className="text-[11px] text-t3">{k}</p>
                  <p className="mt-0.5 font-mono text-[16px] font-semibold text-t1">{v}</p>
                  <span className="mt-1.5 block h-[3px] w-6 rounded-full" style={{ background: c }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-4">
          {[olmoStory, maiStory, agentStory, mistralStory].map((st) => {
            const it = st.items[0];
            return (
              <div key={st.id} className="tile flex gap-3 overflow-hidden p-2.5 pr-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={st.card.image!} alt="" className="h-[68px] w-[96px] shrink-0 rounded-md bg-raised object-cover" />
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[11.5px] text-t3">
                    <SiteIcon host={hostOf(it.url)} size={12} />
                    {it.publisher}
                    <span className="ml-auto font-mono text-[10px] text-t4">{when(it.published_at, false)}</span>
                  </span>
                  <p className="mt-1 line-clamp-2 text-[12.5px] font-medium leading-[1.35] text-t1">{st.card.headline}</p>
                  <span className="mt-1 block text-[11px] text-t3">{st.card.facts.length} facts, 1 report</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SourcePage({ item }: { item: ItemView }) {
  const spans = spansFor(item);
  return (
    <div className="tile overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <SiteIcon host={hostOf(item.url)} size={16} />
        <span className="text-[13px] font-medium text-t1">{item.publisher}</span>
        <span className="truncate text-[12px] text-t4">{hostOf(item.url)}</span>
        <span className="ml-auto shrink-0 font-mono text-[10.5px] text-t4">
          {when(item.published_at, false)} {clock(item.published_at)}
        </span>
      </div>
      <div className="flex gap-3 px-4 pt-3">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-[52px] w-[78px] shrink-0 rounded-md object-cover" />
        ) : null}
        <p className="line-clamp-3 text-[13px] font-medium leading-[1.4] text-t1">{item.title}</p>
      </div>
      <ul className="space-y-2 px-4 pb-3.5 pt-3">
        {spans.map((s, i) => (
          <li key={i} className="flex gap-2 text-[12.5px] leading-[1.55] text-t2">
            <span className="mt-[3px] grid size-4 shrink-0 place-items-center rounded-[4px] bg-[var(--kind-article-soft)] font-mono text-[9.5px] font-semibold text-[var(--kind-article)]">
              {s.n}
            </span>
            <span>
              <mark className="ev">{s.span.replace(/^["“]|["”]$/g, "")}</mark>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StoryLog() {
  const [first, second] = ordered;
  const rows = [
    { t: first.published_at, icon: <Check className="size-3" />, color: "var(--ok)", text: `${first.publisher} report fits your sentence` },
    { t: first.published_at, icon: <Layers className="size-3" />, color: "var(--brand)", text: "New story with 3 facts" },
    { t: first.published_at, icon: <Send className="size-3" />, color: "var(--kind-post)", text: "Goes out in your next alert", x: true },
    { t: second.published_at, icon: <Check className="size-3" />, color: "var(--ok)", text: `${second.publisher} report fits your sentence` },
    { t: second.published_at, icon: <GitMerge className="size-3" />, color: "var(--brand)", text: "Same event: joins the story, 5 facts" },
    { t: second.published_at, icon: <MessageCircleOff className="size-3" />, color: "var(--t3)", text: "No second DM for this story" },
  ];
  return (
    <div className="tile overflow-hidden">
      <div className="flex h-10 items-center justify-between border-b border-line px-4">
        <span className="text-[13px] font-medium text-t1">Story log</span>
        <span className="font-mono text-[10.5px] text-t4">replay, UTC</span>
      </div>
      <ol className="relative px-4 py-3">
        <span className="absolute bottom-5 left-[25px] top-5 w-px bg-line-strong" aria-hidden="true" />
        {rows.map((r, i) => (
          <li key={i} className="relative flex items-start gap-3 py-[7px]">
            <span className="relative z-10 grid size-[19px] shrink-0 place-items-center rounded-full border border-line bg-[var(--tile-bg)]" style={{ color: r.color }}>
              {r.icon}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[12.5px] leading-[1.4] text-t1">
                {r.text}
                {r.x ? <XLogo className="size-2.5 text-t3" /> : null}
              </p>
              <p className="font-mono text-[10.5px] text-t4">
                {when(r.t, false)} {clock(r.t)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MergeCount() {
  return (
    <div className="tile flex items-center gap-4 px-4 py-3">
      <div>
        <p className="text-[11px] text-t3">Reports</p>
        <p className="text-[20px] font-semibold tabular-nums leading-tight text-t1">{reportCount}</p>
      </div>
      <div className="flex flex-col gap-1" aria-hidden="true">
        <span className="flex gap-[3px]">
          {Array.from({ length: reportCount }, (_, i) => (
            <span key={i} className="size-2 rounded-[2px] bg-[var(--kind-article)]" />
          ))}
        </span>
        <span className="flex gap-[3px]">
          {Array.from({ length: storyCount }, (_, i) => (
            <span key={i} className="h-2 rounded-[2px] bg-[var(--brand)]" style={{ width: i < reportCount - storyCount ? 19 : 8 }} />
          ))}
        </span>
      </div>
      <div>
        <p className="text-[11px] text-t3">Stories</p>
        <p className="text-[20px] font-semibold tabular-nums leading-tight text-t1">{storyCount}</p>
      </div>
    </div>
  );
}
