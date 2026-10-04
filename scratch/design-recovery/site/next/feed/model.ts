import { stories, type FeedStory } from "../data/feed";

export type View = "clustered" | "direct";
export type FeedState = "populated" | "empty" | "checking" | "failed-items";
export type AlertState = "none" | "active" | "paused" | "stopped" | "error";
export type PlanState = "trial" | "frozen" | "exhausted";

export type FeedOptions = {
  view: View;
  state: FeedState;
  story: string | null;
  alerts: AlertState;
  plan: PlanState;
  /** ?pool=out: the free week's watched X posts are used up. */
  poolOut: boolean;
  /** First visit after the build: the ready summary sits above the (still empty) feed. */
  first: boolean;
  /** Palette comparison: ?compose=old keeps the round 2 card and aside unchanged (color-only test). */
  compose: "old" | "new";
};

export const viewHint: Record<View, string> = {
  clustered: "Reports about the same event, joined into one story.",
  direct: "Each post or article on its own.",
};

export function parseFeed(param: (key: string) => string | undefined, fixed?: Partial<FeedOptions>): FeedOptions {
  const story = param("story") ?? null;
  const target = stories.find((s) => s.id === story);
  const view: View = target ? target.arrangement : param("view") === "direct" ? "direct" : "clustered";
  const state = param("state");
  const alerts = param("alerts");
  return {
    view,
    state: state === "empty" || state === "checking" || state === "failed-items" ? state : "populated",
    story: target ? target.id : null,
    alerts:
      alerts === "active" || alerts === "paused" || alerts === "stopped" || alerts === "error" ? alerts : "none",
    plan: "trial",
    poolOut: param("pool") === "out",
    first: false,
    compose: param("compose") === "old" ? "old" : "new",
    ...fixed,
  };
}

/** Stories for the view; a story opened from an alert comes first, as the product scrolls to it. */
export function storiesFor(options: FeedOptions): FeedStory[] {
  const list = stories.filter((s) => s.arrangement === options.view);
  if (!options.story) return list;
  return [...list.filter((s) => s.id === options.story), ...list.filter((s) => s.id !== options.story)];
}

export function hrefFor(base: string, options: FeedOptions, change: Partial<FeedOptions>) {
  const next = { ...options, ...change };
  const q = new URLSearchParams();
  if (next.view !== "clustered") q.set("view", next.view);
  if (next.state !== "populated") q.set("state", next.state);
  if (next.alerts !== "none") q.set("alerts", next.alerts);
  if (next.poolOut) q.set("pool", "out");
  if (next.compose === "old") q.set("compose", "old");
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
