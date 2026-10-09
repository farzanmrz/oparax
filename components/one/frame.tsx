"use client";

// The One page frame (council, October 8): under the running header, a title band that holds only the page title
// and, on the feed, its view switch; then a 264px lifted aside at the left (the Deck's source list, or the seven steps
// on onboarding) beside the work. The aside folds away from its foot; closed, it is gone and the work spans the
// column, and one quiet control at the left of the title band brings it back. The choice is kept in this browser.

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSyncExternalStore } from "react";
import { lift } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import { cn } from "@/lib/utils";

const copy = monitorContent.aside;
const listeners = new Set<() => void>();
const key = (name: string) => `oparax:aside:${name}`;

function isClosed(name: string) {
  try {
    return localStorage.getItem(key(name)) === "closed";
  } catch {
    return false;
  }
}

function setClosed(name: string, closed: boolean) {
  try {
    if (closed) localStorage.setItem(key(name), "closed");
    else localStorage.removeItem(key(name));
  } catch {
    // Storage can be unavailable (private windows); the aside still opens and closes for this page view.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type FrameAside = {
  /** The storage name, "sources" or "steps". */
  name: string;
  /** The aside's accessible name and the word on the expand control. */
  label: string;
  body: React.ReactNode;
};

export function OneFrame({
  title,
  live = false,
  extra,
  aside,
  children,
}: {
  title: React.ReactNode;
  /** The title changes as a run moves, so it is announced. */
  live?: boolean;
  /** The one control the band may hold beside the title: the feed's view switch. */
  extra?: React.ReactNode;
  aside: FrameAside | null;
  children: React.ReactNode;
}) {
  const name = aside?.name ?? "";
  const stored = useSyncExternalStore(
    subscribe,
    () => isClosed(name),
    () => false,
  );
  const closed = aside !== null && stored;
  const open = aside !== null && !stored;
  return (
    <>
      <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-3">
        {closed ? (
          <button
            type="button"
            onClick={() => setClosed(name, false)}
            aria-expanded={false}
            className="-ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <PanelLeftOpen className="size-3.5" aria-hidden="true" />
            {aside.label}
          </button>
        ) : null}
        <h1
          aria-live={live ? "polite" : undefined}
          className="shrink-0 text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1"
        >
          {title}
        </h1>
        {extra}
      </div>
      <div
        className={cn(
          "mt-6 grid grid-cols-1 items-start gap-6",
          open && "desk:grid-cols-[264px_minmax(0,1fr)]",
        )}
      >
        {open ? (
          <aside
            aria-label={aside.label}
            className={cn(
              lift,
              "flex flex-col desk:sticky desk:top-[80px] desk:max-h-[calc(100dvh-104px)]",
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{aside.body}</div>
            <div className="border-t border-line px-2.5 py-2">
              <button
                type="button"
                onClick={() => setClosed(name, true)}
                aria-expanded
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[12px] text-t3 transition-colors hover:bg-raised hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <PanelLeftClose className="size-3.5" aria-hidden="true" />
                {copy.collapse}
              </button>
            </div>
          </aside>
        ) : null}
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
