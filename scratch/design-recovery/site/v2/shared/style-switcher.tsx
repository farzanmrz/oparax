"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const STYLES = [
  { key: "window", label: "Window" },
  { key: "newsroom", label: "Newsroom" },
  { key: "deck", label: "Deck" },
  { key: "one", label: "One" },
];
const PAGES = [
  { key: "login", label: "Login" },
  { key: "setup", label: "Setup" },
  { key: "building", label: "Building" },
  { key: "ready", label: "Ready" },
  { key: "feed", label: "Feed" },
  { key: "landing", label: "Landing" },
];
/** The One style merges building and ready into onboarding and sign up into login. */
const ONE_PAGES = [
  { key: "login", label: "Login" },
  { key: "setup", label: "Setup" },
  { key: "onboarding", label: "Onboarding" },
  { key: "feed", label: "Feed" },
  { key: "landing", label: "Landing" },
];
const toOne: Record<string, string> = { building: "onboarding", ready: "onboarding", signup: "login" };
const fromOne: Record<string, string> = { onboarding: "building" };
const HIDE_KEY = "v2-switcher-hidden";

// Review-only control: floats over the page, outside its layout, so swapping styles keeps the same page and query.
export function StyleSwitcher() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDE_KEY) === "1");
    } catch {}
  }, []);

  const match = pathname.match(/^\/v2\/(window|newsroom|deck|one)(\/.*)?$/);
  if (!match) return null;
  const [, current, rest = ""] = match;
  // No dock on the One pages (owner, Oct 4: "Remove the toggles between the multiple designs from the page").
  if (current === "one") return null;
  const query = search.toString() ? `?${search.toString()}` : "";

  const toggle = (next: boolean) => {
    setHidden(next);
    try {
      localStorage.setItem(HIDE_KEY, next ? "1" : "0");
    } catch {}
  };

  const page = rest.split("/")[1] ?? "";
  const pages = current === "one" ? ONE_PAGES : PAGES;
  const pageFor = (style: string) => {
    if (!page) return rest;
    if (style === "one" && current !== "one") return `/${toOne[page] ?? page}`;
    if (style !== "one" && current === "one") return `/${fromOne[page] ?? page}`;
    return rest;
  };
  const shell: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    background: "rgba(16,18,22,0.88)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
    font: "500 12.5px/1 ui-sans-serif, system-ui, sans-serif",
    color: "#e8eaee",
  };

  const dock: React.CSSProperties = {
    position: "fixed",
    // One pages dock at the bottom right, clear of the sidebar (its Notifications row) and the onboarding rows.
    ...(current === "one" ? { right: 16, left: "auto" } : { left: 16 }),
    bottom: 16,
    flexDirection: "column",
    alignItems: current === "one" ? "flex-end" : "flex-start",
    zIndex: 2147483000,
    display: "flex",
    gap: 8,
  };
  const pill = (active: boolean): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: 999,
    textDecoration: "none",
    whiteSpace: "nowrap",
    color: active ? "#ffffff" : "#c9ced7",
    background: active ? "#3a6cf4" : "transparent",
  });

  if (hidden) {
    return (
      <div style={dock}>
        <button type="button" onClick={() => toggle(false)} style={{ ...shell, padding: "8px 12px", cursor: "pointer" }} aria-label="Show switchers">
          Styles and pages
        </button>
      </div>
    );
  }

  return (
    <div style={dock}>
    <nav aria-label="Compare styles" style={shell}>
      {STYLES.map((s) => {
        const active = s.key === current;
        return (
          <a
            key={s.key}
            href={`/v2/${s.key}${pageFor(s.key)}${query}`}
            aria-current={active ? "page" : undefined}
            style={pill(active)}
          >
            {s.label}
          </a>
        );
      })}
    </nav>
    <nav aria-label="Pages in this style" style={shell}>
      {pages.map((p) => (
        <a key={p.key} href={`/v2/${current}/${p.key}${query}`} aria-current={p.key === page ? "page" : undefined} style={pill(p.key === page)}>
          {p.label}
        </a>
      ))}
      <button
        type="button"
        onClick={() => toggle(true)}
        aria-label="Hide switchers"
        style={{ padding: "8px 10px", borderRadius: 999, border: 0, background: "transparent", color: "#8d939e", cursor: "pointer" }}
      >
        ×
      </button>
    </nav>
    </div>
  );
}
