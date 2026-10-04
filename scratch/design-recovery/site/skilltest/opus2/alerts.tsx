"use client";

import { ArrowUp, Pause, Play, Square } from "lucide-react";
import { BotAvatar, XLogo } from "@/pro/shared/brand";
import { SiteIcon } from "@/next/council/marks";
import { alerts, plans } from "@/next/copy";
import { Head } from "./atoms";
import { clock, DAY0, HANDLE, hostOf, SPAN, status, timeline, wireDms } from "./data";

// Screen 4: alerts and plans as one object. The stored reports of Sep 30 and Oct 1 on a 48-hour axis, and
// when each plan's DMs would carry them (replay of the product's rules on real publication times), with
// each plan's monthly pool of watched X posts. Beside it, the one message that turns alerts on.

const W = 820;
const pos = (t: number) => ((t - DAY0) / SPAN) * 100;
const days = [DAY0, DAY0 + 86_400_000];
/** Neighbours closer than 3 percent of the axis split apart: the earlier one left, the later one right. */
function sides(ts: number[]) {
  return ts.map((t, i) => {
    const prev = i > 0 && pos(t) - pos(ts[i - 1]) < 3;
    const next = i < ts.length - 1 && pos(ts[i + 1]) - pos(t) < 3;
    return next ? { dx: -14, label: "right-0" } : prev ? { dx: 14, label: "left-0" } : { dx: 0, label: "left-1/2 -translate-x-1/2" };
  });
}
const dayLabel = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function Alerts() {
  const maxPool = 4000;
  const pools: Record<string, number> = { hobby: 100, creator: 3000, wire: 4000 };
  return (
    <section id="alerts" className="stage h-[900px] border-t border-line pt-[88px]">
      <div className="mx-auto max-w-[1360px] px-8">
        <Head
          title="One DM per story, on your plan's rhythm"
          line="Hobby and Creator send one alert a day. Wire sends a mini digest every 15 minutes, or nothing when there is no news."
        />
        <div className="mt-7 grid grid-cols-[1fr_380px] gap-5">
          <div className="lift self-start overflow-hidden">
            <div className="flex h-12 items-center gap-3 border-b border-line px-5">
              <span className="text-[13.5px] font-medium text-t1">Two days of reports</span>
              <span className="font-mono text-[11px] text-t4">replay of stored reports, UTC</span>
            </div>

            <div className="px-5 pb-2 pt-4" style={{ maxWidth: W + 200 }}>
              <div className="grid grid-cols-[150px_1fr] gap-x-4">
                <span />
                <div className="relative h-6">
                  {days.map((d) => (
                    <span key={d} className="absolute top-0 font-mono text-[11px] text-t2" style={{ left: `${pos(d)}%` }}>
                      {dayLabel(d)}
                    </span>
                  ))}
                  {Array.from({ length: 8 }, (_, i) => DAY0 + (i + 1) * 6 * 3_600_000)
                    .filter((t) => (t - DAY0) % 86_400_000 !== 0)
                    .map((t) => (
                      <span key={t} className="absolute top-0 -translate-x-1/2 font-mono text-[10px] text-t4" style={{ left: `${pos(t)}%` }}>
                        {clock(new Date(t).toISOString())}
                      </span>
                    ))}
                </div>

                <Lane label="Reports" sub="as published">
                  {timeline.map((r, i, all) => {
                    const sd = sides(all.map((x) => x.t))[i];
                    return (
                      <span key={r.item.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `calc(${pos(r.t)}% + ${sd.dx}px)` }}>
                        <span className="block rounded-md bg-[var(--window)] p-[3px] shadow-[var(--card-shadow)]">
                          <SiteIcon host={hostOf(r.item.url)} size={18} />
                        </span>
                        <span className={`absolute top-full mt-1 whitespace-nowrap font-mono text-[10px] text-t3 ${sd.label}`}>{clock(r.item.published_at)}</span>
                      </span>
                    );
                  })}
                </Lane>

                <Lane label="Hobby, Creator" sub="one DM a day">
                  {days.map((d) => {
                    const n = timeline.filter((r) => r.t >= d && r.t < d + 86_400_000).length;
                    return (
                      <span
                        key={d}
                        className="absolute top-1/2 flex h-8 -translate-y-1/2 items-center justify-end rounded-lg border border-[var(--brand-line)] bg-[var(--brand-soft)] pr-1.5"
                        style={{ left: `calc(${pos(d)}% + 4px)`, width: "calc(50% - 8px)" }}
                      >
                        <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-[var(--brand)] px-2 text-[11px] font-medium text-white">
                          <XLogo className="size-2.5" /> 1 DM, {n} {n === 1 ? "story" : "stories"}
                        </span>
                      </span>
                    );
                  })}
                </Lane>

                <Lane label="Wire" sub="every 15 min, if news">
                  {Array.from({ length: 192 }, (_, i) => (
                    <span key={i} className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-line-strong" style={{ left: `${(i / 192) * 100}%` }} />
                  ))}
                  {wireDms.map((d, i, all) => {
                    const sd = sides(all.map((x) => x.t))[i];
                    return (
                      <span key={d.t} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `calc(${pos(d.t)}% + ${sd.dx}px)` }}>
                        <span className="grid size-6 place-items-center rounded-full bg-[var(--brand)] text-white shadow-[0_0_0_4px_var(--brand-soft)]">
                          <XLogo className="size-2.5" />
                        </span>
                        <span className={`absolute top-full mt-1 whitespace-nowrap font-mono text-[10px] text-[var(--brand)] ${sd.label}`}>
                          {clock(new Date(d.t).toISOString())}
                        </span>
                      </span>
                    );
                  })}
                </Lane>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-4 border-t border-line">
              <div className="border-r border-line p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold text-t1">Free week</span>
                  <span className="text-[13px] text-t1">
                    $0 <span className="text-[11.5px] text-t3">7 days</span>
                  </span>
                </div>
                <p className="mt-3 text-[11.5px] text-t3">Watched X posts</p>
                <p className="text-[15px] font-semibold tabular-nums text-t1">{status.poolLimit}</p>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line-strong">
                  <span className="block h-full rounded-full bg-[var(--caution)]" style={{ width: `${(status.poolLimit / maxPool) * 100}%` }} />
                </span>
                <p className="mt-2.5 text-[11.5px] text-t3">No card. Starts when your agent is ready.</p>
              </div>
              {plans.map((p, i) => (
                <div key={p.tier} className={i < plans.length - 1 ? "border-r border-line p-4" : "p-4"}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold text-t1">{p.name}</span>
                    <span className="text-[13px] text-t1">
                      {p.price} <span className="text-[11.5px] text-t3">a month</span>
                    </span>
                  </div>
                  <p className="mt-3 text-[11.5px] text-t3">Watched X posts a month</p>
                  <p className="text-[15px] font-semibold tabular-nums text-t1">{pools[p.tier].toLocaleString("en-US")}</p>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line-strong">
                    <span className="block h-full rounded-full bg-[var(--kind-post)]" style={{ width: `${(pools[p.tier] / maxPool) * 100}%` }} />
                  </span>
                  <p className="mt-2.5 text-[11.5px] text-t3">
                    {p.tier === "wire" ? "Mini digest every 15 minutes" : "One DM a day"}, sites and feeds unlimited
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="tile overflow-hidden">
              <div className="flex h-11 items-center gap-2.5 border-b border-line px-4">
                <BotAvatar className="size-6" />
                <span className="text-[13px] font-semibold text-t1">Oparax</span>
                <span className="text-[12px] text-t3">@oparax_ai</span>
                <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-t3">
                  <span className="size-2 rounded-full border border-t4" /> Not connected
                </span>
              </div>
              <div className="px-4 pb-4 pt-3">
                <p className="text-[12.5px] leading-[1.55] text-t3">{alerts.explain}</p>
                <div className="mt-3 flex items-center gap-2 rounded-full border border-[var(--brand-line)] bg-[var(--well)] py-1.5 pl-4 pr-1.5">
                  <span className="text-[13.5px] text-t1">Start alerts</span>
                  <span className="h-4 w-px animate-pulse bg-[var(--brand)]" />
                  <span className="ml-auto text-[11px] text-t4">from @{HANDLE}</span>
                  <span className="grid size-7 place-items-center rounded-full bg-[var(--brand)] text-white">
                    <ArrowUp className="size-3.5" />
                  </span>
                </div>
              </div>
            </div>

            <div className="tile overflow-hidden">
              <div className="flex h-10 items-center border-b border-line px-4">
                <span className="text-[13px] font-medium text-t1">Reply to the bot any time</span>
              </div>
              {[
                { word: "STOP", icon: <Square className="size-3" />, color: "var(--error)", soft: "var(--error-soft)", text: alerts.stopped },
                { word: "PAUSE", icon: <Pause className="size-3" />, color: "var(--caution)", soft: "var(--caution-soft)", text: alerts.paused },
                { word: "RESUME", icon: <Play className="size-3" />, color: "var(--ok)", soft: "var(--ok-soft)", text: alerts.active },
              ].map((c) => (
                <div key={c.word} className="flex items-start gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                  <span className="inline-flex h-6 w-[78px] shrink-0 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] font-semibold" style={{ color: c.color, background: c.soft }}>
                    {c.icon}
                    {c.word}
                  </span>
                  <p className="text-[12.5px] leading-[1.5] text-t2">{c.text}</p>
                </div>
              ))}
            </div>

            <div className="tile px-4 py-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-t1">Watched X posts</span>
                <span className="text-[12px] tabular-nums text-t3">
                  {status.poolUsed} of {status.poolLimit}
                </span>
              </div>
              <span className="mt-2 block h-1.5 rounded-full bg-line-strong" />
              <p className="mt-2.5 text-[12px] leading-[1.5] text-t3">When the pool runs out, watched accounts pause until the month resets. Sites and feeds keep running.</p>
            </div>

            <div className="tile flex items-center gap-3 px-4 py-3 text-[12.5px] text-t2">
              <span className="grid size-7 place-items-center rounded-md bg-[var(--kind-post-soft)] text-[var(--kind-post)]">
                <XLogo className="size-3" />
              </span>
              The bot carries news only. It never posts for you.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Lane({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex h-[100px] flex-col justify-center border-t border-line-soft">
        <span className="text-[13px] font-medium text-t1">{label}</span>
        <span className="text-[11.5px] text-t3">{sub}</span>
      </div>
      <div className="relative h-[100px] border-t border-line-soft">
        <span className="absolute inset-y-0 left-1/2 w-px bg-line" aria-hidden="true" />
        {children}
      </div>
    </>
  );
}
