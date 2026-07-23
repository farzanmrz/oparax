"use client";

import { usePathname } from "next/navigation";
import { DeskControls, DeskTabs } from "@/app/agents/[id]/desk-controls";
import { AccountMenu } from "@/components/account-menu";
import { DeskSwitcher } from "@/components/desk-switcher";
import { OparaxMark } from "@/components/logo";
import { MobileNavSheet } from "@/components/mobile-nav-sheet";
import { Separator } from "@/components/ui/separator";
import { deriveDeskLabel } from "@/lib/agent/desk-label";

export type HeaderDesk = {
  id: string;
  beat: string;
  status: string;
  needsReviewCount: number;
};

/**
 * The single always-on site chrome for every /agents/* page: one sticky 56px topbar. Left: the
 * Oparax mark, the desk switcher (current desk name + live/paused dot), and — when on a desk —
 * the pause/delete controls. Center (desktop): the Feed/Voice/Setup tabs for the current desk.
 * Right: the mobile nav trigger (narrow, on a desk) + the account menu.
 *
 * This is a client component so it can read `usePathname` and render the desk-scoped bits
 * (tabs, controls) only on a desk page — replacing the old two-row layout (a desk-agnostic
 * header + a separate desk sub-nav) with the mock's single bar. On desk-less pages (/agents,
 * /agents/new, /agents/settings) `currentDesk` is undefined, so only logo + switcher + account
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
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-2">
          <OparaxMark className="size-5 text-foreground" />
          <span className="text-[19px] font-bold tracking-tight">Oparax</span>
        </span>
        <Separator className="h-4" orientation="vertical" />
        <DeskSwitcher desks={desks} />
        {currentDesk ? <DeskControls deskId={currentDesk.id} status={currentDesk.status} /> : null}
      </div>

      {currentDesk ? (
        <div className="hidden flex-1 justify-center md:flex">
          <DeskTabs deskId={currentDesk.id} needsReviewCount={currentDesk.needsReviewCount} />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center gap-1.5">
        {currentDesk ? (
          <MobileNavSheet
            deskId={currentDesk.id}
            deskLabel={deriveDeskLabel(currentDesk.beat)}
            needsReviewCount={currentDesk.needsReviewCount}
          />
        ) : null}
        <AccountMenu username={username} />
      </div>
    </header>
  );
}
