"use client";

import { usePathname } from "next/navigation";
import { DeskControls, DeskTabs } from "@/app/agents/[id]/desk-controls";
import { AccountMenu } from "@/components/account-menu";
import { DeskSwitcher } from "@/components/desk-switcher";
import { OparaxMark } from "@/components/logo";
import { MobileDeskTabs } from "@/components/mobile-desk-tabs";
import { Separator } from "@/components/ui/separator";

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

  return (
    <div className="sticky top-0 z-40 bg-card">
      <header className="relative flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4 sm:px-6 md:gap-3">
        <div className="flex min-w-0 items-center gap-1.5 md:gap-3">
          <span className="flex items-center gap-2">
            <OparaxMark className="size-5 text-foreground" />
            <span className="hidden font-bold text-[19px] tracking-tight md:inline">Oparax</span>
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
          <div className="-translate-x-1/2 absolute left-1/2 hidden md:block">
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
