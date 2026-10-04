import { Check } from "lucide-react";
import { BotAvatar } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { nextStory, packDm } from "../data/feed";
import { beat, chosenAccounts, chosenSites } from "../data/onboarding";
import { HANDLE } from "../copy";
import { KindIcon } from "../source-kind";

// Five steps (owner, October 1). Anatomy adapted from React Bits Pro how-it-works-8 (numbered steps on one
// connector, each with a small vignette of the real UI), recolored; every vignette uses the recorded data.

const story = nextStory;
const vignette = "flex-1 rounded-xl border border-border bg-card p-4 text-[13px]";

const steps = [
  {
    title: "Write one sentence",
    text: "Say what you follow, in your own words.",
    body: (
      <div className={vignette}>
        <p className="text-xs text-muted-foreground">What do you want to follow?</p>
        <p className="mt-2 rounded-md border border-input px-3 py-2 leading-snug">{beat}</p>
        <p className="mt-1.5 text-right text-xs text-muted-foreground tabular-nums">{beat.length}/300</p>
      </div>
    ),
  },
  {
    title: "Your agent builds",
    text: "It reads your posts, scores sources against your sentence and decides what to watch.",
    body: (
      <ul className={cn(vignette, "space-y-2.5")}>
        {["Reads your newest posts", "Scores every source", "Chooses what to watch", "Writes your brief"].map((line) => (
          <li key={line} className="flex items-center gap-2">
            <span className="grid size-4 place-items-center rounded-full bg-muted-foreground/70 text-background">
              <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
            </span>
            {line}
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: "See what it chose",
    text: "The sites, feeds and X accounts it chose, each with the reason.",
    body: (
      <ul className={cn(vignette, "space-y-3")}>
        {[
          { kind: chosenSites[0].kind, name: chosenSites[0].name, why: chosenSites[0].why },
          { kind: "x_account" as const, name: chosenAccounts[0].handle, why: chosenAccounts[0].why },
        ].map((row) => (
          <li key={row.name} className="flex gap-2">
            <KindIcon kind={row.kind} className="size-5" />
            <span>
              <span className="font-medium">{row.name}</span>
              <span className="mt-0.5 block leading-snug text-muted-foreground">{row.why}</span>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: "Read your feed",
    text: "Sites, feeds and X accounts are checked as often as every minute, so stories land as news breaks.",
    body: (
      <div className={vignette}>
        <p className="leading-snug font-semibold">{story.card.headline}</p>
        <p className="mt-2 flex gap-2 leading-snug">
          <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden="true" />
          <span>
            {story.card.facts[1].text} <span className="text-muted-foreground">(Next.js, Next.js Blog)</span>
          </span>
        </p>
        <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">Used 2 sources</p>
      </div>
    ),
  },
  {
    title: "Get the DM",
    text: "Alerts arrive on X: daily, or every 15 minutes when there is news on Wire.",
    body: (
      <div className={cn(vignette, "flex gap-2.5")}>
        <BotAvatar className="size-7" />
        <p className="min-w-0 rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-xs leading-relaxed break-words whitespace-pre-line">
          {packDm(HANDLE, [story])}
        </p>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-b border-border py-20">
      <div className="mx-auto w-[90%] max-w-[1800px]">
        <h2 className="text-3xl font-semibold tracking-tight">How It Works</h2>
        <ol className="relative mt-10 grid grid-cols-5 gap-5">
          <span aria-hidden="true" className="absolute top-4 right-[10%] left-4 h-px bg-border" />
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex flex-col">
              <span className="relative grid size-8 place-items-center rounded-full border border-border bg-background text-sm font-semibold">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1 mb-4 min-h-[3.75rem] text-sm leading-snug text-muted-foreground">{step.text}</p>
              {step.body}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
