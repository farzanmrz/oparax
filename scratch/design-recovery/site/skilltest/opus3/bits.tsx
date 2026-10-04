"use client";

import { Globe, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { GitHubMark, SiteIcon, XAvatar } from "@/next/council/marks";
import { cn } from "@/lib/utils";

// Shared skin for the landing test: the accepted feeds' surfaces (window, card, plate), their shadows and top
// light, and one mark per source kind. Every source kind is weighed the same, so each gets the same tile shape;
// the logo inside keeps its own color (RSS orange, Product Hunt orange-red, X and GitHub in ink).

export type SourceKind = "rss" | "website" | "x_account" | "github" | "product_hunt";

export const kindLabel: Record<SourceKind, string> = {
  rss: "RSS feed",
  website: "Website",
  x_account: "X account",
  github: "GitHub",
  product_hunt: "Product Hunt",
};

export const RSS_ORANGE = "#f26522";

export function KindIcon({ kind, className }: { kind: SourceKind; className?: string }) {
  if (kind === "rss") return <Rss className={cn("size-3.5", className)} style={{ color: RSS_ORANGE }} strokeWidth={2.4} />;
  if (kind === "website") return <Globe className={cn("size-3.5 text-t2", className)} strokeWidth={1.9} />;
  if (kind === "x_account") return <XLogo className={cn("size-3 text-t1", className)} />;
  if (kind === "github") return <GitHubMark className={cn("size-3.5 text-[var(--kind-github)]", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/roadmap-brands/producthunt.png" alt="" className={cn("size-3.5 rounded-full", className)} />;
}

/** The source kind as a big tile, used where the five kinds are named side by side. */
export function KindTile({ kind, size = 40 }: { kind: SourceKind; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[11px] border border-line-strong bg-[var(--raised)]"
      style={{ width: size, height: size, boxShadow: "var(--top-light)" }}
    >
      <KindIcon kind={kind} className="size-[45%]" />
    </span>
  );
}

/** A source's own identity: favicon for sites and feeds, avatar for X accounts. */
export function SourceLogo({ kind, target, size = 32 }: { kind: SourceKind; target: string; size?: number }) {
  if (kind === "x_account") return <XAvatar handle={target.replace("https://x.com/", "")} size={size} />;
  if (kind === "github")
    return (
      <span
        className="grid shrink-0 place-items-center rounded-[8px] bg-[#1f2328] text-white"
        style={{ width: size, height: size }}
      >
        <GitHubMark className="size-[58%]" />
      </span>
    );
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-[8px] bg-white ring-1 ring-black/5"
      style={{ width: size, height: size }}
    >
      <SiteIcon host={new URL(target).hostname.replace(/^www\./, "")} size={Math.round(size * 0.62)} className="rounded-[3px]" />
    </span>
  );
}

export const windowStyle = { boxShadow: "var(--window-shadow), var(--top-light)" };
export const cardStyle = { boxShadow: "var(--card-shadow), var(--top-light)" };

export function Surface({
  as: Tag = "div",
  lift = "card",
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "article" | "aside";
  lift?: "card" | "window";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      {...rest}
      className={cn("relative rounded-[14px] border border-line-strong bg-[var(--window)]", className)}
      style={lift === "window" ? windowStyle : cardStyle}
    >
      {children}
    </Tag>
  );
}

/** Section heading: the claim large, the explanation beside it. */
export function SectionHead({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div id={id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,460px)] items-end gap-16">
      <h2 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.03em] text-t1">{title}</h2>
      <p className="pb-1 text-[15.5px] leading-[1.6] text-t3">{children}</p>
    </div>
  );
}

export function PrimaryButton({ children, className, icon }: { children: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-[13.5px] font-medium text-primary-foreground",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_0_0_1px_rgb(36_89_232/0.6),0_6px_18px_-6px_rgb(58_108_244/0.6)]",
        "transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

