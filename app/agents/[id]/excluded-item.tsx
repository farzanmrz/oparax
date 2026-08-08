"use client";

// An excluded post never reached drafting, so this card is the feed card minus its story and
// draft zones: the source-tinted identity strip, the RAW source text (there is no translation
// or synthesis to show), and the exclusion reason — the reason is the point of the page.
import { GlobeIcon } from "lucide-react";
import { useState } from "react";
import type { ExcludedPost } from "@/lib/agent/excluded-query";
import { cn } from "@/lib/utils";
import { RelativeTime } from "./relative-time";

function SourceIcon({ isX, faviconUrl }: { isX: boolean; faviconUrl: string | null }) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  if (isX) {
    return (
      <svg aria-hidden="true" fill="currentColor" height="12" viewBox="0 0 24 24" width="12">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
      </svg>
    );
  }
  if (!faviconUrl || faviconFailed) {
    return <GlobeIcon aria-hidden="true" className="size-[13px] text-[oklch(0.82_0.05_85)]" />;
  }
  return (
    // biome-ignore lint/performance/noImgElement: a 13px third-party favicon gains nothing from next/image proxying
    <img
      alt=""
      aria-hidden="true"
      className="size-[13px] rounded-[3px]"
      onError={() => setFaviconFailed(true)}
      referrerPolicy="no-referrer"
      src={faviconUrl}
    />
  );
}

export function ExcludedItemCard({ item }: { item: ExcludedPost }) {
  const { sourcePost } = item;
  const isX = sourcePost.source === "x";
  const label = isX
    ? sourcePost.authorHandle
      ? `@${sourcePost.authorHandle}`
      : "X source"
    : (sourcePost.siteName ?? "News source");
  const href = isX
    ? sourcePost.authorHandle && sourcePost.xPostId
      ? `https://x.com/${sourcePost.authorHandle}/status/${sourcePost.xPostId}`
      : null
    : sourcePost.url;
  const labelClass = cn(
    "shrink-0 whitespace-nowrap font-medium desk:min-w-0 desk:shrink desk:truncate",
    isX ? "text-text-handle-x" : "text-text-handle-news",
  );

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] shadow-[var(--card-shadow)]">
      <div
        className={cn(
          "flex h-[var(--strip-h-mobile)] items-center gap-2 rounded-t-lg border-b border-[var(--band-border)] px-[18px] text-[13.5px] desk:h-[var(--strip-h-web)] desk:px-[14px] desk:text-[12.5px]",
          isX ? "bg-[image:var(--strip-x-grad)]" : "bg-[image:var(--strip-news-grad)]",
        )}
      >
        <span className="shrink-0">
          <SourceIcon faviconUrl={sourcePost.faviconUrl} isX={isX} />
        </span>
        {href ? (
          <a
            className={cn(labelClass, "hover:underline")}
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {label}
          </a>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
        <span className="min-w-0 flex-1" />
        <span className="shrink-0 whitespace-nowrap text-[13px] text-text-muted desk:text-xs">
          <RelativeTime iso={sourcePost.postedAt ?? item.excludedAt} />
        </span>
      </div>
      <p className="line-clamp-3 whitespace-pre-wrap px-[14px] pt-4 pb-[17px] text-[13.5px] leading-[1.6] text-text-body desk:px-6 desk:pb-[19px] desk:text-[14.5px]">
        {sourcePost.text}
      </p>
      <p className="border-t border-[var(--band-border)] bg-[var(--band-bg)] px-[14px] py-3 text-[12.5px] text-text-muted desk:px-6">
        {item.onBeatReason}
      </p>
    </article>
  );
}

export function ExcludedEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] px-4 py-14 text-center">
      <h3 className="text-sm font-semibold text-text-title">Nothing Excluded Yet</h3>
      <p className="mx-auto max-w-sm text-pretty text-sm text-text-muted">
        Posts the model judges off this desk&apos;s beat will show up here, with the reason it gave.
      </p>
    </div>
  );
}

export function ExcludedLoadError() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-grad-top),var(--card-grad-bottom))] px-4 py-14">
      <p className="text-sm text-danger-text">
        Couldn&apos;t load excluded posts. Try refreshing this tab.
      </p>
    </div>
  );
}
