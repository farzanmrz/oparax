"use client";

import { Quote } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrandIcon } from "@/components/brand-icon";
import { BandCard } from "@/components/one/band-card";
import { liftHigh } from "@/components/one/stage";
import { shimmerClass } from "@/components/one/timeline";
import { monitorContent } from "@/lib/monitor/content";
import type { PhaseState } from "@/lib/onboarding/phases";
import type { Onboarding, OnboardingPost } from "@/lib/onboarding/read";
import { cn } from "@/lib/utils";

// The run's right column, from step 2 (lab v2/one/onboarding.tsx You; owner, Nov 8: the profile moved to the rail):
// the brief as its own band card once the choosing step starts (the person's sentence, then the written summary once
// the answer is saved), above the newest posts in theirs.

const copy = monitorContent.onboarding;
const day = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );

export function RunYou({
  beat,
  brief,
  posts,
  postsState,
  chooseState,
}: {
  beat: string;
  brief: Onboarding["brief"];
  posts: Onboarding["posts"];
  postsState: PhaseState;
  chooseState: PhaseState;
}) {
  return (
    <aside aria-label={copy.you} className="grid min-w-0 gap-5">
      {chooseState !== "waiting" ? (
        <BandCard
          glyph={<Quote className="size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />}
          heading={copy.brief}
          className={cn(liftHigh, "overflow-hidden")}
        >
          <p className="text-[13px] leading-[1.45] font-medium text-t1">{beat}</p>
          {brief ? (
            <>
              <p className="mt-2.5 text-[13px] leading-[1.55] text-t2">{brief.summary}</p>
              {brief.interests.length ? (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {brief.interests.map((topic) => (
                    <li
                      key={topic}
                      className="rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 py-0.5 text-[11.5px] text-t1"
                    >
                      {topic}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : chooseState === "running" ? (
            <p className="mt-2.5 text-[13px] text-t3">
              <span
                aria-hidden="true"
                className="inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-[var(--brand)] align-middle"
              />
            </p>
          ) : null}
        </BandCard>
      ) : null}

      {postsState !== "waiting" ? (
        <BandCard
          label={copy.posts}
          glyph={<BrandIcon name="x" className="size-3.5 shrink-0 text-t1" />}
          heading={
            postsState === "running" ? (
              <Shimmer as="span" duration={1.8} className={cn(shimmerClass, "font-semibold")}>
                {copy.posts}
              </Shimmer>
            ) : (
              copy.posts
            )
          }
          bodyClassName="px-4 py-2"
        >
          <ul className="divide-y divide-line">
            {(posts ?? []).map((post) => (
              <li key={post.id} className="py-3">
                <PostBody post={post} />
              </li>
            ))}
          </ul>
        </BandCard>
      ) : null}
    </aside>
  );
}

function PostBody({ post }: { post: OnboardingPost }) {
  return (
    <>
      <span className="flex items-center gap-1.5 text-[11.5px] text-t3">
        <BrandIcon name="x" className="size-2.5 text-[var(--kind-post)]" />
        {post.kind === "quote"
          ? copy.quote
          : post.kind === "thread"
            ? copy.thread(post.parts)
            : copy.post}
        <span className="ml-auto tabular-nums">{day(post.date)}</span>
      </span>
      <span className="mt-1.5 line-clamp-6 block text-[13px] leading-[1.5] whitespace-pre-line text-t1">
        {post.text}
      </span>
      {post.quoted ? (
        <span className="mt-2 line-clamp-4 block rounded-md border border-line bg-[var(--well)] px-2.5 py-1.5 text-[12px] leading-[1.45] text-t2">
          <span className="font-medium text-[var(--kind-post)]">{post.quoted.author}</span>{" "}
          {post.quoted.text}
        </span>
      ) : null}
    </>
  );
}
