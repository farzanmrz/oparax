"use client";

import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { OparaxMark } from "@/components/logo";
import { landingContent } from "@/lib/landing/content";
import { monitorContent } from "@/lib/monitor/content";
import { cn } from "@/lib/utils";

const copy = monitorContent.menu;

/** The visitor header line for log in, sign up and the password pages (lab v2/one/shell.tsx OneHeader): the mark
 * and wordmark home, and a labelled Appearance switch, since there is no account. The signed-in pages have no
 * header; the rail holds the mark. */
export function BrandHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[var(--page)]/80 backdrop-blur-md">
      <div className="one-column flex h-12 items-center gap-7">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-sm text-[15px] font-semibold tracking-[-0.01em] text-t1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <OparaxMark className="size-[18px]" />
          {landingContent.brand}
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span aria-hidden="true" className="text-[12.5px] text-t3">
            {copy.appearance}
          </span>
          <ThemeSwitch className="w-[168px]" />
        </div>
      </div>
    </header>
  );
}

/** The page theme as the client knows it; undefined until mounted, since the server cannot read the stored choice. */
export function useResolvedTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return { theme: mounted ? resolvedTheme : undefined, setTheme };
}

/** Light and Dark as a labelled two-way switch (the Clustered and Direct switch's skin), native radios inside. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useResolvedTheme();
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
        const on = theme === value;
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
