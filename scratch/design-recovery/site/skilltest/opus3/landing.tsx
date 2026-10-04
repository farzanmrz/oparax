"use client";

import { ArrowRight, CircleAlert, Layers } from "lucide-react";
import StatusMark from "@/components/react-bits/StatusMark";
import { BotAvatar, OparaxMark, XLogo } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { Facts } from "@/next/council/chrome";
import { accounts, hostOf, sites, status, when, HANDLE, PREVIEW_NOTE } from "@/next/council/data";
import { Dot, KindChip, MarkStack, ReportMark } from "@/next/council/marks";
import { councilStories, packDm } from "@/next/data/feed";
import { cn } from "@/lib/utils";
import { KindTile, kindLabel, PrimaryButton, Surface, type SourceKind } from "./bits";
import { SourcesSection } from "./sources";
import { StorySection } from "./story";
import { AlertsSection } from "./alerts";

// Landing page test (skill: reference-led-design). Four screens, each built around one big object on the
// accepted council skin: 1. a real joined story, lifted, with its DM and the agent's state; 2. one sentence
// choosing real sources; 3. three reports of one event becoming one card; 4. the DM thread beside the plans.

const sol = councilStories.find((s) => s.id === "st-gpt61-sol")!;

export function Landing() {
  return (
    <div className="palette-council relative min-h-svh overflow-x-clip">
      <Nav />
      <Hero />
      <SourcesSection />
      <StorySection />
      <AlertsSection />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--page)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-9 px-10">
        <a href="#top" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-t1">
          <OparaxMark className="size-[22px]" />
          Oparax
        </a>
        <nav aria-label="Primary" className="flex items-center gap-7 text-[13.5px] text-t3">
          <a className="transition-colors hover:text-t1" href="#sources">Sources</a>
          <a className="transition-colors hover:text-t1" href="#stories">Stories</a>
          <a className="transition-colors hover:text-t1" href="#alerts">Alerts and plans</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle className="size-8 text-t3" />
          <a href="#" className="px-2 text-[13.5px] text-t2 hover:text-t1">Log in</a>
          <PrimaryButton className="h-9 px-4">Sign up</PrimaryButton>
        </div>
      </div>
    </header>
  );
}

const INPUTS: SourceKind[] = ["x_account", "website", "rss", "github", "product_hunt"];

