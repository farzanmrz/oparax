import { AccountMenu } from "@/components/account-menu";
import { DeskSwitcher, type SwitcherDesk } from "@/components/desk-switcher";
import { OparaxMark } from "@/components/logo";
import { Separator } from "@/components/ui/separator";

/**
 * The desk-agnostic site chrome shown on every /agents/* page: a sticky
 * 56px topbar with the Oparax mark, the desk switcher, and the account
 * menu. Replaces the old collapsible sidebar — with no offcanvas panel to
 * hide behind, this header is itself the way-back-to-nav guarantee on every
 * page under /agents. The center section tabs (Feed/Voice/Setup) are NOT
 * rendered here — they belong to the desk layout (a later task), which
 * renders them below this header.
 */
export function SiteHeader({
  desks,
  username,
}: {
  readonly desks: SwitcherDesk[];
  readonly username: string;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-2">
          <OparaxMark className="size-5 text-foreground" />
          <span className="text-[19px] font-bold tracking-tight">Oparax</span>
        </span>
        <Separator className="h-4" orientation="vertical" />
        <DeskSwitcher desks={desks} />
      </div>
      <AccountMenu username={username} />
    </header>
  );
}
