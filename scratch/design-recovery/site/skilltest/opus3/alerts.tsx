"use client";

import { Image as ImageIcon, Smile } from "lucide-react";
import { BotAvatar, OparaxMark, XLogo } from "@/pro/shared/brand";
import { Segments } from "@/next/council/marks";
import { HANDLE, status } from "@/next/council/data";
import { councilStories, type FeedStory } from "@/next/data/feed";
import { plans } from "@/next/copy";
import { cn } from "@/lib/utils";
import { KindTile, PrimaryButton, SectionHead, Surface } from "./bits";

// Screen 4: alerts and plans. The big object is the X DM thread itself: "Start alerts" from the person's own
// account, then one message per alert in the exact text lib/alerts/pack.ts writes, each story link unfurled with
// its image. Beside it the free week and the three plans, each with how often it writes to you.

const dmStories = ["st-c-olmo", "st-c-mai"].map((id) => councilStories.find((s) => s.id === id)!);

export function AlertsSection() {
  return (
    <section id="alerts" className="relative pt-6 pb-14">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 bottom-0" style={{ background: "var(--opus3-glow)" }} />
      <div className="relative mx-auto max-w-[1320px] px-10">
        <SectionHead id="alerts-head" title={<>One DM per story,<br />where you already are.</>}>
          Alerts start when you send &ldquo;Start alerts&rdquo; from your own X account. Each story reaches you once;
          later reports improve its card and never DM you again.
        </SectionHead>

        <div className="mt-10 grid grid-cols-[560px_minmax(0,1fr)] items-start gap-8">
          <Thread />
          <Plans />
        </div>

        <footer className="mt-16 flex items-center gap-6 border-t border-line pt-6 text-[13px] text-t3">
          <span className="flex items-center gap-2 font-semibold text-t1">
            <OparaxMark className="size-[18px]" /> Oparax
          </span>
          <span className="ml-auto">Privacy</span>
          <span>Terms</span>
          <span>Contact</span>
        </footer>
      </div>
    </section>
  );
}

function Thread() {
  return (
    <Surface lift="window" className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line bg-[var(--rail)] px-4 py-3">
        <BotAvatar className="size-9" />
        <div className="leading-tight">
          <p className="text-[14px] font-semibold text-t1">Oparax</p>
          <p className="text-[12px] text-t3">@oparax_ai</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-t3">
          <XLogo className="size-3" /> Direct message
        </span>
      </div>

      <div className="space-y-4 px-4 py-5">
        <div className="flex flex-col items-end">
          <p className="rounded-2xl rounded-br-md bg-[var(--brand)] px-3.5 py-2 text-[13.5px] text-white">Start alerts</p>
          <p className="mt-1 text-[11px] text-t4">from @{HANDLE}</p>
        </div>
        <Alert stories={dmStories} />
      </div>

      <div className="flex items-center gap-3 border-t border-line px-4 py-3 text-t4">
        <ImageIcon className="size-4 text-[var(--brand)]" />
        <Smile className="size-4 text-[var(--brand)]" />
        <span className="flex-1 rounded-full border border-line-strong px-3.5 py-1.5 text-[12.5px]">Start a new message</span>
      </div>
    </Surface>
  );
}

function Alert({ stories }: { stories: FeedStory[] }) {
  return (
    <div className="flex gap-2.5">
      <BotAvatar className="mt-auto size-7" />
      <div className="max-w-[440px] rounded-2xl rounded-bl-md bg-[var(--raised)] px-3.5 py-3 text-[13px] leading-[1.5] text-t2">
        <p className="font-medium text-t1">
          Oparax: {stories.length} new {stories.length === 1 ? "story" : "stories"} for you
        </p>
        {stories.map((s) => (
          <div key={s.id} className="mt-2.5">
            <p className="text-t1">{s.card.headline}</p>
            <p className="text-t3">{s.card.facts[0].text}</p>
            <p className="text-[var(--brand)]">
              oparax.ai/{HANDLE}/{s.id}
            </p>
            <div className="mt-2 flex overflow-hidden rounded-xl border border-line-strong bg-[var(--window)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.card.image!} alt="" className="h-[64px] w-[108px] shrink-0 object-cover" />
              <div className="min-w-0 px-3 py-2">
                <p className="text-[11px] text-t4">oparax.ai</p>
                <p className="truncate text-[12.5px] font-medium text-t1">{s.card.headline}</p>
                <p className="text-[11.5px] text-t3">
                  {s.items.length} {s.items.length === 1 ? "report" : "reports"}, {s.card.facts.length} facts
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tick strip for one day: where a plan can write to you. Daily plans get one alert a day, Wire every 15 minutes. */
function Cadence({ every }: { every: "day" | "15m" }) {
  const n = every === "day" ? 1 : 96;
  return (
    <div className="relative h-6 overflow-hidden rounded-md border border-line bg-[var(--well)]">
      {every === "day" ? (
        <span className="absolute top-1 bottom-1 left-[40%] w-[3px] rounded-full bg-[var(--brand)]" />
      ) : (
        <div className="absolute inset-x-1.5 inset-y-1 flex justify-between">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className={cn("w-px rounded-full bg-[var(--brand)]", i % 4 === 0 ? "opacity-100" : "opacity-55")} />
          ))}
        </div>
      )}
    </div>
  );
}

function Plans() {
  const pools = [100, 3000, 4000];
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <Surface className="p-5">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-t1">
            Free week
            <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide text-[var(--caution)]">
              NO CARD
            </span>
          </p>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[34px] leading-none font-semibold tracking-[-0.02em] text-t1">$0</span>
            <span className="text-[13px] text-t3">for {status.trialDays} days</span>
          </p>
          <div className="mt-4">
            <Segments total={status.trialDays} filled={status.trialDays} tone="caution" />
          </div>
          <p className="mt-3 text-[12.5px] text-t2">300 watched X posts, one DM a day</p>
          <p className="mt-1 text-[12px] text-t4">Starts when your agent is ready.</p>
        </Surface>
        {plans.map((p, i) => (
          <Surface key={p.tier} className="p-5">
            <p className="text-[14px] font-semibold text-t1">{p.name}</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[34px] leading-none font-semibold tracking-[-0.02em] text-t1">{p.price}</span>
              <span className="text-[13px] text-t3">a month</span>
            </p>
            <div className="mt-4 flex items-center gap-2 text-[12px] text-t2">
              <XLogo className="size-3 text-t1" />
              <span className="tabular-nums">{pools[i].toLocaleString("en-US")}</span> watched X posts a month
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-line-strong">
              <span className="block h-full rounded-full bg-[var(--kind-post)]" style={{ width: `${(pools[i] / 4000) * 100}%` }} />
            </div>
            <p className="mt-3.5 mb-1.5 text-[12px] text-t2">{p.tier === "wire" ? "Every 15 minutes when there is news" : "One DM a day"}</p>
            <Cadence every={p.tier === "wire" ? "15m" : "day"} />
          </Surface>
        ))}
      </div>
      <Surface className="mt-5 flex items-center gap-3 px-5 py-4">
        <KindTile kind="website" size={32} />
        <KindTile kind="rss" size={32} />
        <p className="text-[13.5px] text-t1">Websites and RSS feeds are unlimited on every plan.</p>
        <PrimaryButton className="ml-auto h-10 px-5" icon={<XLogo className="size-3.5" />}>
          Sign up with X
        </PrimaryButton>
      </Surface>
    </div>
  );
}
