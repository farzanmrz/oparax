"use client";

import { cn } from "@/lib/utils";
import { AuthForm } from "@/v2/shared/auth-form";
import { BASE, lift, SiteHeader, Stage } from "./chrome";
import { stories } from "./data";
import { StoryCard } from "./stack";

// Deck log in and sign up: the Deck sign-up page (the form is the front card, the fanned stories beside it) with
// the form turned into one log in and sign up form.

const input =
  "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[14px] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)] disabled:opacity-100";

export function DeckLogin({ initial = "login" }: { initial?: "login" | "signup" }) {
  const [front, mid, back] = [stories.clustered[3], stories.clustered[0], stories.clustered[4]];
  return (
    <Stage light={760}>
      <SiteHeader />
      <main className="relative mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-16 px-4 py-14 lg:grid-cols-[420px_minmax(0,1fr)] lg:px-8">
        <section className={cn(lift, "p-7")} style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}>
          <AuthForm
            base={BASE}
            initial={initial}
            fieldClass={input}
            labelClass="text-[13px] font-medium text-t2"
            titleClass="text-[26px] leading-none font-semibold tracking-[-0.025em] text-t1"
            radius="rounded-lg"
            linkClass="text-t1 underline-offset-4 hover:underline"
          />
        </section>

        <div className="relative hidden h-[700px] lg:block" aria-label="Three stories from this week">
          <div className="absolute -top-6 left-[205px] w-[400px] rotate-[3deg]">
            <StoryCard story={back} imageHeight={150} compact />
          </div>
          <div className="absolute top-0 left-6 w-[400px] -rotate-[3.5deg]">
            <StoryCard story={mid} imageHeight={150} compact />
          </div>
          <div className="absolute top-24 left-[170px] w-[440px]">
            <StoryCard story={front} imageHeight={170} />
          </div>
          <p className="absolute bottom-0 left-[170px] text-[12px] text-t3">Stories from this week, from public sources. A preview, not your agent.</p>
        </div>
      </main>
    </Stage>
  );
}
