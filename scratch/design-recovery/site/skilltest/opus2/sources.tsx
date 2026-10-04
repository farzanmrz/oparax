"use client";

import { Fragment } from "react";
import { Quote } from "lucide-react";
import { Head, KindBadge, KindGlyph, kindMeta, SourceLogo } from "./atoms";
import { beat, brief, funnel, githubRelease, HANDLE, KEEP_LINE, postsRead, profile, scoreDots, sourceRows, when, type SourceKind } from "./data";

// Screen 2: every source is the same kind of input. A source table (Vercel deployments idiom: one row per
// source, kind in its own hue, its newest report), beside how the recorded onboarding run chose them.

const order: SourceKind[] = ["rss", "website", "x", "github"];

export function Sources() {
  const groups = order.map((k) => ({ kind: k, rows: sourceRows.filter((r) => r.kind === k) })).filter((g) => g.rows.length);
  return (
    <section id="sources" className="stage h-[900px] border-t border-line pt-[88px]">
      <div className="mx-auto max-w-[1360px] px-8">
        <Head
          title="Every source weighed the same"
          line="X accounts, websites, RSS feeds, GitHub and Product Hunt all feed one judge: each new item is checked against your one sentence."
        />
        <div className="mt-7 grid grid-cols-[1fr_400px] gap-5">
          <div className="lift overflow-hidden">
            <div className="flex h-12 items-center gap-3 border-b border-line px-5">
              <span className="text-[13.5px] font-medium text-t1">Sources for @{HANDLE}</span>
              <div className="ml-2 flex gap-1.5">
                {groups.map((g) => (
                  <KindBadge key={g.kind} kind={g.kind} count={g.rows.length} plural={g.rows.length !== 1} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[210px_96px_230px_1fr] border-b border-line bg-[var(--rail)] px-5 py-2">
              {["Source", "Kind", "Address", "Newest report"].map((h) => (
                <span key={h} className="label">
                  {h}
                </span>
              ))}
            </div>
            <div>
              {groups.map((g) => (
                <Fragment key={g.kind}>
                  {g.rows.map((r) => (
                    <div
                      key={r.id}
                      className="grid h-[31px] grid-cols-[210px_96px_230px_1fr] items-center border-b border-line-soft px-5 text-[12.5px] last:border-b-0"
                      style={{ boxShadow: `inset 2px 0 0 ${kindMeta[r.kind].color}` }}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-t1">
                        <SourceLogo kind={r.kind} host={r.host} handle={r.handle} size={15} />
                        <span className="truncate">{r.name}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[11.5px]" style={{ color: kindMeta[r.kind].color }}>
                        {kindMeta[r.kind].word}
                      </span>
                      <span className="truncate pr-4 font-mono text-[11px] text-t3">{r.address}</span>
                      {r.latest ? (
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="truncate text-t2">{r.latest.title}</span>
                          <span className="ml-auto shrink-0 font-mono text-[10.5px] text-t4">{when(r.latest.published_at)}</span>
                        </span>
                      ) : r.kind === "github" ? (
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex h-[18px] items-center rounded-[5px] border border-line-strong px-1.5 font-mono text-[10.5px] text-t2">
                            {githubRelease.name.split(" ")[1]}
                          </span>
                          <span className="truncate text-t2">Release, {githubRelease.description}</span>
                          <span className="ml-auto shrink-0 font-mono text-[10.5px] text-t4">{when(githubRelease.released_at)}</span>
                        </span>
                      ) : (
                        <span className="truncate text-t4">{r.note}</span>
                      )}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="tile p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white">
                  {profile.name[0]}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-t1">{profile.name}</p>
                  <p className="text-[12px] text-t3">{profile.handle}</p>
                </div>
                <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[11px] text-t3">Read {postsRead} posts</span>
              </div>
              <div className="well mt-3 flex gap-2 px-3 py-2.5">
                <Quote className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" />
                <p className="text-[13px] leading-[1.5] text-t1">{beat}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {brief.interests.map((i) => (
                  <span key={i} className="rounded-md border border-line bg-raised px-2 py-0.5 text-[11.5px] text-t2">
                    {i}
                  </span>
                ))}
              </div>
            </div>

            <div className="tile p-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Candidates", funnel.candidates, "var(--t4)"],
                  ["Passed Jev", funnel.passed, "var(--kind-article)"],
                  ["Chosen", funnel.chosen, "var(--brand)"],
                ].map(([label, n, color]) => (
                  <div key={label as string}>
                    <p className="text-[11.5px] text-t3">{label}</p>
                    <p className="mt-0.5 text-[22px] font-semibold tabular-nums leading-tight text-t1">{n}</p>
                    <span className="mt-1.5 block h-1 rounded-full" style={{ background: color as string, width: `${Math.max(8, ((n as number) / funnel.candidates) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <ScoreStrip />
            </div>

            <div className="tile overflow-hidden">
              {[
                { kind: "x" as const, k: "X accounts", v: "every 5 minutes, every minute on Wire" },
                { kind: "rss" as const, k: "Sites and feeds", v: "polled often, conditional requests" },
                { kind: "website" as const, k: "Websites", v: "same checks, read as a normal browser" },
              ].map((r) => (
                <div key={r.k} className="flex items-center gap-3 border-b border-line-soft px-4 py-2.5 text-[12.5px] last:border-b-0">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md" style={{ color: kindMeta[r.kind].color, background: kindMeta[r.kind].soft }}>
                    <KindGlyph kind={r.kind} className="size-3" />
                  </span>
                  <span className="font-medium text-t1">{r.k}</span>
                  <span className="ml-auto text-right text-t3">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Each scored candidate as a dot on 0 to 1; chosen dots carry their kind's hue. */
function ScoreStrip() {
  const W = 368;
  const H = 120;
  const x = (s: number) => 6 + s * (W - 12);
  // Stack dots that collide into columns so every candidate stays visible.
  const placed: { cx: number; cy: number; d: (typeof scoreDots)[number] }[] = [];
  const sorted = [...scoreDots].sort((a, b) => a.score - b.score);
  const colH = new Map<number, number>();
  for (const d of sorted) {
    const col = Math.round(x(d.score) / 9);
    const n = colH.get(col) ?? 0;
    colH.set(col, n + 1);
    placed.push({ cx: col * 9, cy: H - 26 - n * 9, d });
  }
  const fill = (d: (typeof scoreDots)[number]) =>
    d.state === "chosen" ? kindMeta[d.kind === "x_account" ? "x" : d.kind === "website" ? "website" : "rss"].color : d.state === "passed" ? "var(--t4)" : "transparent";
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex items-center gap-3 text-[11px] text-t3">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-[var(--brand)]" /> chosen
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-t4" /> passed
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full border border-t4" /> below the line
        </span>
        <span className="ml-auto font-mono text-[10.5px] text-t4">fit score</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block w-full" style={{ height: H }} aria-label="Candidate scores">
        <line x1={x(KEEP_LINE)} x2={x(KEEP_LINE)} y1={8} y2={H - 18} stroke="var(--caution)" strokeDasharray="3 3" />
        <text x={x(KEEP_LINE) + 4} y={16} fontSize="10" fill="var(--caution)" fontFamily="ui-monospace, monospace">
          keep {KEEP_LINE}
        </text>
        {placed.map(({ cx, cy, d }) => (
          <circle key={d.id} cx={cx} cy={cy} r={3.4} fill={fill(d)} stroke={d.state === "dropped" ? "var(--t4)" : "none"} strokeWidth={1}>
            <title>
              {d.name} {d.score}
            </title>
          </circle>
        ))}
        <line x1={0} x2={W} y1={H - 18} y2={H - 18} stroke="var(--line-strong)" />
        {[0, 0.5, 1].map((t) => (
          <text key={t} x={x(t)} y={H - 4} fontSize="10" fill="var(--t4)" textAnchor={t === 0 ? "start" : t === 1 ? "end" : "middle"} fontFamily="ui-monospace, monospace">
            {t}
          </text>
        ))}
      </svg>
    </div>
  );
}

