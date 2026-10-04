"use client";

import { useEffect } from "react";
import { THEME_KEY } from "@/next/theme";

/** Re-applies the pre-paint theme after mount, in case hydration rewrote <html> (same guard the feeds use). */
export function ThemeGuard() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search).get("theme");
      const stored = localStorage.getItem(THEME_KEY);
      const t = q === "light" || q === "dark" ? q : stored === "light" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {}
  }, []);
  return null;
}
