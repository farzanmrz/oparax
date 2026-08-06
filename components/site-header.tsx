"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DeskControls, DeskTabs } from "@/app/agents/[id]/desk-controls";
import { AccountMenu } from "@/components/account-menu";
import { DeskSwitcher } from "@/components/desk-switcher";
import { OparaxMark } from "@/components/logo";
import { MobileDeskTabs } from "@/components/mobile-desk-tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * Condense-on-scroll: the topbar shrinks to a compact strip on scroll-down and expands back
 * on any scroll-up or at top. The app scrolls an inner container (not the window), tagged
 * `data-app-scroll-region` in app/agents/layout.tsx — the listener attaches there. Presentation
 * only: no element is added or removed, just height/size transitions.
 */
function useCondensedOnScroll() {
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll-region]");
    if (!scroller) return;
    let lastY = scroller.scrollTop;
    const onScroll = () => {
      const y = scroller.scrollTop;
      const goingDown = y > lastY;
      lastY = y;
      if (y < 24) setCondensed(false);
      else if (goingDown && y > 72) setCondensed(true);
      else if (!goingDown) setCondensed(false);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);
  return condensed;
}

export type HeaderDesk = {
  id: string;
  name: string | null;
  beat: string;
  status: string;
  needsReviewCount: number;
};

/**
 * The single always-on site chrome for every /agents/* page: one sticky 56px topbar. Left: the
 * Oparax mark, the desk switcher (current desk name + live/paused dot), and — when on a desk —
 * the pause/delete controls. Center (desktop): the Feed/Voice/Setup tabs for the current desk.
 * Right: the account menu.
 *
 * This is a client component so it can read `usePathname` and render the desk-scoped bits
 * (tabs, controls) only on a desk page. On desk-less pages (`/agents`, `/agents/new`,
 * `/agents/settings`) `currentDesk` is undefined, so only logo + switcher + account
 * render. This header is the way-back-to-nav guarantee on every page below /agents.
 */
export function SiteHeader({
  desks,
  username,
}: {
  readonly desks: HeaderDesk[];
  readonly username: string;
}) {
  const pathname = usePathname();
  const currentDesk = desks.find((desk) => pathname.startsWith(`/agents/${desk.id}`));
  const condensed = useCondensedOnScroll();

  return (
    <div className="sticky top-0 z-40 bg-card">
      <header
        className={cn(
          "relative flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 transition-[height] duration-300 ease-out sm:px-6 md:gap-3",
          condensed ? "h-10" : "h-14",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5 md:gap-3">
          <span className="flex items-center gap-2">
            <OparaxMark
              className={cn(
                "text-foreground transition-all duration-300",
                condensed ? "size-4" : "size-5",
              )}
            />
            <span
              className={cn(
                "hidden font-bold tracking-tight transition-all duration-300 md:inline",
                condensed ? "text-[15px]" : "text-[19px]",
              )}
            >
              Oparax
            </span>
          </span>
          <Separator className="hidden h-4 md:block" orientation="vertical" />
          <DeskSwitcher desks={desks} />
          {currentDesk ? (
            <DeskControls deskId={currentDesk.id} status={currentDesk.status} />
          ) : null}
        </div>

        {/* Tabs are absolutely centered on the viewport — a plain flex-1 center drifts right when
            the left cluster (a long desk name + controls) is wider than the right. */}
        {currentDesk ? (
          <div
            className={cn(
              "-translate-x-1/2 absolute left-1/2 hidden transition-transform duration-300 ease-out md:block",
              condensed && "scale-[0.88]",
            )}
          >
            <DeskTabs deskId={currentDesk.id} needsReviewCount={currentDesk.needsReviewCount} />
          </div>
        ) : null}

        <div className="flex items-center gap-1.5">
          <AccountMenu username={username} />
        </div>
      </header>
      {currentDesk ? (
        <MobileDeskTabs deskId={currentDesk.id} needsReviewCount={currentDesk.needsReviewCount} />
      ) : null}
    </div>
  );
}
