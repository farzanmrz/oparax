"use client";

import { useState } from "react";
import { AtSign, BadgeCheck, CalendarDays, FileText, ListChecks, MessageSquareText, Pin, ScanSearch } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { setup } from "@/next/copy";
import { cn } from "@/lib/utils";
import { beat as recordedBeat, HANDLE, posts, profile, status } from "./data";
import { Lifted, Masthead, Mono, Page, primaryClass, SAMPLE_NOTE } from "./chrome";
import { KindChip } from "./marks";

// Newsroom setup: one lifted two-pane window. Left, the two inputs (the X account from sign-in, the one
// sentence) and what happens next as a mono-headed step table, with websites and RSS feeds named apart.
// Right, in the rail tone, the X account the agent is built around: profile, pinned post and newest posts,
// the material the agent reads (fixture values from the recorded run).

const steps = [
  { icon: AtSign, text: "Looks up your X account" },
  { icon: MessageSquareText, text: "Reads your newest posts" },
  { icon: ScanSearch, text: "Checks which X accounts, RSS feeds and websites fit your sentence", kinds: true },
  { icon: ListChecks, text: "Chooses what to watch, with a reason for each" },
  { icon: FileText, text: "Writes your brief" },
];

export function Setup({ theme, typed = false, filled = false, blank = false }: { theme?: string; typed?: boolean; filled?: boolean; blank?: boolean }) {
  const [beat, setBeat] = useState(filled ? recordedBeat : "");
  const [missing, setMissing] = useState(blank);
  return (
    <Page>
      <Masthead title={setup.title} badge={false} note={SAMPLE_NOTE} />
      <main className="w-full px-4 pt-4 pb-14 lg:px-7">
        <p className="text-[13.5px] text-t3">Your free week starts when your agent is ready and includes {status.poolLimit} watched X posts.</p>
        <Lifted strong className="mt-5 grid grid-cols-1 rounded-[14px] lg:grid-cols-[minmax(0,1fr)_440px]">
          <form
            action="/v2/newsroom/building"
            noValidate
            onSubmit={(e) => {
              if (!beat.trim()) {
                e.preventDefault();
                setMissing(true);
              }
            }}
            className="border-b border-line px-5 py-7 lg:border-r lg:border-b-0 lg:px-8"
          >
            {theme ? <input type="hidden" name="theme" value={theme} /> : null}
            <Mono>{setup.handleLabel.toUpperCase()}</Mono>
            {typed ? (
              <div className="mt-2">
                <div className="flex h-11 items-center rounded-md border border-line-strong bg-[var(--well)] focus-within:border-[var(--brand)]">
                  <span className="pl-3 text-[14px] text-t3">@</span>
                  <input name="handle" placeholder={setup.handlePlaceholder} className="h-full flex-1 bg-transparent pl-0.5 text-[14px] text-t1 outline-none placeholder:text-t3" />
                </div>
                <p className="mt-1.5 text-[12.5px] text-t3">{setup.typedHelp}</p>
              </div>
            ) : (
              <div className="mt-2">
                <div className="flex h-11 items-center gap-2.5 rounded-md border border-line bg-[var(--raised)] px-3">
                  <span className="grid size-6 place-items-center rounded-full bg-[var(--brand)] text-[11px] font-semibold text-white">F</span>
                  <span className="text-[14px] font-semibold text-t1">@{HANDLE}</span>
                  <span className="text-[13px] text-t3">{profile.name}</span>
                  <BadgeCheck className="ml-auto size-4 text-[var(--ok)]" aria-label="From your sign-in" />
                </div>
                <p className="mt-1.5 text-[12.5px] text-t3">{setup.verifiedHelp}</p>
              </div>
            )}

            <div className="mt-6 flex items-baseline justify-between">
              <label htmlFor="beat" className="font-mono text-[10.5px] tracking-[0.08em] text-t3">
                {setup.beatLabel.toUpperCase()}
              </label>
              <span aria-live="polite" className="font-mono text-[11px] tabular-nums text-t3">
                {beat.length}/{setup.beatMax}
              </span>
            </div>
            <textarea
              id="beat"
              name="beat"
              value={beat}
              maxLength={setup.beatMax}
              onChange={(e) => {
                setBeat(e.target.value);
                if (e.target.value.trim()) setMissing(false);
              }}
              placeholder={setup.beatPlaceholder}
              aria-invalid={missing || undefined}
              aria-describedby={missing ? "beat-error" : undefined}
              className={cn(
                "mt-2 min-h-[112px] w-full resize-none rounded-md border border-line-strong bg-[var(--well)] px-3.5 py-3 text-[16px] leading-[1.5] text-t1 outline-none placeholder:text-t3 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]",
                missing && "border-[var(--error)]",
              )}
            />
            {missing ? (
              <p id="beat-error" className="mt-1.5 text-[12.5px] text-[var(--error)]">
                {setup.beatRequired}
              </p>
            ) : null}
            <button type="submit" className={cn(primaryClass, "mt-5 h-11 w-full text-[14px]")}>
              {setup.submit}
            </button>

            <div className="mt-7 overflow-hidden rounded-lg border border-line">
              <div className="flex h-9 items-center border-b border-line bg-[var(--raised)]/70 px-3.5 font-mono text-[10.5px] tracking-[0.08em] text-t3">
                WHAT HAPPENS NEXT
              </div>
              <ol>
                {steps.map(({ icon: Icon, text, kinds }, i) => (
                  <li key={text} className="flex items-center gap-3 border-b border-line-soft px-3.5 py-2.5 last:border-b-0">
                    <span className="w-4 font-mono text-[11px] text-t3">{i + 1}</span>
                    <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-[var(--raised)] text-t2">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-[13px] text-t1">{text}</span>
                    {kinds ? (
                      <span className="ml-auto flex shrink-0 gap-1">
                        <KindChip kind="post" label="X" />
                        <KindChip kind="article" label="RSS" />
                        <KindChip kind="article" label="Web" />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </form>
          <Account />
        </Lifted>
      </main>
    </Page>
  );
}

function Account() {
  return (
    <div className="bg-[var(--rail)] px-7 py-7">
      <div className="flex items-center justify-between">
        <Mono>THE ACCOUNT YOUR AGENT READS</Mono>
        <XLogo className="size-3 text-[var(--kind-post)]" />
      </div>
      <div className="mt-3 rounded-lg border border-line bg-[var(--window)] p-4" style={{ boxShadow: "var(--card-shadow), var(--top-light)" }}>
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-[var(--brand)] text-[17px] font-semibold text-white">F</span>
          <div>
            <p className="text-[15px] font-semibold text-t1">{profile.name}</p>
            <p className="text-[13px] text-t3">{profile.handle}</p>
          </div>
        </div>
        <p className="mt-3 text-[13.5px] leading-[1.5] text-t2">{profile.bio}</p>
        <div className="mt-3 rounded-md border border-line bg-[var(--well)] p-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-t3">
            <Pin className="size-3" /> PINNED
          </p>
          <p className="mt-1 text-[13px] leading-[1.5] text-t1">{profile.pinned.text}</p>
        </div>
      </div>
      <Mono className="mt-5">NEWEST POSTS</Mono>
      <ul className="mt-2 space-y-2">
        {posts.map((p) => (
          <li key={p.id} className="rounded-lg border border-line bg-[var(--window)] p-3" style={{ boxShadow: "var(--top-light)" }}>
            <p className="flex items-center gap-2 text-[11.5px] text-t3">
              <span className="font-mono">{p.date.slice(5).replace("-", "/")}</span>
              <span className="rounded-[4px] bg-[var(--kind-post-soft)] px-1.5 py-px text-[10.5px] text-[var(--kind-post)]">
                {p.kind === "quote" ? "Quote" : p.kind === "thread" ? `Thread, ${p.parts} posts` : "Post"}
              </span>
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.5] whitespace-pre-line text-t1">{p.text}</p>
            {p.quoted ? (
              <p className="mt-2 rounded-md border border-line bg-[var(--well)] px-2.5 py-2 text-[12.5px] text-t2">
                <span className="font-medium text-[var(--kind-post)]">{p.quoted.author}</span> {p.quoted.text}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-t3">
        <CalendarDays className="size-3.5" /> Read once, while your agent is built.
      </p>
    </div>
  );
}
