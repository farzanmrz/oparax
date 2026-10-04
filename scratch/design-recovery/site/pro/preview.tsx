"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Moon, Sun, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProHeader, ProFooter, SignupDialog } from "./shared/shell";
import { directions } from "./content";
import type { DirectionProps, FeedMode, PageView } from "./types";
import Direction1 from "./d1";
import Direction2 from "./d2";
import Direction3 from "./d3";
import Direction4 from "./d4";

const views = [Direction1, Direction2, Direction3, Direction4];

export default function ProPreview({
  initialDirection,
  initialPage,
  initialMode,
  initialDark,
}: {
  initialDirection: number;
  initialPage: PageView;
  initialMode: FeedMode;
  initialDark: boolean;
}) {
  const [direction, setDirection] = useState(initialDirection);
  const [page, setPage] = useState<PageView>(initialPage);
  const [feedMode, setFeedMode] = useState<FeedMode>(initialMode);
  const [dark, setDark] = useState(initialDark);
  const [dialog, setDialog] = useState<"signup" | "login" | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  useEffect(() => {
    document.title = `Oparax | Pro ${direction}. ${directions[direction - 1].name} | ${page === "landing" ? "Landing" : "Feed"}`;
  }, [direction, page]);
  useEffect(() => {
    const onPop = () => {
      const query = new URLSearchParams(location.search);
      setDirection(Math.max(1, Math.min(4, Number(query.get("d")) || 1)));
      setPage(query.get("view") === "feed" ? "feed" : "landing");
      setFeedMode(query.get("mode") === "direct" ? "direct" : "clustered");
      setDark(query.get("theme") !== "light");
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  function sync(next: { d?: number; view?: PageView; mode?: FeedMode; dark?: boolean }, scroll = true) {
    const d = next.d ?? direction;
    const view = next.view ?? page;
    const mode = next.mode ?? feedMode;
    const isDark = next.dark ?? dark;
    setDirection(d);
    setPage(view);
    setFeedMode(mode);
    setDark(isDark);
    const query = new URLSearchParams({ d: String(d), view });
    if (view === "feed") query.set("mode", mode);
    if (!isDark) query.set("theme", "light");
    history.pushState(null, "", `/pro?${query}`);
    if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
  }

  const props: DirectionProps = {
    page,
    dark,
    feedMode,
    onFeedMode: (mode) => sync({ view: "feed", mode }, false),
    onFeed: () => sync({ view: "feed" }),
    onLanding: () => sync({ view: "landing" }),
    onSignup: () => setDialog("signup"),
  };
  const View = views[direction - 1];

  return (
    // Wide screens: the dock floats inside the header beside Log In, so it never covers page content.
    // Narrower screens: it is a slim bar pinned under the header, and the page starts below it.
    <div className="flex min-h-dvh flex-col">
      <ProHeader {...props} onLogin={() => setDialog("login")} onTheme={() => sync({ dark: !dark }, false)} />
      <div aria-hidden="true" className="h-[53px] shrink-0 min-[1280px]:hidden" />
      <View key={`${direction}:${page}`} {...props} />
      <ProFooter />
      <aside
        aria-label="Pro Exploration preview controls"
        className={cn(
          "fixed z-50 flex items-center gap-1 bg-popover/95 p-1 text-popover-foreground backdrop-blur-md",
          "inset-x-0 top-15 justify-center border-b border-border",
          "min-[1280px]:inset-x-auto min-[1280px]:top-[9px] min-[1280px]:right-[calc(5vw+212px)] min-[1280px]:rounded-xl min-[1280px]:border",
        )}
      >
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={minimized ? "Show preview controls" : "Hide preview controls"}
          aria-expanded={!minimized}
          onClick={() => setMinimized(!minimized)}
          className="max-desk:size-11"
        >
          {minimized ? <ChevronUp /> : <ChevronDown />}
        </Button>
        {minimized && (
          <span className="pr-2 text-sm font-semibold max-desk:pr-3">
            {direction}. {page === "landing" ? "Landing" : "Feed"}
          </span>
        )}
        {!minimized && (
          <>
            <span className="hidden px-1.5 text-xs font-semibold text-muted-foreground min-[1600px]:inline">Pro Exploration</span>
            <nav aria-label="Design directions" className="flex gap-0.5">
              {directions.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={direction === item.id ? "default" : "ghost"}
                      size="icon-lg"
                      aria-label={`Direction ${item.id}, ${item.name}`}
                      aria-pressed={direction === item.id}
                      onClick={() => sync({ d: item.id })}
                      className="text-sm max-desk:size-11"
                    >
                      {item.id}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{item.name}</TooltipContent>
                </Tooltip>
              ))}
            </nav>
            <Separator orientation="vertical" className="mx-1 h-6 max-desk:hidden" />
            {(["landing", "feed"] as const).map((view) => (
              <Button
                key={view}
                variant={page === view ? "secondary" : "ghost"}
                aria-pressed={page === view}
                onClick={() => sync({ view })}
                className={cn("h-8 px-2.5 text-sm max-desk:hidden", page === view && "text-foreground")}
              >
                {view === "landing" ? "Landing" : "Feed"}
              </Button>
            ))}
            {/* Phones get one 44px toggle to the other page instead of two small buttons. */}
            <Button
              variant="secondary"
              onClick={() => sync({ view: page === "landing" ? "feed" : "landing" })}
              className="h-11 px-3 text-sm desk:hidden"
            >
              {page === "landing" ? "Feed" : "Landing"}
            </Button>
            <Separator orientation="vertical" className="mx-1 h-6 max-desk:hidden" />
            {/* On phones the header already carries the theme toggle; the dock keeps only navigation so it fits 390px. */}
            <Button
              variant="ghost"
              size="icon-lg"
              className="max-desk:hidden"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => sync({ dark: !dark }, false)}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-lg" className="max-desk:hidden" asChild>
                  <a href="/?d=1" aria-label="Open the earlier reference set">
                    <History />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reference set (earlier previews)</TooltipContent>
            </Tooltip>
          </>
        )}
      </aside>
      <SignupDialog
        open={dialog !== null}
        mode={dialog ?? "signup"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        onFeed={props.onFeed}
      />
    </div>
  );
}
