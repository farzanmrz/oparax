"use client";

// app/agents/[id]/mobile tabs re-implemented as a persistent bar for narrow screens.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESK_TABS, isDeskTabActive } from "@/app/agents/[id]/desk-controls";
import { Badge } from "@/components/ui/badge";
import { formatBadgeCount } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MobileDeskTabs({
  deskId,
  needsReviewCount,
}: {
  readonly deskId: string;
  readonly needsReviewCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Agent sections"
      className="flex h-11 w-full border-b border-white/10 desk:hidden"
    >
      {DESK_TABS.map((tab) => {
        const href = tab.href(deskId);
        const active = isDeskTabActive(pathname, href, tab.exact);
        const Icon = tab.icon;
        const badgeCount = tab.label === "Feed" && needsReviewCount > 0 ? needsReviewCount : 0;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              // Four tabs share a 375px row, so the padding and gap are sized to fit the
              // longest label ("Sources") plus Feed's count badge without truncating — the
              // same no-truncation rule DESIGN.md sets for mobile source names.
              "relative z-10 flex min-h-11 min-w-0 flex-auto items-center justify-center gap-0.5 px-2 text-[12px] font-medium outline-offset-2 transition",
              active
                ? "text-foreground before:absolute before:inset-x-2 before:-bottom-px before:h-0.5 before:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={href}
            key={tab.label}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{tab.label}</span>
            {badgeCount > 0 ? (
              <Badge
                className="h-4 min-w-4 shrink-0 justify-center px-0.5 font-mono text-[10px] tabular-nums"
                variant="secondary"
              >
                {formatBadgeCount(badgeCount)}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
