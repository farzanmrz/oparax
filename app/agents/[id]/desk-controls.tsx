"use client";

// app/agents/[id]/desk-controls.tsx
//
// The desk sub-nav's interactive leaves: `DeskTabs` (the Feed/Voice/Setup/Excluded nav,
// active state via usePathname) and `DeskControls` (the pause/resume + delete icon buttons).
// `DESK_TABS` is exported so all desk-scoped tab surfaces render the SAME four
// links at the SAME URLs — one URL tree, no parallel nav model.

import {
  EyeOffIcon,
  FileTextIcon,
  MicVocalIcon,
  PauseIcon,
  PlayIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatBadgeCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteDesk, pauseDesk, resumeDesk } from "./actions";

export const DESK_TABS = [
  {
    label: "Feed",
    icon: FileTextIcon,
    href: (id: string) => `/agents/${id}`,
    exact: true,
  },
  {
    label: "Voice",
    icon: MicVocalIcon,
    href: (id: string) => `/agents/${id}/voice`,
    exact: false,
  },
  {
    label: "Setup",
    icon: SettingsIcon,
    href: (id: string) => `/agents/${id}/setup`,
    exact: false,
  },
  {
    label: "Excluded",
    icon: EyeOffIcon,
    href: (id: string) => `/agents/${id}/excluded`,
    exact: false,
  },
] as const;

export function isDeskTabActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** The Feed/Voice/Setup/Excluded tab nav, wide layout (`hidden md:flex` at the call site). */
export function DeskTabs({
  deskId,
  needsReviewCount,
}: {
  readonly deskId: string;
  readonly needsReviewCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Agent sections" className="flex items-center gap-1">
      {DESK_TABS.map((tab) => {
        const href = tab.href(deskId);
        const active = isDeskTabActive(pathname, href, tab.exact);
        const badgeCount = tab.label === "Feed" && needsReviewCount > 0 ? needsReviewCount : 0;
        return (
          <Link
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium",
              active
                ? "bg-white/10 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={href}
            key={tab.label}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
            {badgeCount > 0 ? (
              <Badge
                className="h-4 min-w-4 justify-center px-1 font-mono text-[10px] tabular-nums"
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

/**
 * Pause/resume (reversible → `Dialog` confirm) and delete (irreversible → `AlertDialog`
 * confirm) for one desk. Both use `useTransition` for pending state and surface a
 * `{ ok: false }` error inline in the open dialog rather than throwing — `deleteDesk`
 * redirects on success, so there's no success state to render for it.
 */
export function DeskControls({
  deskId,
  status,
}: {
  readonly deskId: string;
  readonly status: string;
}) {
  const isLive = status === "active";
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePauseResume() {
    setPauseError(null);
    startTransition(async () => {
      const result = isLive ? await pauseDesk(deskId) : await resumeDesk(deskId);
      if (!result.ok) {
        setPauseError(result.error);
        return;
      }
      setPauseOpen(false);
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteDesk(deskId);
      // A success never returns here — deleteDesk redirects. Only a failure reaches
      // this line, so any returned result is by construction { ok: false }.
      if (!result.ok) setDeleteError(result.error);
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Dialog
        onOpenChange={(open) => {
          setPauseOpen(open);
          if (!open) setPauseError(null);
        }}
        open={pauseOpen}
      >
        <DialogTrigger asChild>
          <Button
            aria-label={isLive ? "Pause this agent" : "Resume this agent"}
            className={
              isLive ? "text-warning hover:text-warning" : "text-success hover:text-success"
            }
            size="icon-sm"
            variant="ghost"
          >
            {isLive ? <PauseIcon /> : <PlayIcon />}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isLive ? "Pause this agent?" : "Resume this agent?"}</DialogTitle>
            <DialogDescription>
              {isLive
                ? "While paused, Oparax stops watching the beat — nothing is scanned and nothing is posted automatically."
                : "Oparax will start watching the beat again and drafting — and posting on your behalf where your settings allow it."}
            </DialogDescription>
          </DialogHeader>
          {pauseError ? <p className="text-sm text-destructive">{pauseError}</p> : null}
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={handlePauseResume}
              variant={isLive ? "outline" : "default"}
            >
              {isPending ? "Working…" : isLive ? "Pause agent" : "Resume agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
        open={deleteOpen}
      >
        <AlertDialogTrigger asChild>
          <Button
            aria-label="Delete this agent"
            className="text-destructive hover:text-destructive"
            size="icon-sm"
            variant="ghost"
          >
            <Trash2Icon />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the agent and every draft in it. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button disabled={isPending} onClick={handleDelete} variant="destructive">
              {isPending ? "Deleting…" : "Delete agent"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
