"use client";

import * as React from "react";
import { Sidebar, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * Hover-peek for the collapsed sidebar, layered over the stock shadcn
 * primitives so components/ui/sidebar.tsx stays registry-pristine
 * (.claude/rules/components.md: vendored files get overwritten on re-add —
 * wrap, don't edit in place). Dwelling on the trigger (or the panel itself)
 * shows the sidebar as a floating overlay without pinning it open; a hide
 * grace period lets the pointer travel from the trigger into the panel.
 *
 * Why a wrapper is enough: <Sidebar> spreads className/style/mouse handlers
 * onto its fixed `data-slot="sidebar-container"` div and <SidebarTrigger>
 * spreads them onto its Button, so the overlay geometry and hover wiring
 * attach from the outside; the inner panel is styled through a child
 * selector on `data-slot="sidebar-inner"`.
 */

/** Dwell before the peek shows, so quick passes over the trigger don't flash the panel. */
const PEEK_SHOW_DELAY_MS = 1000;
/** Grace before the peek hides, so the pointer can travel from the trigger into the panel. */
const PEEK_HIDE_GRACE_MS = 300;
/**
 * Overlay top inset: clears the page-header row so the trigger stays visible
 * and clickable to pin. The layout owns the real value via the
 * `--sidebar-peek-top` custom property (set next to the content cap it also
 * owns); the literal here is only the fallback.
 */
const PEEK_INSET_TOP = "var(--sidebar-peek-top, 3.25rem)";
/** Overlay gap from the screen's bottom and side edges. */
const PEEK_INSET_EDGE = "0.5rem";

type PeekContextValue = {
  /** True while the collapsed sidebar is being previewed as a floating overlay. */
  peek: boolean;
  /** Show the floating preview (hovering the trigger or the overlay itself). */
  beginPeek: () => void;
  /** Schedule the preview to hide after a short grace period. */
  endPeek: () => void;
};

const PeekContext = React.createContext<PeekContextValue | null>(null);

function usePeek(): PeekContextValue {
  const context = React.useContext(PeekContext);
  if (!context) {
    throw new Error("usePeek must be used within a SidebarPeekProvider.");
  }
  return context;
}

function clearTimer(timer: React.RefObject<number | null>) {
  if (timer.current !== null) {
    window.clearTimeout(timer.current);
    timer.current = null;
  }
}

/** Owns the peek state and its show/hide timers. Nest inside <SidebarProvider>. */
export function SidebarPeekProvider({ children }: { children: React.ReactNode }) {
  const { isMobile, open, state } = useSidebar();
  const [peek, setPeek] = React.useState(false);
  const showTimer = React.useRef<number | null>(null);
  const hideTimer = React.useRef<number | null>(null);

  const beginPeek = React.useCallback(() => {
    clearTimer(hideTimer);
    // Nothing to preview when the sidebar is a mobile sheet or already pinned open.
    if (isMobile || state === "expanded") return;
    if (showTimer.current !== null) return;
    showTimer.current = window.setTimeout(() => {
      setPeek(true);
      showTimer.current = null;
    }, PEEK_SHOW_DELAY_MS);
  }, [isMobile, state]);

  // Always (re)schedule the hide — a redundant setPeek(false) is a React
  // bail-out no-op, and never consulting `peek` keeps this callback stable
  // and immune to the stale-closure race where a mouseleave lands between
  // the show timer's setPeek(true) and its commit.
  const endPeek = React.useCallback(() => {
    clearTimer(showTimer);
    clearTimer(hideTimer);
    hideTimer.current = window.setTimeout(() => {
      setPeek(false);
      hideTimer.current = null;
    }, PEEK_HIDE_GRACE_MS);
  }, []);

  // Pinning/collapsing or crossing the mobile breakpoint invalidates any
  // in-flight peek: reset the state and timers. The overlay visual derives
  // from `state === "collapsed" && peek`, so it already disappears in the
  // same frame as a toggle; without the isMobile reset, a peek left armed
  // across a desktop→mobile→desktop resize would re-render stranded.
  // biome-ignore lint/correctness/useExhaustiveDependencies: open/isMobile are change-triggers for the reset, not inputs read by the body.
  React.useEffect(() => {
    clearTimer(showTimer);
    clearTimer(hideTimer);
    setPeek(false);
  }, [open, isMobile]);

  React.useEffect(
    () => () => {
      clearTimer(showTimer);
      clearTimer(hideTimer);
    },
    [],
  );

  const value = React.useMemo(() => ({ peek, beginPeek, endPeek }), [peek, beginPeek, endPeek]);

  return <PeekContext.Provider value={value}>{children}</PeekContext.Provider>;
}

/**
 * The stock <Sidebar> plus the peek overlay: while collapsed and peeking, the
 * offcanvas container is pulled back on-screen as a floating panel — inline
 * styles deterministically win over the off-screen positioning classes —
 * while the layout gap stays at 0 width, so page content never shifts. The
 * overlay appears and disappears in place (transition suppressed while the
 * peek is entering or exiting) instead of riding the stock left/right slide,
 * which would flash a full-height panel on exit. While collapsed and not
 * peeking, the off-screen container is `inert` so its controls (including
 * Sign out) can't be reached by keyboard while invisible.
 */
export function PeekSidebar({
  side = "left",
  className,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, state } = useSidebar();
  const { peek, beginPeek, endPeek } = usePeek();
  const isPeeking = !isMobile && state === "collapsed" && peek;

  // Previous committed value (updated post-paint): suppressing the transition
  // on the exit frame as well as while peeking is what keeps the dismissal
  // in-place instead of a 200ms off-screen slide of a full-height panel.
  const lastPeeking = React.useRef(false);
  React.useEffect(() => {
    lastPeeking.current = isPeeking;
  });

  const overlayStyle: React.CSSProperties = {
    transition: "none",
    top: PEEK_INSET_TOP,
    bottom: PEEK_INSET_EDGE,
    height: "auto",
    ...(side === "left" ? { left: PEEK_INSET_EDGE } : { right: PEEK_INSET_EDGE }),
  };

  return (
    <Sidebar
      side={side}
      inert={!isMobile && state === "collapsed" && !peek}
      {...(isMobile
        ? undefined
        : {
            onMouseEnter: (event: React.MouseEvent<HTMLDivElement>) => {
              onMouseEnter?.(event);
              beginPeek();
            },
            onMouseLeave: (event: React.MouseEvent<HTMLDivElement>) => {
              onMouseLeave?.(event);
              endPeek();
            },
          })}
      style={
        isPeeking
          ? { ...overlayStyle, ...style }
          : lastPeeking.current
            ? { transition: "none", ...style }
            : style
      }
      className={cn(
        "motion-reduce:transition-none",
        isPeeking &&
          "border-transparent [&>[data-slot=sidebar-inner]]:rounded-lg [&>[data-slot=sidebar-inner]]:shadow-lg [&>[data-slot=sidebar-inner]]:ring-1 [&>[data-slot=sidebar-inner]]:ring-sidebar-border",
        className,
      )}
      {...props}
    />
  );
}

/** The stock <SidebarTrigger> plus hover wiring: dwelling on it opens the peek. */
export function PeekSidebarTrigger({
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ComponentProps<typeof SidebarTrigger>) {
  const { beginPeek, endPeek } = usePeek();

  return (
    <SidebarTrigger
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        beginPeek();
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        endPeek();
      }}
      {...props}
    />
  );
}
