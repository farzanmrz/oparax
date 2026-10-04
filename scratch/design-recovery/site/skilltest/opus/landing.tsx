"use client";

import { ArrowRight } from "lucide-react";
import { OparaxMark } from "@/pro/shared/brand";
import { ThemeToggle } from "@/next/theme";
import { cn } from "@/lib/utils";
import { HeroScene } from "./hero-scene";
import { AlertScene, SetupScene, StoryScene } from "./scenes";
import { Plans, Reach } from "./reach-plans";

// The Oparax landing page (skilltest, Opus). Composition: Linear's landing rhythm (owner-4, owner-5, owner-6:
// a big left title, one sentence on the right, then a lit product scene), Supabase's hero split (owner-2) and
// logo grid, Vercel's bordered panels and status words, all in the accepted council skin (palette-council).

const container = "mx-auto w-full max-w-[1280px] px-10";

function PrimaryButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <a
      href="#"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary font-medium text-primary-foreground",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)]",
        "transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {children}
    </a>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[var(--page)]/80 backdrop-blur-md">
      <div className={cn(container, "flex h-16 items-center gap-10")}>
        <a href="#" className="flex items-center gap-2.5 text-t1">
          <OparaxMark className="size-[22px]" />
          <span className="text-[18px] font-semibold tracking-[-0.02em]">Oparax</span>
        </a>
        <nav className="flex items-center gap-7 text-[14px] text-t3">
          <a href="#how" className="hover:text-t1">How it works</a>
          <a href="#reach" className="hover:text-t1">Sources</a>
          <a href="#plans" className="hover:text-t1">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle className="size-9 text-t3" />
          <a href="#" className="px-2 text-[14px] text-t2 hover:text-t1">Log in</a>
          <PrimaryButton className="h-9 px-4 text-[14px]">Sign up</PrimaryButton>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--hero-light)" }} />
      <div className={cn(container, "relative pt-[88px]")}>
        <h1 className="text-[64px] leading-[1.04] font-semibold tracking-[-0.035em] text-t1">
          Everything on your beat,
          <br />
          <span className="text-t3">brought to you on X.</span>
        </h1>
        <div className="mt-7 flex items-end justify-between gap-16">
          <p className="max-w-[640px] text-[17px] leading-[1.6] text-t2">
            You already live on X. Oparax watches the rest of the internet for you: websites, RSS feeds, GitHub, Product
            Hunt and the X accounts you pick. Every report of one story becomes one card with its sources, sent to your X
            DMs.
          </p>
          <div className="flex shrink-0 items-center gap-4 pb-1">
            <span className="text-[14px] text-t3">Free for a week. No card.</span>
            <PrimaryButton className="h-11 px-5 text-[15px]">
              Sign up <ArrowRight className="size-4" />
            </PrimaryButton>
          </div>
        </div>
        <div className="relative mt-[64px]">
          <p className="absolute -top-9 right-0 rounded-full border border-line bg-[var(--window)]/60 px-3 py-1 text-[11.5px] text-t3">
            Preview: real public reports, replayed. Not from your agent.
          </p>
          <HeroScene />
        </div>
      </div>
    </section>
  );
}

function Chapter({
  id,
  step,
  title,
  sentence,
  children,
}: {
  id?: string;
  step?: string;
  title: React.ReactNode;
  sentence: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line">
      <div className={cn(container, "pt-[96px] pb-[104px]")}>
        <div className="grid grid-cols-2 items-start gap-16">
          <div>
            {step ? <p className="mb-5 font-mono text-[12px] tracking-[0.08em] text-t4">{step}</p> : null}
            <h2 className="text-[46px] leading-[1.06] font-semibold tracking-[-0.03em] text-t1">{title}</h2>
          </div>
          <p className={cn("text-[21px] leading-[1.45] text-t2", step && "pt-[38px]")}>{sentence}</p>
        </div>
        <div className="mt-16">{children}</div>
      </div>
    </section>
  );
}

export function Landing() {
  return (
    <div className="min-h-svh bg-[var(--page)] text-t1">
      <Nav />
      <main>
        <Hero />
        <div id="how">
          <Chapter
            step="01  SET UP"
            title={
              <>
                One sentence
                <br />
                and your X handle
              </>
            }
            sentence="Sign up with X, Google or email, then say what you follow. Oparax reads your recent posts once and picks up to ten websites and feeds and the X accounts worth watching."
          >
            <SetupScene />
          </Chapter>
          <Chapter
            step="02  READ"
            title={
              <>
                Every report,
                <br />
                one story
              </>
            }
            sentence="Each new item is judged against your sentence. Reports of the same event, from a blog, a GitHub release or a post, join into one card where every line cites its source."
          >
            <StoryScene />
          </Chapter>
          <Chapter
            step="03  GET IT ON X"
            title={
              <>
                Alerts in
                <br />
                your X DMs
              </>
            }
            sentence={
              <>
                Send <span className="text-t1">Start alerts</span> to @oparax_ai. Each story reaches you once, with a link to it
                on your own page, and later reports only make that card better.
              </>
            }
          >
            <AlertScene />
          </Chapter>
        </div>
        <Chapter
          id="reach"
          title={
            <>
              Where it reads,
              <br />
              where it reaches you
            </>
          }
          sentence="Today Oparax reads X accounts, websites, RSS feeds, GitHub and Product Hunt, and reaches you in your X DMs. The grey ones are next."
        >
          <Reach />
        </Chapter>
        <Chapter
          id="plans"
          title={
            <>
              A free week,
              <br />
              then a plan
            </>
          }
          sentence="Websites and RSS feeds are unlimited on every plan. Plans differ in how many X posts your agent watches each month and how often it writes to you."
        >
          <Plans />
        </Chapter>
        <section className="relative overflow-hidden border-t border-line">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "var(--hero-light)" }} />
          <div className={cn(container, "relative flex flex-col items-center py-[150px] text-center")}>
            <h2 className="text-[46px] leading-[1.08] font-semibold tracking-[-0.03em] text-t1">
              Your beat, watched.
              <br />
              <span className="text-t3">Your stories, on X.</span>
            </h2>
            <div className="mt-9 flex items-center gap-3">
              <PrimaryButton className="h-11 px-5 text-[15px]">Sign up</PrimaryButton>
              <a href="#" className="inline-flex h-11 items-center rounded-lg border border-line-strong bg-[var(--window)] px-5 text-[15px] text-t1 hover:bg-raised">
                Log in
              </a>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className={cn(container, "flex h-20 items-center gap-6 text-[13px] text-t4")}>
          <OparaxMark className="size-[18px] text-t2" />
          <span className="ml-auto flex gap-6">
            <a href="#" className="hover:text-t2">Privacy</a>
            <a href="#" className="hover:text-t2">Terms</a>
            <a href="#" className="hover:text-t2">Contact</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
