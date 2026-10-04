"use client";

import { Globe, Mail, MessageSquareText, Rss } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { logoSrc, type Channel, type LogoId, type Source } from "../content";

export function OparaxMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true" className={cn("size-6", className)}>
      <path
        d="M 431.77 811.44 A 310 310 0 0 1 431.77 212.56 M 592.23 212.56 A 310 310 0 0 1 592.23 811.44"
        fill="none"
        stroke="currentColor"
        strokeWidth="73"
        strokeLinecap="round"
      />
      <circle cx="512" cy="512" r="132" fill="currentColor" />
    </svg>
  );
}

// The X bot avatar: white Oparax mark on black, matching the X account (owner annotation 8).
export function BotAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-black text-white", className)}
      aria-hidden="true"
    >
      <OparaxMark className="size-[62%]" />
    </span>
  );
}

const genericIcons = { web: Rss, sms: MessageSquareText, email: Mail } as const;

// Consistent rounded-square tile; official artwork keeps its own colors inside it.
export function LogoTile({
  channel,
  size = 44,
  className,
}: {
  channel: Channel;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (channel.id in genericIcons) {
    const Icon = genericIcons[channel.id as keyof typeof genericIcons];
    return (
      <span
        style={style}
        className={cn(
          "grid shrink-0 place-items-center rounded-[22%] border border-border bg-card text-primary shadow-[0_1px_2px_rgb(9_15_29/0.08)]",
          className,
        )}
        aria-hidden="true"
      >
        <Icon className="size-[48%]" strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <span
      style={style}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-[22%] border border-border bg-white shadow-[0_1px_2px_rgb(9_15_29/0.08)]",
        className,
      )}
      aria-hidden="true"
    >
      <img src={logoSrc[channel.id as LogoId]} alt="" className="size-full object-cover" />
    </span>
  );
}

const favicons: Record<string, string> = {
  "https://esawebb.org": "/examples/esa-webb-favicon.ico",
  "https://www.esa.int": "/examples/esa-favicon.ico",
  "https://www.nasa.gov": "/examples/nasa-favicon.png",
  "https://science.nasa.gov": "/examples/nasa-favicon.png",
};

// Real publisher favicon, or the account's real avatar for an X post.
export function SourceIcon({ source, className }: { source: Source; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src =
    source.type === "x"
      ? "/examples/nasa-x-avatar-official-normal.jpg"
      : favicons[new URL(source.url).origin];
  if (!src || failed)
    return <Globe className={cn("size-4 text-muted-foreground", className)} aria-hidden="true" />;
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={cn(
        "size-4 shrink-0 object-contain",
        source.type === "x" ? "rounded-full" : "rounded-[3px] bg-white",
        className,
      )}
    />
  );
}

export function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-4 fill-current", className)}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function sourceHost(source: Source) {
  return source.type === "x" ? "x.com" : new URL(source.url).hostname.replace(/^www\./, "");
}
