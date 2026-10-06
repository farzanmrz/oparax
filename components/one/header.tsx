"use client";

import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { useSignOut } from "@/components/landing/sign-out-button";
import { OparaxMark } from "@/components/logo";
import { landingContent } from "@/lib/landing/content";
import { monitorContent } from "@/lib/monitor/content";
import { cn } from "@/lib/utils";

const copy = monitorContent.menu;

/** The plan as one object: its name, the free week's days left (null on a paid plan) and the watched X posts. */
export type ShellPlan = {
  name: string;
  daysLeft: number | null;
  days: number;
  used: number;
  limit: number;
};

const story = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The running header line: the mark and name, Feed and Settings, then the account at the right. */
export function OneHeader({
  label,
  feed,
  settings,
  plan,
}: {
  label: string;
  feed: string;
  settings: string | null;
  plan: ShellPlan | null;
}) {
  const path = usePathname().toLowerCase();
  const rest = path.slice(feed.length + 1);
  // A story opened from the feed is still the feed.
  const feedOn =
    path === feed.toLowerCase() || (path.startsWith(`${feed.toLowerCase()}/`) && story.test(rest));
  const nav = [
    { href: feed, label: copy.feed, on: feedOn },
    ...(settings
      ? [{ href: settings, label: copy.settings, on: path === settings.toLowerCase() }]
      : []),
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--page)]/80 backdrop-blur-md">
      <div className="one-column flex h-14 items-center gap-8">
        <Link
          href={feed}
          className="flex shrink-0 items-center gap-2 rounded-sm text-[17px] font-semibold tracking-tight text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <OparaxMark className="size-[22px]" />
          {landingContent.brand}
        </Link>
        <nav aria-label={copy.pages} className="flex h-full items-stretch gap-6">
          {nav.map(({ href, label, on }) => (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "relative flex items-center text-[13.5px] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                on ? "font-medium text-t1" : "text-t3 hover:text-t1",
              )}
            >
              {label}
              {on ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[var(--brand)]"
                />
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center">
          <Account label={label} plan={plan} />
        </div>
      </div>
    </header>
  );
}

/** The person: the initial, the signed-in email and a chevron, opening the plan, the theme and Sign out. */
function Account({ label, plan }: { label: string; plan: ShellPlan | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="one-account"
        className="-mr-1.5 flex h-8 items-center gap-2 rounded-md px-1.5 text-[13px] whitespace-nowrap transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className="grid size-[22px] place-items-center rounded-full bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--brand)] uppercase shadow-[inset_0_0_0_1px_var(--brand-line)]"
        >
          {label.charAt(0)}
        </span>
        <span className="font-medium text-t1">{label}</span>
        <ChevronDown
          className={cn("size-3.5 text-t3 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          id="one-account"
          className="absolute top-[calc(100%+10px)] right-0 w-[296px] divide-y divide-line rounded-xl border border-line-strong bg-[var(--window)] shadow-[var(--window-shadow),var(--top-light)]"
        >
          {plan ? <Plan plan={plan} /> : null}
          <div className="flex items-center gap-3 p-4">
            <span aria-hidden="true" className="text-[13px] text-t2">
              {copy.theme}
            </span>
            <ThemeSwitch className="ml-auto w-[168px]" />
          </div>
          <div className="p-4">
            <SignOut />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Plan({ plan }: { plan: ShellPlan }) {
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-semibold text-t1">{plan.name}</p>
        {plan.daysLeft !== null ? (
          <p className="text-[12px] text-t2">
            <span className="font-medium text-t1 tabular-nums">{plan.daysLeft}</span>{" "}
            {copy.daysLeft(plan.daysLeft)}
          </p>
        ) : null}
      </div>
      {plan.daysLeft !== null ? (
        <div className="mt-2.5 flex gap-1" aria-hidden="true">
          {Array.from({ length: plan.days }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: The segments are a fixed row of identical marks.
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < (plan.daysLeft ?? 0) ? "bg-[var(--brand)]" : "bg-line-strong",
              )}
            />
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-[12px] text-t3 tabular-nums">{copy.pool(plan.used, plan.limit)}</p>
    </div>
  );
}

/** Light and Dark as a labelled two-way switch (the Clustered and Direct switch's skin), native radios inside. */
function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // The server does not know the stored theme; nothing is marked until the client does.
  const current = mounted ? resolvedTheme : undefined;
  const options = [
    { value: "light", label: copy.light, Icon: Sun },
    { value: "dark", label: copy.dark, Icon: Moon },
  ];
  return (
    <fieldset
      className={cn("flex rounded-lg border border-line bg-[var(--well)] p-0.5", className)}
    >
      <legend className="sr-only">{copy.theme}</legend>
      {options.map(({ value, label, Icon }) => {
        const on = current === value;
        return (
          <label
            key={value}
            className={cn(
              "flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-[12.5px] text-t3 transition-colors hover:text-t1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
              on && "bg-[var(--brand-soft)] text-t1 shadow-[inset_0_0_0_1px_var(--brand-line)]",
            )}
          >
            <input
              type="radio"
              name="one-theme"
              value={value}
              checked={on}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            <Icon className={cn("size-3.5", on && "text-[var(--brand)]")} aria-hidden="true" />
            {label}
          </label>
        );
      })}
    </fieldset>
  );
}

/** Sign out as a bordered action. */
function SignOut() {
  const { status, signOut } = useSignOut();
  return (
    <button
      type="button"
      onClick={signOut}
      disabled={status === "pending"}
      className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-line-strong bg-[var(--window)] px-3 text-[13px] font-medium text-t1 shadow-[var(--top-light)] transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-70"
    >
      <LogOut className="size-3.5 text-t3" aria-hidden="true" />
      <span role={status === "error" ? "alert" : undefined}>
        {status === "error"
          ? copy.signOutFailed
          : status === "pending"
            ? copy.signingOut
            : copy.signOut}
      </span>
    </button>
  );
}
