// The build as AI SDK generative UI: each stage is a typed tool part ("tool-<name>") whose state picks the
// component (input-available = running, output-available = result, output-error = failed). The recorded
// run replays once on load and settles within five seconds (WCAG 2.2.2), or is frozen by ?at=.

export const stageIds = ["lookupProfile", "readPosts", "scoreSources", "chooseSources", "writeBrief"] as const;
export type StageId = (typeof stageIds)[number];

export type PartState = "queued" | "input-available" | "output-available" | "output-error";

export type ToolPart = {
  type: `tool-${StageId}`;
  state: PartState;
  /** 0 to 1 while running: how far the stage has got (batches scored). */
  progress: number;
};

export const stageTitles: Record<StageId, string> = {
  lookupProfile: "Looking up @farzanmrz on X",
  readPosts: "Reading @farzanmrz's newest posts",
  scoreSources: "Checking which sources fit your sentence",
  chooseSources: "Choosing sites, feeds and X accounts",
  writeBrief: "Writing your brief",
};

/** Milliseconds each stage runs in the replay; the sum stays under 5 seconds. */
const durations = [600, 900, 1500, 900, 700];
export const REPLAY_MS = durations.reduce((a, b) => a + b, 0);

export function partsAt(elapsed: number): ToolPart[] {
  let start = 0;
  return stageIds.map((id, i) => {
    const end = start + durations[i];
    const state: PartState = elapsed >= end ? "output-available" : elapsed >= start ? "input-available" : "queued";
    const progress = state === "input-available" ? (elapsed - start) / durations[i] : state === "queued" ? 0 : 1;
    start = end;
    return { type: `tool-${id}`, state, progress };
  });
}

/** ?at=1..5 freezes stage N mid-run with earlier stages done; ?at=done shows every stage complete. */
export function partsFrozen(at: number | "done"): ToolPart[] {
  return stageIds.map((id, i) => {
    const n = i + 1;
    if (at === "done" || n < at) return { type: `tool-${id}`, state: "output-available", progress: 1 };
    if (n === at) return { type: `tool-${id}`, state: "input-available", progress: 0.45 };
    return { type: `tool-${id}`, state: "queued", progress: 0 };
  });
}

/** The recorded failure: X timeline returned 429 during step 2 (product-data.md 10.6, failed variant). */
export function partsFailed(): ToolPart[] {
  return stageIds.map((id, i) => ({
    type: `tool-${id}`,
    state: i === 0 ? "output-available" : i === 1 ? "output-error" : "queued",
    progress: i === 0 ? 1 : 0,
  }));
}

export const stageOf = (part: ToolPart) => part.type.slice(5) as StageId;
