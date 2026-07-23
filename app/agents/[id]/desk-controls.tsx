"use client";

// app/agents/[id]/desk-controls.tsx
//
// The desk sub-nav's interactive leaves: `DeskTabs` (the Feed/Voice/Setup nav, active
// state via usePathname) and `DeskControls` (the pause/resume + delete icon buttons).
// `DESK_TABS` is exported so components/mobile-nav-sheet.tsx renders the SAME three
// Links at the SAME URLs — one URL tree, no parallel nav model.

import { PauseIcon, PlayIcon, Trash2Icon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { deleteDesk, pauseDesk, resumeDesk } from "./actions";

export const DESK_TABS = [
  { label: "Feed", href: (id: string) => `/agents/${id}`, exact: true },
  { label: "Voice", href: (id: string) => `/agents/${id}/voice`, exact: false },
  { label: "Setup", href: (id: string) => `/agents/${id}/setup`, exact: false },
] as const;

/** The Feed/Voice/Setup tab nav, wide layout (`hidden md:flex` at the call site). */
export function DeskTabs({
  deskId,
  needsReviewCount,
}: {
  readonly deskId: string;
  readonly needsReviewCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Desk sections" className="flex items-center gap-1">
      {DESK_TABS.map((tab) => {
        const href = tab.href(deskId);
        const active = tab.exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
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
            aria-label={isLive ? "Pause this desk" : "Resume this desk"}
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
            <DialogTitle>{isLive ? "Pause this desk?" : "Resume this desk?"}</DialogTitle>
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
              {isPending ? "Working…" : isLive ? "Pause desk" : "Resume desk"}
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
            aria-label="Delete this desk"
            className="text-destructive hover:text-destructive"
            size="icon-sm"
            variant="ghost"
          >
            <Trash2Icon />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this desk?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the desk and every draft in it. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button disabled={isPending} onClick={handleDelete} variant="destructive">
              {isPending ? "Deleting…" : "Delete desk"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
