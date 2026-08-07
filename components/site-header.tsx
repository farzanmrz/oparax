"use client";

import { usePathname } from "next/navigation";
import { DeskControls, DeskTabs } from "@/app/agents/[id]/desk-controls";
import { AccountMenu } from "@/components/account-menu";
import { DeskSwitcher } from "@/components/desk-switcher";
import { useScrollHeaderStage } from "@/components/hooks/use-scroll-header-stage";
import { OparaxMark } from "@/components/logo";
import { MobileDeskTabs } from "@/components/mobile-desk-tabs";
import { Separator } from "@/components/ui/separator";
import type { AvatarKey } from "@/lib/user";
import { cn } from "@/lib/utils";

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
 * the pause/delete controls. Center (desktop): the Feed/Voice/Sources/Excluded tabs for the current desk.
 * Right: the account menu.
 *
 * This is a client component so it can read `usePathname` and render the desk-scoped bits
 * (tabs, controls) only on a desk page. On desk-less pages (`/agents`, `/agents/new`,
 * `/agents/settings`) `currentDesk` is undefined, so only logo + switcher + account
 * render. This header is the way-back-to-nav guarantee on every page below /agents.
 */
export function SiteHeader({
  avatarKey,
  desks,
  username,
}: {
  readonly avatarKey: AvatarKey;
  readonly desks: HeaderDesk[];
  readonly username: string;
}) {
  const pathname = usePathname();
  const currentDesk = desks.find((desk) => pathname.startsWith(`/agents/${desk.id}`));
  const stage = useScrollHeaderStage(Boolean(currentDesk));

  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-40 bg-[var(--header-bg)] transition-transform duration-[260ms] ease-out desk:translate-y-0 desk:transition-none",
        stage === "hidden" && "-translate-y-[101%]",
        stage === "tabs" && "-translate-y-[57px]",
        stage === "full" && "translate-y-0",
      )}
      data-has-desk={currentDesk ? "true" : "false"}
    >
      <header className="relative flex h-14 shrink-0 items-center justify-between gap-1 border-b border-white/10 px-3 desk:gap-3 desk:px-6">
        <div className="flex min-w-0 items-center gap-1 desk:gap-3">
          <span className="flex items-center gap-2">
            <OparaxMark className="size-5 text-foreground" />
            <span className="hidden font-bold text-[19px] tracking-tight desk:inline">Oparax</span>
          </span>
          <Separator className="hidden h-4 desk:block" orientation="vertical" />
          <DeskSwitcher desks={desks} />
          {currentDesk ? (
            <DeskControls deskId={currentDesk.id} status={currentDesk.status} />
          ) : null}
        </div>

        {/* Tabs are absolutely centered on the viewport — a plain flex-1 center drifts right when
            the left cluster (a long desk name + controls) is wider than the right. */}
        {currentDesk ? (
          <div className="-translate-x-1/2 absolute left-1/2 hidden desk:block">
            <DeskTabs deskId={currentDesk.id} needsReviewCount={currentDesk.needsReviewCount} />
          </div>
        ) : null}

        <div className="flex items-center">
          <AccountMenu avatarKey={avatarKey} username={username} />
        </div>
      </header>
      {currentDesk ? (
        <MobileDeskTabs deskId={currentDesk.id} needsReviewCount={currentDesk.needsReviewCount} />
      ) : null}
    </div>
  );
}
