"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Review-only control, one fixed arrangement on every design (owner, Oct 8): the style row (Window, Newsroom,
// Deck, One), the step toggles (only on the onboarding pages) and the page row (Onboarding, Feed, Settings), always
// at the bottom right, always the same size and order. Nothing here depends on which style is showing.

type Style = "window" | "newsroom" | "deck" | "one";
type Role = "onboarding" | "feed" | "settings";
type Step = "rest" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "ready";

const STYLES: { key: Style; label: string }[] = [
  { key: "window", label: "Window" },
  { key: "newsroom", label: "Newsroom" },
  { key: "deck", label: "Deck" },
  { key: "one", label: "One" },
];
const ROLES: { key: Role; label: string }[] = [
  { key: "onboarding", label: "Onboarding" },
  { key: "feed", label: "Feed" },
  { key: "settings", label: "Settings" },
];
const STEPS: { key: Step; label: string; title: string }[] = [
  { key: "rest", label: "Rest", title: "Before Build" },
  ...(["1", "2", "3", "4", "5", "6", "7"] as const).map((n) => ({ key: n, label: n, title: `Frozen at step ${n}` })),
  { key: "ready", label: "Ready", title: "Built" },
];
const HIDE_KEY = "v2-switcher-hidden";
// Login is settled (owner, Oct 8: the accepted login), so it is no longer a page to review; its routes still work.
// These routes exist in some styles only: the One merges sign up into login (and the other styles keep both).
const toOne: Record<string, string> = { signup: "login" };
// Query keys that belong to one page, dropped when moving to another page or style; the rest (theme) carry over.
const PAGE_KEYS = ["at", "agent", "state", "source", "settled", "panel", "view", "handle", "error", "why"];

/** Which review page a route is: the One shows its onboarding on /feed?agent=none; the others spread it over setup, building and ready. */
function roleOf(style: Style, page: string, search: URLSearchParams): Role | null {
  if (style === "one") {
    if (page === "onboarding" || (page === "feed" && search.get("agent") === "none")) return "onboarding";
    if (page === "feed" || page === "") return "feed";
    if (page === "settings" || page === "sources" || page === "notifications") return "settings";
    return null;
  }
  if (page === "setup" || page === "building" || page === "ready") return "onboarding";
  if (page === "feed") return "feed";
  return null;
}

/** Which step toggle is lit, read from the actual route and ?at. */
function stepOf(style: Style, page: string, search: URLSearchParams): Step | null {
  const at = search.get("at");
  const failed = search.get("state") === "failed";
  const fromAt = (): Step | null => {
    if (at === "done") return "ready";
    if (at && /^[1-7]$/.test(at)) return at as Step;
    return null;
  };
  if (style === "one") return failed ? null : (fromAt() ?? "rest");
  if (page === "setup") return "rest";
  if (page === "ready") return "ready";
  return failed ? null : fromAt();
}

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
  const current = match[1] as Style;
  const rest = match[2] ?? "";
  const page = rest.split("/")[1] ?? "";

  const role = roleOf(current, page, search);
  const step = role === "onboarding" ? stepOf(current, page, search) : null;

  const carry = new URLSearchParams(search.toString());
  for (const k of PAGE_KEYS) carry.delete(k);
  const withQuery = (path: string, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams(carry.toString());
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
    const s = q.toString();
    return `${path}${s ? `?${s}` : ""}`;
  };

  /** The one address of a review page in a style, or null when that style has no such page. */
  const hrefFor = (style: Style, r: Role, s: Step | null = null): string | null => {
    if (r === "feed") return withQuery(`/v2/${style}/feed`);
    if (r === "settings") return style === "one" ? withQuery("/v2/one/settings") : null;
    const at = s === "ready" ? "done" : s && s !== "rest" ? s : null;
    if (style === "one") return withQuery("/v2/one/feed", { agent: "none", ...(at ? { at } : {}) });
    if (s === "rest") return withQuery(`/v2/${style}/setup`);
    if (s === "ready") return withQuery(`/v2/${style}/ready`);
    return withQuery(`/v2/${style}/building`, at ? { at } : {});
  };

  const styleHref = (style: Style) => {
    if (role) return hrefFor(style, role, step) ?? hrefFor(style, "feed")!;
    // Other routes (landing, login, signup): the same route, mapped where the One names it differently.
    const full = search.toString() ? `?${search.toString()}` : "";
    if (style === "one" && current !== "one") return `/v2/one/${toOne[page] ?? page}${full}`;
    return `/v2/${style}${rest}${full}`;
  };

  const toggle = (next: boolean) => {
    setHidden(next);
    try {
      localStorage.setItem(HIDE_KEY, next ? "1" : "0");
    } catch {}
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
    pointerEvents: "auto",
    maxWidth: "calc(100vw - 32px)",
    boxSizing: "border-box",
  };
  // The same dock on every style: bottom right, a column of rows, right-aligned. Only the rows' contents change.
  const dock: React.CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
    zIndex: 2147483000,
    pointerEvents: "none",
  };
  const pill = (active: boolean, small = false): React.CSSProperties => ({
    padding: small ? "6px 10px" : "8px 14px",
    borderRadius: 999,
    textDecoration: "none",
    whiteSpace: "nowrap",
    fontSize: small ? 12 : undefined,
    color: active ? "#ffffff" : "#c9ced7",
    background: active ? "#3a6cf4" : "transparent",
  });
  const off: React.CSSProperties = { opacity: 0.38, cursor: "not-allowed" };
  const STEP_ROW_H = 34;

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
        {STYLES.map((s) => (
          <a key={s.key} href={styleHref(s.key)} aria-current={s.key === current ? "page" : undefined} style={pill(s.key === current)}>
            {s.label}
          </a>
        ))}
      </nav>
      {role === "onboarding" ? (
        <nav aria-label="Onboarding steps" style={{ ...shell, height: STEP_ROW_H, overflowX: "auto" }}>
          {STEPS.map((s) => (
            <a
              key={s.key}
              href={hrefFor(current, "onboarding", s.key) ?? "#"}
              title={s.title}
              aria-current={s.key === step ? "step" : undefined}
              style={pill(s.key === step, true)}
            >
              {s.label}
            </a>
          ))}
        </nav>
      ) : (
        // Holds the toggle row's place so the rows above never move between pages.
        <div aria-hidden="true" style={{ height: STEP_ROW_H }} />
      )}
      <nav aria-label="Pages in this style" style={shell}>
        {ROLES.map((r) => {
          const href = hrefFor(current, r.key, r.key === "onboarding" ? "rest" : null);
          const active = r.key === role;
          if (!href) {
            return (
              <span key={r.key} aria-disabled="true" title="No settings page in this style" style={{ ...pill(false), ...off }}>
                {r.label}
              </span>
            );
          }
          // The Onboarding pill opens the style's onboarding page as it stands (building, or the One's feed state).
          const target = r.key === "onboarding" && !active ? hrefFor(current, "onboarding", current === "one" ? "rest" : null) : href;
          return (
            <a key={r.key} href={active ? withQueryKeep(pathname, search) : target!} aria-current={active ? "page" : undefined} style={pill(active)}>
              {r.label}
            </a>
          );
        })}
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

/** The current address, unchanged (the lit pill points at where you already are). */
function withQueryKeep(pathname: string, search: URLSearchParams) {
  const s = search.toString();
  return `${pathname}${s ? `?${s}` : ""}`;
}
