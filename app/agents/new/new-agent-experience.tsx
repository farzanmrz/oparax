"use client";

import { ArrowLeftIcon, MessageSquareTextIcon, TablePropertiesIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppSidebarTrigger } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AgentChat } from "./agent-chat";

const LEAVE_MESSAGE = "Leave this page? Your agent setup conversation will be lost.";

/**
 * Create-agent experience: a slim header (back link, title, chat/form view
 * toggle) over the AI SDK-backed AgentChat. Once the reporter sends their first
 * message the page is "dirty"; while dirty we use the browser's native
 * confirmation for every exit path — beforeunload for reload/tab close, and
 * window.confirm for browser Back and in-app link navigation.
 *
 * The Form view is a planned alternative that will transfer the chat state
 * into structured fields; the toggle ships disabled until that lands.
 */
export function NewAgentExperience() {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);

  // Reload / tab close: the browser's native confirmation.
  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  // In-app navigation: catch clicks on internal links before Next routes and
  // put up the native confirm dialog.
  useEffect(() => {
    if (!dirty) return;
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href?.startsWith("/") || (target && target !== "_self")) return;
      if (href === window.location.pathname) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [dirty]);

  // Browser Back: keep a trap entry on the stack; confirm natively, then
  // either navigate away or re-arm the trap.
  useEffect(() => {
    if (!dirty) return;
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      if (window.confirm(LEAVE_MESSAGE)) {
        setDirty(false);
        router.push("/agents");
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [dirty, router]);

  const handleDirtyChange = useCallback((next: boolean) => setDirty(next), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border py-4">
        <AppSidebarTrigger />
        <Link
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          href="/agents"
        >
          <ArrowLeftIcon className="size-4" />
          Agents
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-border" />
        <h1 className="text-lg leading-none font-semibold tracking-tight">New agent</h1>

        <ButtonGroup aria-label="Setup mode" className="ml-auto">
          <Button aria-pressed="true" size="sm" type="button" variant="secondary">
            <MessageSquareTextIcon />
            Chat
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* biome-ignore lint/a11y/noNoninteractiveTabindex: focusable wrapper so a disabled trigger's tooltip still reaches keyboard users (Radix pattern) */}
              <span tabIndex={0}>
                <Button
                  aria-disabled="true"
                  className="pointer-events-none rounded-l-none"
                  disabled
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <TablePropertiesIcon />
                  Form
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Form view is coming soon — it will carry this chat over.
            </TooltipContent>
          </Tooltip>
        </ButtonGroup>
      </header>

      <div className="min-h-0 flex-1">
        <AgentChat onDirtyChange={handleDirtyChange} />
      </div>
    </div>
  );
}