function Hero() {
  return (
    <section id="top" className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[900px]" style={{ background: "var(--stage-light)" }} />
      <div className="relative mx-auto grid h-[844px] max-w-[1320px] grid-cols-[520px_minmax(0,1fr)] gap-10 px-10 pt-6">
        <div className="flex flex-col justify-center pb-10">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-line-strong bg-[var(--window)] px-3 py-1.5 text-[12.5px] text-t2" style={{ boxShadow: "var(--top-light)" }}>
            <Dot tone="ok" pulse />
            <span className="font-medium text-[var(--ok)]">Live</span>
            <span className="text-t3">
              {sites.length} sites and feeds, {accounts.length} X accounts for @{HANDLE}
            </span>
          </p>
          <h1 className="mt-7 text-[56px] leading-[1.03] font-semibold tracking-[-0.035em] text-t1">
            The wide internet, brought to you on X.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.6] text-t2">
            Say what you cover in one sentence. Oparax watches the sources that fit, joins every report of one event
            into one story with each fact cited, and sends it to your X DMs.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <PrimaryButton className="h-11 px-5 text-[14.5px]" icon={<XLogo className="size-3.5" />}>
              Sign up with X
            </PrimaryButton>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-line-strong bg-[var(--window)] px-5 text-[14.5px] font-medium text-t1 transition-colors hover:bg-[var(--raised)]"
              style={{ boxShadow: "var(--top-light)" }}
            >
              Google or email <ArrowRight className="size-4 text-t3" />
            </button>
          </div>
          <p className="mt-4 text-[13px] text-t3">
            <span className="font-medium text-[var(--caution)]">{status.trialDays} days free</span>, no card. Plans from $5 a month.
          </p>

          <div className="mt-12">
            <p className="mb-3 text-[12.5px] text-t3">Every kind of source weighed the same</p>
            <div className="grid grid-cols-5 gap-2">
              {INPUTS.map((k) => (
                <div key={k} className="flex flex-col items-center gap-2 rounded-xl border border-line bg-[var(--window)]/60 px-1 py-3">
                  <KindTile kind={k} size={38} />
                  <span className="text-center text-[11.5px] leading-tight text-t2">{kindLabel[k].replace("account", "accounts").replace("feed", "feeds").replace("Website", "Websites")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <HeroStage />
      </div>
    </section>
  );
}

/** The big moment: a real joined story, lifted off the page, its second report peeking behind it, the agent's
 * live state on its left edge and the DM it produced overlapping its foot. */
function HeroStage() {
  const behind = sol.items.find((i) => i.id !== "item-simon-devday")!;
  const dmLines = packDm(HANDLE, [sol]).split("\n").filter(Boolean);
  return (
    <div className="relative mt-8">
      {/* second report peeking above the card */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-[18px] left-[108px] h-[80px] rounded-[14px] border border-line-strong bg-[var(--raised)]"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <span className="absolute inset-x-5 top-0 h-[2px] rounded-b-full bg-[var(--kind-article)]" />
        <span className="flex h-[28px] items-center gap-2 px-4 text-[12px] text-t2">
          <ReportMark item={behind} size={14} />
          {behind.publisher}
          <span className="text-t4">{hostOf(behind.url)}</span>
          <span className="ml-auto tabular-nums text-t4">{when(behind.published_at)}</span>
        </span>
      </div>

      <Surface as="article" lift="window" className="absolute top-[28px] right-0 left-[90px] overflow-hidden">
        <div className="relative h-[262px] overflow-hidden border-b border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sol.card.image!} alt="" className="size-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <span className="absolute right-4 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] text-white backdrop-blur">
            <Layers className="size-3" /> {sol.items.length} reports, one story
          </span>
        </div>
        <div className="px-7 pt-5 pb-6">
          <div className="flex items-center gap-2">
            <KindChip kind="article" count={sol.items.length} />
            <span className="inline-flex h-[22px] items-center rounded-full border border-line-strong px-2 text-[11.5px] text-t3">
              {sol.card.facts.length} facts
            </span>
            <span className="ml-auto text-[12px] tabular-nums text-t4">{when(sol.items[0].published_at)} UTC</span>
          </div>
          <h2 className="mt-3 text-[29px] leading-[1.15] font-semibold tracking-[-0.02em] text-t1">{sol.card.headline}</h2>
          <Facts story={sol} max={2} className="mt-4 space-y-2.5" />
          <div className="mt-5 flex items-center gap-2.5 border-t border-line-soft pt-4">
            <MarkStack items={sol.items} size={20} />
            <span className="text-[12.5px] text-t2">{sol.items.map((i) => hostOf(i.url)).join(", ")}</span>
            <span className="ml-auto text-[11.5px] text-t4">{PREVIEW_NOTE}</span>
          </div>
        </div>
      </Surface>

      {/* the agent's state, pinned to the card's left edge */}
      <div className="absolute top-[64px] left-0 z-10 flex w-[184px] flex-col gap-2.5">
        <Surface className="px-3.5 py-3">
          <p className="text-[11.5px] text-t3">Agent</p>
          <p className="mt-1 flex items-center gap-2 text-[14px] font-medium text-[var(--ok)]">
            <Dot tone="ok" pulse /> Live
          </p>
        </Surface>
        <Surface className="flex items-center gap-2.5 px-3.5 py-3">
          <StatusMark status="running" size={18} color="var(--caution)" strokeWidth={2} />
          <span className="text-[12.5px] leading-tight text-t2">
            Checking <span className="font-semibold text-t1">1</span> item against your sentence
          </span>
        </Surface>
        <Surface className="flex items-center gap-2.5 px-3.5 py-3">
          <CircleAlert className="size-[18px] text-[var(--error)]" />
          <span className="text-[12.5px] leading-tight text-t2">
            Could not process <span className="font-semibold text-t1">{status.failed}</span> item
          </span>
        </Surface>
      </div>

      {/* the DM that story produced */}
      <Surface lift="window" className="absolute bottom-[6px] left-0 z-20 w-[360px] p-3.5">
        <div className="flex items-center gap-2.5">
          <BotAvatar className="size-8" />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-t1">Oparax</p>
            <p className="text-[11.5px] text-t3">@oparax_ai</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand)]">
            <XLogo className="size-2.5" /> DM
          </span>
        </div>
        <div className="mt-3 rounded-2xl rounded-tl-md bg-[var(--raised)] px-3.5 py-2.5 text-[12.5px] leading-[1.5] text-t2">
          <p className="font-medium text-t1">{dmLines[0]}</p>
          <p className="mt-1.5 text-t1">{dmLines[1]}</p>
          <p className="text-t3">{dmLines[2]}</p>
          <p className="truncate text-[var(--brand)]">{dmLines[3].replace("https://", "")}</p>
        </div>
      </Surface>
    </div>
  );
}
