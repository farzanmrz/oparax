"use client";

import { useState } from "react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import { day, hostOf, releaseLines, releaseMeta, type FeedItem, type Story } from "./data";
import { GitHubMark, ItemMark, XAvatar } from "./marks";

// The media slot of a Newsroom row. Every row carries one visual object of the same footprint, so items with
// and without images sit together: the article's own image when it has one; otherwise the Twitter post itself, the
// GitHub release's stored lines, or the article's own title and address as an article card.

export function StoryMedia({ story, className, tall = false }: { story: Story; className?: string; tall?: boolean }) {
  const withImage = story.items.find((i) => i.image) ?? null;
  const image = story.card.image ?? withImage?.image ?? null;
  const frame = "relative overflow-hidden rounded-lg border border-line";
  if (image) return <ItemImage src={image} className={cn(frame, tall ? "aspect-[16/10]" : "aspect-[16/9]", className)} />;
  const box = cn(frame, tall ? "min-h-[150px]" : "min-h-[124px]", className);
  const item = story.items[0];
  if (item.kind === "github") return <ReleaseBlock className={box} />;
  if (item.kind === "post") return <PostBlock item={item} className={box} />;
  return <ArticleBlock item={item} className={box} />;
}

export function ItemImage({ src, className, alt = "" }: { src: string; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("bg-[var(--well)]", className)}>
      {failed ? null : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      )}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]" />
    </div>
  );
}

export function PostBlock({ item, className }: { item: FeedItem; className?: string }) {
  const lines = item.text.split("\n").filter(Boolean);
  return (
    <div className={cn("flex flex-col bg-[var(--well)] p-3", className)}>
      <div className="flex items-center gap-2">
        <XAvatar handle={item.author ?? ""} size={20} />
        <span className="min-w-0 truncate text-[12px] font-semibold text-t1">{item.publisher}</span>
        <span className="truncate text-[11.5px] text-t3">{item.author}</span>
        <XLogo className="ml-auto size-3 shrink-0 text-[var(--kind-post)]" />
      </div>
      <div className="mt-2 space-y-1 text-[12px] leading-[1.45] text-t2">
        {lines.map((l) => (
          <p key={l} className={cn(/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/.test(l) && "text-[var(--kind-post)]")}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}

export function ReleaseBlock({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col bg-[var(--well)] p-3", className)}>
      <div className="flex items-center gap-2">
        <span className="grid size-5 shrink-0 place-items-center rounded-[5px] bg-[var(--kind-github-soft)] text-[var(--kind-github)]">
          <GitHubMark className="size-3.5" />
        </span>
        <span className="text-[12px] font-semibold whitespace-nowrap text-t1">{releaseMeta.repo}</span>
      </div>
      <p className="mt-1.5 flex items-center gap-2 text-[11.5px] text-t3">
        <span className="rounded-[5px] border border-line-strong px-1.5 py-px font-mono text-[10.5px] text-t1">{releaseMeta.tag}</span>
        {releaseMeta.description}
      </p>
      <div className="mt-2 space-y-1 border-t border-line pt-2 font-mono text-[10.5px] leading-[1.5] text-t2">
        {releaseLines.map((l) => {
          const [text, pr] = l.split(": ");
          return (
            <p key={l}>
              {text.startsWith("[Breaking]") ? (
                <>
                  <span className="text-[var(--caution)]">[Breaking]</span>
                  {text.slice(10)}
                </>
              ) : (
                text
              )}{" "}
              <span className="text-[var(--brand)]">{pr}</span>
            </p>
          );
        })}
      </div>
      <p className="mt-auto pt-1 font-mono text-[10px] tracking-[0.06em] text-t3">RELEASED {day(releaseMeta.released).toUpperCase()}</p>
    </div>
  );
}

export function ArticleBlock({ item, className }: { item: FeedItem; className?: string }) {
  return (
    <div className={cn("flex flex-col border-l-2 border-l-[var(--kind-article)] bg-[var(--well)] p-3", className)}>
      <div className="flex items-center gap-1.5 text-[11.5px] text-t3">
        <ItemMark item={item} size={16} />
        <span className="truncate font-medium text-t2">{item.publisher}</span>
      </div>
      <p className="mt-2 text-[13px] leading-[1.42] font-medium text-t1">{item.title}</p>
      <p className="mt-auto truncate pt-1 font-mono text-[10.5px] text-[var(--kind-article)]">{hostOf(item.url)}</p>
    </div>
  );
}
