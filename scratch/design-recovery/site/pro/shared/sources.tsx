"use client";

// Shared, restylable source and delivery pictures. Directions pass className to change surfaces;
// content and reading order stay recognizable. Pictured controls are presentational.
import { BadgeCheck, BarChart2, Heart, MessageCircle, Repeat2, ChevronLeft, Info, ImageIcon, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BotAvatar, SourceIcon, XLogo, sourceHost } from "./brand";
import { brand, dm, evidence, type Source } from "../content";

function Mentions({ text }: { text: string }) {
  return (
    <>
      {text.split(/(@\w+)/g).map((part, index) =>
        part.startsWith("@") ? (
          <span key={index} className="text-primary">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

// Recognizable X post: avatar, name, verified mark, handle, time, body, quiet action row.
export function XPost({ className, compact = false }: { className?: string; compact?: boolean }) {
  const post = evidence.post;
  return (
    <article
      aria-label={post.excerptLabel}
      className={cn("rounded-xl border border-border bg-card p-4 text-card-foreground", className)}
    >
      <header className="flex items-start gap-2.5">
        <img src={post.avatar} alt="" className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1 text-[15px] font-bold">
            {post.author}
            <BadgeCheck className="size-4 fill-[#1d9bf0] text-white" aria-label="Verified account" />
          </p>
          <p className="text-[13px] text-muted-foreground">
            {post.handle} · {evidence.date}
          </p>
        </div>
        <XLogo className="size-4 text-foreground" />
      </header>
      <p className={cn("mt-2.5 text-[15px] leading-snug", compact && "text-sm")}>
        <Mentions text={post.excerpt} />
      </p>
      {!compact && (
        <footer className="mt-3 flex justify-between pr-6 text-muted-foreground" aria-hidden="true">
          <MessageCircle className="size-4" />
          <Repeat2 className="size-4" />
          <Heart className="size-4" />
          <BarChart2 className="size-4" />
        </footer>
      )}
    </article>
  );
}

// Article card with real favicon and publisher; image optional so photo and no-photo both read.
export function ArticleCard({
  source,
  image,
  imageAlt,
  className,
}: {
  source: Source;
  image?: string;
  imageAlt?: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        className,
      )}
    >
      {image && <img src={image} alt={imageAlt ?? ""} className="w-24 shrink-0 object-cover" />}
      <div className="min-w-0 p-3.5">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SourceIcon source={source} />
          <span className="font-semibold text-foreground">{source.name}</span>
          <span aria-hidden="true">·</span>
          <span>{sourceHost(source)}</span>
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">{source.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{source.text}</p>
      </div>
    </article>
  );
}

// X direct message from the Oparax account, restyled to the shared theme. Text follows lib/alerts/pack.ts.
export function XDm({ className, onOpen }: { className?: string; onOpen?: () => void }) {
  return (
    <section
      aria-label={dm.conversationLabel}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground",
        className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
        <ChevronLeft className="size-4 text-muted-foreground" aria-hidden="true" />
        <BotAvatar className="size-8" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-bold">{brand.name}</p>
          <p className="text-xs text-muted-foreground">{brand.handle}</p>
        </div>
        <Info className="size-4 text-muted-foreground" aria-hidden="true" />
      </header>
      <div className="flex flex-1 flex-col gap-2 px-3 py-4">
        <p className="text-center text-[11px] text-muted-foreground">
          {evidence.date}
        </p>
        <div className="flex items-end gap-2">
          <BotAvatar className="size-6" />
          <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-secondary px-3.5 py-3 text-[13px] leading-snug text-secondary-foreground">
            <p>{dm.intro}</p>
            <p className="mt-2.5 font-semibold">{dm.headline}</p>
            <p className="mt-1 text-muted-foreground">{dm.fact}</p>
            {onOpen ? (
              <button type="button" onClick={onOpen} className="mt-1 text-left text-primary underline-offset-2 hover:underline">
                {dm.url}
              </button>
            ) : (
              <p className="mt-1 text-primary">{dm.url}</p>
            )}
          </div>
        </div>
      </div>
      <footer className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-muted-foreground" aria-hidden="true">
        <ImageIcon className="size-4" />
        <span className="flex-1 rounded-full bg-secondary px-3 py-1.5 text-xs">{dm.composer}</span>
        <SendHorizontal className="size-4" />
      </footer>
    </section>
  );
}

// Compact list of a story's original sources, shown once per story.
export function SourceList({ sources, className }: { sources: Source[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {sources.map((source) => (
        <li key={source.url}>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground"
          >
            <SourceIcon source={source} />
            <span className="font-medium text-foreground">{source.name}</span>
            <span className="truncate group-hover:underline">{source.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
