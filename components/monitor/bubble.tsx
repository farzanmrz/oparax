"use client";

// The One chrome on the owner's monitor pages: no header or sidebar, one round bubble at the bottom left (the Oparax
// mark) that opens a small lifted menu with the pages, the theme, the account and Sign out (owner, October 4).

import { Bell, Layers, LogOut, Newspaper } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSignOut } from "@/components/landing/sign-out-button";
import { OparaxMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { landingContent } from "@/lib/landing/content";
import { monitorContent } from "@/lib/monitor/content";
import { cn } from "@/lib/utils";

const copy = monitorContent.menu;
const lift =
  "rounded-xl border border-line-strong bg-[var(--window)] shadow-[var(--card-shadow),var(--top-light)]";
const row =
  "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring";

export function Bubble({ handle, displayHandle }: { handle: string; displayHandle: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { status, signOut } = useSignOut();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const nav = [
    { href: `/${handle}`, label: copy.feed, icon: Newspaper },
    { href: `/${handle}/sources`, label: copy.sources, icon: Layers },
    { href: `/${handle}/notifications`, label: copy.notifications, icon: Bell },
  ];

  return (
    <div ref={ref} className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {open ? (
        <div id="oparax-menu" className={cn(lift, "w-[220px] p-2")}>
          <div className="flex h-9 items-center gap-2 px-2">
            <OparaxMark className="size-[18px] text-t1" />
            <span className="text-[14px] font-semibold tracking-tight text-t1">
              {landingContent.brand}
            </span>
            <ThemeToggle className="ml-auto size-7 rounded-md border border-line-strong bg-raised text-t2 hover:text-t1 desk:size-7" />
          </div>
          <nav aria-label={copy.pages} className="mt-1 grid gap-0.5">
            {nav.map(({ href, label, icon: Icon }) => {
              const on = pathname.toLowerCase() === href.toLowerCase();
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    row,
                    on
                      ? "bg-[var(--brand-soft)] font-medium text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)] hover:bg-[var(--brand-soft)]"
                      : "text-t2 hover:text-t1",
                  )}
                >
                  <Icon
                    className={cn("size-4 shrink-0", on ? "text-[var(--brand)]" : "text-t3")}
                    aria-hidden="true"
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-1.5 grid gap-0.5 border-t border-line-strong pt-1.5">
            {/* The account row opens the agent's settings, which the old header's Settings button used to. */}
            <Link
              href={`/${handle}/settings`}
              onClick={() => setOpen(false)}
              className={cn(row, "text-t1")}
            >
              <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white uppercase">
                {displayHandle.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1 truncate">@{displayHandle}</span>
              <span className="text-[12px] text-t3">{monitorContent.settings}</span>
            </Link>
            <button
              type="button"
              onClick={signOut}
              disabled={status === "pending"}
              className={cn(row, "text-t2 hover:text-t1")}
            >
              <LogOut className="size-4 shrink-0 text-t3" aria-hidden="true" />
              <span role={status === "error" ? "alert" : undefined}>
                {status === "error"
                  ? copy.signOutFailed
                  : status === "pending"
                    ? copy.signingOut
                    : copy.signOut}
              </span>
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="oparax-menu"
        aria-label={copy.open}
        className={cn(
          lift,
          "grid size-11 place-items-center rounded-full text-t1 transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring",
        )}
      >
        <OparaxMark className="size-[22px]" />
      </button>
    </div>
  );
}
