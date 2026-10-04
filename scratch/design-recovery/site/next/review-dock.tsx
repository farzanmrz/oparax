"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutList, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { screens } from "./screens";
import { toggleTheme } from "./theme";
import { currentPalette, PALETTES, setPalette, type Palette } from "./palette";

// Review tooling, not product: a collapsed pill bottom-right; hidden with ?chrome=0 for clean screenshots.
export function ReviewDock() {
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(false);
  const [palette, setChosen] = useState<Palette | null>(null);
  useEffect(() => {
    setHidden(new URLSearchParams(window.location.search).get("chrome") === "0");
    setChosen(currentPalette());
  }, []);
  const pick = (p: Palette | null) => {
    setPalette(p);
    setChosen(p);
  };
  if (hidden) return null;
  return (
    <div className="fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2 font-sans">
      {open ? (
        <div className="max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-[0_8px_30px_rgb(9_15_29/0.25)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold">Review screens</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
            >
              Toggle theme
            </button>
          </div>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">Palette</p>
          <div className="mt-1 grid grid-cols-5 gap-1">
            {([null, ...PALETTES] as const).map((p) => (
              <button
                key={p ?? "current"}
                type="button"
                onClick={() => pick(p)}
                aria-pressed={palette === p}
                className={cn(
                  "rounded-md border border-border px-1 py-1 text-[11px] capitalize hover:bg-muted",
                  palette === p && "bg-muted font-semibold",
                )}
              >
                {p ?? "current"}
              </button>
            ))}
          </div>
          {screens.map((group) => (
            <div key={group.group} className="mt-2">
              <p className="text-[11px] font-medium text-muted-foreground">{group.group}</p>
              <ul className="mt-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded px-1.5 py-0.5 text-xs hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full border border-border bg-popover px-3 text-xs font-medium text-popover-foreground shadow-[0_4px_16px_rgb(9_15_29/0.2)]",
        )}
      >
        {open ? <X className="size-3.5" /> : <LayoutList className="size-3.5" />}
        Screens
      </button>
    </div>
  );
}
