"use client";

// One switch between dark (the default) and light. Owner, September 23.

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // The server does not know the stored theme; render a fixed-size placeholder until the client does.
  if (!mounted) return <span className="inline-block size-8" aria-hidden="true" />;
  const dark = resolvedTheme === "dark";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <span aria-hidden="true">{dark ? "\u2600" : "\u263D"}</span>
    </Button>
  );
}
