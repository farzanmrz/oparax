"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, MailCheck } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { auth } from "@/next/copy";
import { cn } from "@/lib/utils";
import { clock, day, newest, plural, sourceById, status, storiesFor, type Story } from "./data";
import { Facts, Lifted, Mono, Page, primaryClass, secondaryClass, SiteNav, StatusTile } from "./chrome";
import { GoogleMark, KindChip, SourceMark } from "./marks";
import { StoryMedia } from "./media";

// Newsroom sign up: one lifted two-pane window. Left, the account form (X, Google, or email and password,
// copy from lib/auth/content.ts). Right, in the rail tone, a preview of the feed the person is signing up
// for: three real stories as Newsroom rows with their media, and the free week and alerts as status tiles.

const field = "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[13.5px] text-t1 outline-none placeholder:text-t3 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] aria-invalid:border-[var(--error)]";

export function Signup({ theme, sent: sentParam = false }: { theme?: string; sent?: boolean }) {
  const q = theme ? `?theme=${theme}` : "";
  const [email, setEmail] = useState(sentParam ? "farzan@oparax.ai" : "");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(sentParam);
  const emailBad = tried && !/^\S+@\S+\.\S+$/.test(email);
  const pwBad = tried && pw.length < 8;
  const confirmBad = tried && (confirm === "" || confirm !== pw);

  return (
    <Page>
      <SiteNav theme={theme} active="signup" />
      <main className="flex flex-1 items-start px-4 pt-6 pb-14 lg:px-7">
        <Lifted strong className="grid w-full grid-cols-1 rounded-[14px] lg:grid-cols-[440px_minmax(0,1fr)]">
          <div className="border-b border-line px-5 py-9 lg:border-r lg:border-b-0 lg:px-9">
            {sent ? (
              <div role="status" className="flex flex-col pt-6">
                <span className="grid size-11 place-items-center rounded-lg border border-line bg-[var(--ok-soft)] text-[var(--ok)]">
                  <MailCheck className="size-5" />
                </span>
                <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.025em] text-t1">Check your email</h1>
                <p className="mt-3 text-[14px] leading-[1.6] text-t2">{auth.sent(email)}</p>
                <button type="button" onClick={() => setSent(false)} className={cn(secondaryClass, "mt-6 w-fit")}>
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.025em] text-t1">{auth.signup.title}</h1>
                <p className="mt-2 text-[13.5px] text-t2">{auth.signup.subtitle}</p>
                <div className="mt-6 grid gap-2">
                  <Link href={`/v2/newsroom/setup${q}`} className={cn(primaryClass, "h-10 w-full text-[14px]")}>
                    <XLogo className="size-3.5" /> {auth.x}
                  </Link>
                  <Link href={`/v2/newsroom/setup${q ? `${q}&` : "?"}handle=typed`} className={cn(secondaryClass, "h-10 w-full")}>
                    <GoogleMark /> {auth.google}
                  </Link>
                </div>
                <div className="my-5 flex items-center gap-3 font-mono text-[10.5px] tracking-[0.08em] text-t3">
                  <span className="h-px flex-1 bg-line" /> OR <span className="h-px flex-1 bg-line" />
                </div>
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    setTried(true);
                    if (/^\S+@\S+\.\S+$/.test(email) && pw.length >= 8 && confirm !== "" && confirm === pw) setSent(true);
                  }}
                  className="space-y-3.5"
                >
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-t2">{auth.email}</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={auth.emailPlaceholder} aria-invalid={emailBad || undefined} className={cn(field, "mt-1.5")} />
                    {emailBad ? <span className="mt-1 block text-[12px] text-[var(--error)]">Enter an email address.</span> : null}
                  </label>
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-t2">{auth.password}</span>
                    <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={pwBad || undefined} className={cn(field, "mt-1.5")} />
                    {pwBad ? <span className="mt-1 block text-[12px] text-[var(--error)]">Use at least 8 characters.</span> : null}
                  </label>
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-t2">{auth.confirm}</span>
                    <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={confirmBad || undefined} className={cn(field, "mt-1.5")} />
                    {confirmBad ? <span className="mt-1 block text-[12px] text-[var(--error)]">{confirm === "" ? "Enter the password again." : "The passwords do not match."}</span> : null}
                  </label>
                  <button type="submit" className={cn(secondaryClass, "h-10 w-full")}>
                    {auth.signup.submit}
                  </button>
                </form>
                <p className="mt-4 text-center text-[12.5px] text-t3">
                  {auth.signup.haveAccount}{" "}
                  <Link href={`/v2/newsroom/signup${q}`} className="text-[var(--brand)] hover:underline">
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>
          <Preview />
        </Lifted>
      </main>
    </Page>
  );
}

function Preview() {
  const list = storiesFor("clustered");
  const pick = ["st-gpt61-sol", "st-hf-olmocore3", "st-gh-next-15"].map((id) => list.find((s) => s.id === id)!).filter(Boolean);
  return (
    <div className="flex flex-col bg-[var(--rail)]">
      <div className="flex h-11 items-center justify-between border-b border-line px-6">
        <Mono>A FEED LIKE THE ONE YOU GET · PREVIEW DATA</Mono>
        <span className="flex items-center gap-1.5 text-[12px] text-t3">
          <span className="size-1.5 rounded-full bg-[var(--ok)]" /> Live
        </span>
      </div>
      <ul className="divide-y divide-line-soft">
        {pick.map((s) => (
          <MiniRow key={s.id} story={s} />
        ))}
      </ul>
      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-line px-6 py-5">
        <StatusTile tone="caution" label="FREE WEEK" icon={<CalendarDays className="size-[18px]" />}>
          {status.trialDays} days, {status.poolLimit} watched Twitter posts
        </StatusTile>
        <StatusTile tone="post" label="ALERTS ON TWITTER" icon={<XLogo className="size-4" />}>
          A direct message, daily
        </StatusTile>
      </div>
    </div>
  );
}

function MiniRow({ story }: { story: Story }) {
  const last = newest(story);
  const srcs = [...new Map(story.items.map((i) => [i.sourceId, sourceById.get(i.sourceId)!])).values()];
  const kind = story.items[0].kind;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_188px] gap-5 px-6 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-t2">
          {srcs.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <SourceMark source={s} size={15} /> {s.name}
            </span>
          ))}
          <KindChip kind={kind} label={story.items.length > 1 ? plural(story.items.length, kind) : undefined} />
          <span className="ml-auto font-mono text-[10.5px] text-t3">
            {day(last.published_at)}, {clock(last.published_at)}
          </span>
        </div>
        <h3 className="mt-2 text-[15px] leading-snug font-semibold text-t1">{story.card.headline}</h3>
        <Facts story={story} size="sm" className="mt-1.5" />
      </div>
      <StoryMedia story={story} />
    </li>
  );
}
