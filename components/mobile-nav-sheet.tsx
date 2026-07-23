"use client";

// components/mobile-nav-sheet.tsx
//
// The <760px replacement for the desk sub-nav's centered tabs: a hamburger button
// (shown only narrow, via `md:hidden` at the call site — no ResizeObserver) opening a
// top `Sheet` with the desk name and the SAME three Links `DESK_TABS` defines, at the
// same URLs — one URL tree, no parallel nav model.

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DESK_TABS } from "@/app/agents/[id]/desk-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNavSheet({
  deskId,
  deskLabel,
  needsReviewCount,
}: {
  readonly deskId: string;
  readonly deskLabel: string;
  readonly needsReviewCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button aria-label="Open desk navigation" size="icon-sm" variant="ghost">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent className="h-auto" side="top">
        <SheetHeader>
          <SheetTitle>{deskLabel}</SheetTitle>
        </SheetHeader>
        <nav aria-label="Desk sections" className="flex flex-col gap-1 px-4 pb-4">
          {DESK_TABS.map((tab) => {
            const href = tab.href(deskId);
            const active = tab.exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                className={cn(
                  "flex h-11 items-center justify-between rounded-md px-3 text-sm font-medium",
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                href={href}
                key={tab.label}
                onClick={() => setOpen(false)}
              >
                {tab.label}
                {tab.label === "Feed" && needsReviewCount > 0 ? (
                  <Badge
                    className="h-4 min-w-4 justify-center px-1 font-mono text-[10px] tabular-nums"
                    variant="secondary"
                  >
                    {needsReviewCount}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
