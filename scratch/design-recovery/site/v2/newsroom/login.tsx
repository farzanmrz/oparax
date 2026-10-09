"use client";

import { CalendarDays } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { AuthForm } from "@/v2/shared/auth-form";
import { clock, day, newest, plural, sourceById, status, storiesFor, type Story } from "./data";
import { Facts, Lifted, Mono, Page, SiteNav, StatusTile } from "./chrome";
import { KindChip, SourceMark } from "./marks";
import { StoryMedia } from "./media";

// Newsroom log in and sign up: the Newsroom sign-up page (one lifted two-pane window, the feed preview in the
// rail on the right) with the form turned into one log in and sign up form.

const field = "h-10 w-full rounded-md border border-line-strong bg-[var(--well)] px-3 text-[13.5px] text-t1 outline-none placeholder:text-t3 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] disabled:opacity-100";

export function Login({ theme, initial = "login" }: { theme?: string; initial?: "login" | "signup" }) {
  return (
    <Page>
      <SiteNav theme={theme} active="signup" />
      <main className="flex flex-1 items-start px-4 pt-6 pb-14 lg:px-7">
        <Lifted strong className="grid w-full grid-cols-1 rounded-[14px] lg:grid-cols-[440px_minmax(0,1fr)]">
          <div className="border-b border-line px-5 py-9 lg:border-r lg:border-b-0 lg:px-9">
            <AuthForm base="/v2/newsroom" initial={initial} fieldClass={field} labelClass="text-[12.5px] font-medium text-t2" />
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
