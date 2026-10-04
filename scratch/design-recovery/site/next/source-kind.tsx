import { Globe, Rss } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { cn } from "@/lib/utils";
import type { Kind } from "./data/onboarding";

export const kindLabel: Record<Kind, string> = { rss: "Feed", website: "Site", x_account: "X account" };

// Generic kind marks (DESIGN.md: Lucide for categories); official brand art is reserved for platform logos.
export function KindIcon({ kind, className }: { kind: Kind; className?: string }) {
  const Icon = kind === "x_account" ? XLogo : kind === "rss" ? Rss : Globe;
  return (
    <span
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <Icon className="size-3" />
    </span>
  );
}

export function handleOf(target: string) {
  return target.replace("https://x.com/", "@").toLowerCase();
}
