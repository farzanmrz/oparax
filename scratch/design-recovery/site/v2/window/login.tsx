"use client";

import { AuthForm } from "@/v2/shared/auth-form";
import { cn } from "@/lib/utils";
import { BASE, Label, ShowProvider, SiteHeader } from "./chrome";
import { PREVIEW_NOTE, stories } from "./data";
import { Facts, SourceCard, sortedItems, StoryHead, StoryImage } from "./story";

// Window log in and sign up: the Window sign-up page (form left, the stories you sign up for right) with the
// form turned into one log in and sign up form. The page is the window: full screen, no outer edges.

const olmo = stories.clustered.find((s) => s.id === "clustered-olmo")!;
const mistral = stories.clustered.find((s) => s.id === "clustered-mistral")!;

const field = "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[14px] text-t1 outline-none placeholder:text-t3 focus:border-[var(--brand)] disabled:opacity-100";

export function Login({ initial = "login" }: { initial?: "login" | "signup" }) {
  return (
    <ShowProvider>
      <div className="palette-council flex min-h-svh flex-col bg-[var(--window)]">
        <SiteHeader active="signup" />
        <main className="grid flex-1 grid-cols-1 lg:grid-cols-[440px_minmax(0,1fr)]">
          <div className="border-b border-line px-5 pt-8 pb-10 lg:border-r lg:border-b-0 lg:px-8">
            <AuthForm base={BASE} initial={initial} fieldClass={field} labelClass="text-[13px] font-medium text-t2" titleClass="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1" />
            <div className="mt-8 border-t border-line pt-5">
              <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--caution)]">
                <span className="rounded-[5px] border border-[var(--caution)]/40 bg-[var(--caution-soft)] px-1.5 py-px font-mono text-[10px] tracking-wide">FREE WEEK</span>
                7 days, 300 watched Twitter posts, no card
              </p>
              <p className="mt-1.5 text-[12.5px] text-t3">It starts when your agent is ready.</p>
            </div>
          </div>
          <div className="min-w-0 bg-[var(--rail)] px-5 pt-8 pb-8 lg:px-8">
            <div className="flex items-center gap-2">
              <Label>What you sign up for</Label>
              <span className="ml-auto text-[12px] text-t3">{PREVIEW_NOTE}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              {[olmo, mistral].map((s) => (
                <article key={s.id} className="min-w-0 rounded-xl border border-line-strong bg-[var(--window)] p-4" style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
                  <StoryImage src={s.image!} />
                  <div className="mt-3.5 [&_h2]:text-[17px]">
                    <StoryHead story={s} />
                  </div>
                  <Facts story={s} size="sm" className="mt-3" />
                  <div className={cn("mt-3.5")}>
                    {sortedItems(s).map((item) => (
                      <SourceCard key={item.id} item={item} story={s} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>
      </div>
    </ShowProvider>
  );
}
