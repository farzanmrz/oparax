"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgentChat } from "./agent-chat";

/**
 * Create-agent experience: a slim header (back link + title) over the existing
 * eve-backed AgentChat. Once the reporter sends their first message the page is
 * "dirty"; while dirty we intercept reload / tab close (native beforeunload),
 * browser Back (popstate trap), and in-app navigation (capture-phase clicks on
 * internal links — the back link, the top-bar logo and nav) and confirm before
 * leaving. We only navigate on "Leave anyway".
 */
export function NewAgentExperience() {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  // A non-null pending target both opens the dialog and remembers where to go.
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Reload / tab close: the browser's native confirmation is the only option.
  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  // In-app navigation: catch clicks on internal links before Next routes.
  useEffect(() => {
    if (!dirty) return;
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || !href.startsWith("/") || (target && target !== "_self")) return;
      if (href === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [dirty]);

  // Browser Back: keep a trap entry on the stack and re-arm it on each attempt
  // so the reporter stays put until they confirm.
  useEffect(() => {
    if (!dirty) return;
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setPendingHref("/agents");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [dirty]);

  const handleLeave = useCallback(() => {
    const href = pendingHref ?? "/agents";
    setPendingHref(null);
    // Disarm the guards, then navigate programmatically (not a DOM click, so the
    // capture handler won't re-fire).
    setDirty(false);
    router.push(href);
  }, [pendingHref, router]);

  const handleStay = useCallback(() => setPendingHref(null), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border py-4">
        <Link
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          href="/agents"
        >
          <ArrowLeftIcon className="size-4" />
          Agents
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-border" />
        <h1 className="text-lg font-semibold leading-none tracking-tight">New agent</h1>
      </header>

      <div className="min-h-0 flex-1 py-4">
        <AgentChat onDirtyChange={setDirty} />
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setPendingHref(null);
        }}
        open={pendingHref !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave and lose this conversation?</DialogTitle>
            <DialogDescription>Your progress isn&apos;t saved yet.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleStay} variant="outline">
              Stay
            </Button>
            <Button onClick={handleLeave} variant="destructive">
              Leave anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
