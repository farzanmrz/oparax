"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Quote as QuoteMark, Sparkles } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { setup } from "@/next/copy";
import { watchExample } from "@/next/data/landing";
import { brief, profile } from "@/next/data/onboarding";
import { cn } from "@/lib/utils";
import { BASE, Header, lift, liftStyle, Stage } from "./chrome";
import { beat, groups, sources, stories, when } from "./data";
import { GroupGlyph, GroupLabel, SourceMark } from "./marks";

// Deck v2 setup: one lifted form card (the X account the agent is built around, and the one sentence), and beside
// it what a sentence turns into, from the recorded run: the interests it read, the sources it chose and the stories
// they found this week, plus the owner's own second example. Copy is the product's (next/copy.ts setup).

const field = "w-full rounded-lg border border-line-strong bg-[var(--well)] text-t1 placeholder:text-t3 outline-none transition-shadow focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-soft)]";

export function DeckSetup({ typed, blank }: { typed: boolean; blank: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(blank ? "" : beat);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState(blank);
  return (
    <Stage light={640}>
      <main className="relative mx-auto w-full max-w-[1400px] px-4 pt-8 pb-20 lg:px-8">
        <Header title={setup.title} freeWeek={false} sub={<p className="text-[14px] text-t2">Your agent is built from these two things.</p>} />
        <div className="mt-7 grid items-start gap-10 lg:grid-cols-[540px_minmax(0,1fr)]">
        <div>
          <form
            className={cn(lift, "p-6")}
            style={{ boxShadow: "var(--window-shadow), var(--top-light)" }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return setError(true);
              router.push(`${BASE}/building`);
            }}
          >
            <p className="text-[13px] font-medium text-t2">{setup.handleLabel}</p>
            {typed ? (
              <>
                <div className={cn(field, "mt-2 flex h-11 items-center gap-2 px-3")}>
                  <span className="text-t3">@</span>
                  <input
                    aria-label={setup.handleLabel}
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder={setup.handlePlaceholder}
                    className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:text-t3"
                  />
                  <XLogo className="size-3.5 text-t3" />
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-t3">{setup.typedHelp}</p>
              </>
            ) : (
              <>
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-line-strong bg-[var(--well)] px-3 py-2.5">
                  <span className="grid size-9 place-items-center rounded-full bg-[var(--brand)] text-[14px] font-semibold text-white">{profile.name[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-t1">{profile.name}</span>
                    <span className="block text-[12.5px] text-t3">{profile.handle}</span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-[var(--ok-soft)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--ok)]">
                    <BadgeCheck className="size-3.5" aria-hidden="true" /> From your X sign-in
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] text-t3">{setup.verifiedHelp}</p>
              </>
            )}

            <label htmlFor="beat" className="mt-6 block text-[13px] font-medium text-t2">
              {setup.beatLabel}
            </label>
            <textarea
              id="beat"
              value={text}
              maxLength={setup.beatMax}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim()) setError(false);
              }}
              placeholder={setup.beatPlaceholder}
              rows={3}
              aria-invalid={error}
              aria-describedby="beat-help"
              className={cn(field, "mt-2 block resize-none px-3.5 py-3 text-[16px] leading-[1.5]", error && "border-[var(--error)]")}
            />
            <p id="beat-help" className="mt-2 flex justify-between gap-4 text-[12.5px]">
              {error ? <span className="text-[var(--error)]">{setup.beatRequired}</span> : <span className="text-t3">One sentence. Name the topics, people or products you care about.</span>}
              <span className="shrink-0 text-t3 tabular-nums">
                {text.length}/{setup.beatMax}
              </span>
            </p>
            <button
              type="submit"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-medium text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {setup.submit}
            </button>
            <p className="mt-2.5 text-center text-[12px] text-t3">Preview: the next page replays an illustrative example, not one built from this form.</p>
          </form>
          <OtherExample />
        </div>

        <Example />
        </div>
      </main>
    </Stage>
  );
}

function Example() {
  const found = [stories.clustered[3], stories.clustered[0], stories.clustered[1]];
  return (
    <div>
      <p className="text-[12.5px] text-t3">What one sentence became, in an illustrative example</p>
      <section className={cn(lift, "mt-3 overflow-hidden")} style={liftStyle}>
        <div className="p-5">
          <div className="flex gap-2.5 rounded-lg border border-[var(--brand-line)] bg-[var(--brand-soft)] px-3.5 py-3">
            <QuoteMark className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            <p className="text-[15px] leading-snug font-medium text-t1">{beat}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {brief.interests.map((t) => (
              <span key={t} className="rounded-full border border-line bg-[var(--well)] px-2.5 py-0.5 text-[12px] text-t2">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {groups
              .filter((g) => g.id !== "github")
              .map((g) => {
                const members = sources.filter((s) => s.group === g.id);
                return (
                  <div key={g.id}>
                    <GroupLabel glyph={<GroupGlyph group={g.id} />} count={members.length}>
                      {g.label}
                    </GroupLabel>
                    <ul className="mt-2 grid gap-1">
                      {members.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-[12.5px] text-t2">
                          <SourceMark source={s} size={18} className={s.group === "x" ? "" : "rounded-[5px]"} />
                          <span className="truncate">{s.group === "x" ? s.handle : s.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        </div>
        <div className="grid border-t border-line sm:grid-cols-3">
          {found.map((s, i) => (
            <div key={s.id} className={cn("min-w-0", i > 0 && "sm:border-l sm:border-line")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.card.image!} alt="" loading="lazy" className="h-[104px] w-full object-cover" />
              <div className="p-3.5">
                <p className="text-[11.5px] text-t3 tabular-nums">{when(s.items[0].published_at)}</p>
                <p className="mt-1 text-[13.5px] leading-snug font-semibold text-t1">{s.card.headline}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

function OtherExample() {
  return (
      <section className={cn(lift, "mt-5 p-5")} style={liftStyle}>
      <p className="text-[13px] text-t2">
        A sentence about <span className="font-semibold text-t1">{watchExample.beat}</span> watches more than its obvious account:
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {watchExample.rows.map((r) => (
          <li key={r.name + r.kind} className="flex items-center gap-2.5 rounded-lg border border-line bg-[var(--well)] px-3 py-2">
            <span className={cn("grid size-6 place-items-center rounded-md", r.kind === "x_account" ? "bg-[var(--kind-post-soft)] text-[var(--kind-post)]" : "bg-[var(--kind-article-soft)] text-[var(--kind-article)]")}>
              {r.kind === "x_account" ? <XLogo className="size-3" /> : <GroupGlyph group="rss" className="size-3.5" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-t1">{r.name}</span>
              <span className="block text-[12px] text-t3">{r.focus}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
