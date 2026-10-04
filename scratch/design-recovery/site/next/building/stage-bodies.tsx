"use client";

import { Pin, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Plan, PlanContent, PlanDescription, PlanHeader, PlanTitle } from "@/components/ai-elements/plan";
import {
  Queue,
  QueueItem,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from "@/components/ai-elements/queue";
import { cn } from "@/lib/utils";
import {
  brief,
  chosenAccounts,
  chosenSites,
  DAYS,
  keptAccounts,
  keptSites,
  posts,
  postsRead,
  profile,
  SITES_MAX,
} from "../data/onboarding";
import { KindIcon, kindLabel } from "../source-kind";

const inset = "rounded-lg border border-border bg-card";
const day = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));

/* Stage 1: AI Elements Task idea, a quick lookup that settles into the found profile. */
export function ProfileRunning() {
  return (
    <div className={cn(inset, "flex items-center gap-3 p-4")}>
      <Skeleton className="size-11 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40 bg-muted" />
        <Skeleton className="h-3 w-72 bg-muted" />
      </div>
    </div>
  );
}

export function ProfileResult() {
  return (
    <div className={cn(inset, "flex items-start gap-3.5 p-4")}>
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-muted text-base font-semibold"
        aria-hidden="true"
      >
        {profile.name[0]}
      </span>
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{profile.name}</span>
          <span className="ml-1.5 text-muted-foreground">{profile.handle}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>
      </div>
    </div>
  );
}

/* Stage 2: posts read, as compact rows. Replies and reposts are excluded by the X request itself. */
// Round 2 item R2-4: no count derived from the animation; the run does not report progress per post.
export function PostsRunning() {
  return (
    <p className="text-sm text-muted-foreground">
      Reading your newest posts from the last {DAYS} days and your pinned post.
    </p>
  );
}

const kindName = { original: "Post", quote: "Quote", thread: "Thread" } as const;

export function PostsResult() {
  const rows = [{ ...profile.pinned, pinned: true, quoted: undefined, parts: undefined }, ...posts.map((p) => ({ ...p, pinned: false }))];
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Read your {postsRead} newest posts from the last {DAYS} days and your pinned post. Reposts and replies to other people are not read.
      </p>
      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {rows.map((post) => (
          <li key={post.id} className="flex gap-4 px-4 py-3">
            <span className="w-14 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">{day(post.date)}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {post.pinned ? <Pin className="size-3" aria-hidden="true" /> : null}
                {post.pinned ? "Pinned" : kindName[post.kind]}
                {post.parts ? `, ${post.parts} parts` : null}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm">{post.text.replace(/\n+/g, " ")}</p>
              {post.quoted ? (
                <p className="mt-1.5 flex gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                  <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-foreground">{post.quoted.author}</span> {post.quoted.text}
                  </span>
                </p>
              ) : null}
            </div>
          </li>
        ))}
        <li className="px-4 py-2.5 pl-22 text-xs text-muted-foreground">
          {postsRead - posts.length} more posts read
        </li>
      </ul>
    </div>
  );
}

/* Stage 4: AI Elements Queue, two sections of picks, each with its one-sentence reason. */
export function ChooseRunning() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1].map((col) => (
        <div key={col} className="space-y-2 rounded-lg border border-border p-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full bg-muted/70" />
          ))}
        </div>
      ))}
    </div>
  );
}

function Pick({ name, sub, why, kind }: { name: string; sub: string; why: string; kind: "rss" | "website" | "x_account" }) {
  return (
    <QueueItem className="gap-1 px-2 py-2 hover:bg-transparent">
      <span className="flex items-center gap-2">
        <KindIcon kind={kind} className="size-5" />
        <span className="truncate text-sm font-medium text-foreground">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{sub}</span>
      </span>
      <span className="pl-7 text-[13px] leading-snug text-muted-foreground">{why}</span>
    </QueueItem>
  );
}

export function ChooseResult() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Chosen from the shortlist: up to {SITES_MAX} sites and feeds, and the X accounts that fit, each with the reason.
      </p>
      <div className="mt-3 grid grid-cols-2 items-start gap-3">
        <Queue className="bg-card px-2">
          <QueueSection>
            <QueueSectionTrigger className="bg-transparent px-2 text-foreground">
              <QueueSectionLabel count={chosenSites.length} label={`sites and feeds, chosen from ${keptSites} shortlisted`} />
            </QueueSectionTrigger>
            <QueueSectionContent>
              <ul className="pb-1">
                {chosenSites.map((s) => (
                  <Pick key={s.id} name={s.name} sub={`${kindLabel[s.kind]}, ${s.focus}`} why={s.why} kind={s.kind} />
                ))}
              </ul>
            </QueueSectionContent>
          </QueueSection>
        </Queue>
        <Queue className="bg-card px-2">
          <QueueSection>
            <QueueSectionTrigger className="bg-transparent px-2 text-foreground">
              <QueueSectionLabel count={chosenAccounts.length} label={`X accounts, chosen from ${keptAccounts} shortlisted`} />
            </QueueSectionTrigger>
            <QueueSectionContent>
              <ul className="pb-1">
                {chosenAccounts.map((a) => (
                  <Pick key={a.id} name={a.handle} sub={a.name} why={a.why} kind="x_account" />
                ))}
              </ul>
            </QueueSectionContent>
          </QueueSection>
        </Queue>
      </div>
    </div>
  );
}

/* Stage 5: AI Elements Plan; title and summary shimmer while the brief is written. */
export function BriefBody({ streaming }: { streaming: boolean }) {
  return (
    <Plan isStreaming={streaming} defaultOpen className="gap-3 rounded-lg ring-border">
      <PlanHeader>
        <div className="space-y-1.5">
          <PlanTitle className="text-sm font-semibold">Your brief</PlanTitle>
          <PlanDescription className="text-sm leading-relaxed text-foreground/90">{brief.summary}</PlanDescription>
        </div>
      </PlanHeader>
      {streaming ? null : (
        <PlanContent className="space-y-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 w-20 text-muted-foreground">Interests</span>
            {brief.interests.map((t) => (
              <Badge key={t} variant="secondary" className="h-6 px-2.5 text-xs">
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 w-20 text-muted-foreground">Languages</span>
            {brief.languages.map((t) => (
              <Badge key={t} variant="secondary" className="h-6 px-2.5 text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </PlanContent>
      )}
    </Plan>
  );
}

export function RunningLine({ children }: { children: string }) {
  return <Shimmer as="span" className="text-sm">{children}</Shimmer>;
}
