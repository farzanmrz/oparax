import { monitorContent } from "@/lib/monitor/content";
import type { BuildLog } from "@/lib/monitor/read";
import type { Onboarding } from "./read";

// The run page's seven phases are a reading of the engine's three reported steps and its saved checkpoints
// (council, October 5): a phase moves only when a checkpoint exists or a log line says so, never on a timer.

const copy = monitorContent.onboarding;

export const phaseIds = ["profile", "posts", "gather", "jev", "choose", "search", "save"] as const;
export type PhaseId = (typeof phaseIds)[number];
export type PhaseState = "waiting" | "running" | "done" | "skipped" | "failed";
export type Phase = { id: PhaseId; state: PhaseState; result: string | null };
export type RunView = {
  phases: Phase[];
  heading: string;
  /** Candidates gathered, once a log line or the scores say how many. */
  gathered: number | null;
  /** The X search terms, once the log shows the search ran. */
  searchTerms: string | null;
};

const GATHERED = /^Gathered (\d+) from the source list, (\d+) accounts you quoted$/;
const SCORING = /Jev is scoring (\d+) candidate sources$/;
const SEARCHING = "Searching X for accounts: ";

/**
 * An engine log line as a page shows it. The engine saves "X" for the platform (saved builds and the matchers here
 * read that text); every page says Twitter (owner, October 8), so the wording changes only on display.
 */
export function displayLine(line: string): string {
  if (line.startsWith(SEARCHING))
    return `Searching Twitter for accounts: ${line.slice(SEARCHING.length)}`;
  return line.replace(/ on X$/, " on Twitter");
}

/** The phases before any run: every ring empty. */
export const restPhases: Phase[] = phaseIds.map((id) => ({ id, state: "waiting", result: null }));

export function readRun(
  log: BuildLog,
  run: Onboarding,
  { failed, ready }: { failed: boolean; ready: boolean },
): RunView {
  const lines = log.map((entry) => entry.message);
  const gatheredLine = lines.findLast((line) => GATHERED.test(line));
  const counts = gatheredLine?.match(GATHERED);
  const scoring = lines.findLast((line) => SCORING.test(line))?.match(SCORING);
  const candidates = run.candidates;
  const quoted = candidates?.filter((c) => c.key.startsWith("q-")).length ?? 0;
  const gathered = counts
    ? Number(counts[1]) + Number(counts[2])
    : candidates
      ? candidates.length
      : scoring
        ? Number(scoring[1])
        : null;
  const searchTerms =
    lines.findLast((line) => line.startsWith(SEARCHING))?.slice(SEARCHING.length) ?? null;
  const enough = lines.includes("Enough accounts already fit");
  const saving = lines.includes("Saving your agent");
  const accounts = run.chosen?.filter((s) => s.kind === "x").length ?? 0;
  const sites = (run.chosen?.length ?? 0) - accounts;

  const done: Record<PhaseId, boolean> = {
    profile: ready || run.profileComplete,
    posts: ready || run.posts !== null,
    gather: ready || gathered !== null,
    jev: ready || candidates !== null,
    choose: ready || run.chosen !== null,
    search: ready || (searchTerms ? run.turns >= 2 || saving : enough || saving),
    save: ready,
  };
  const result: Record<PhaseId, string | null> = {
    profile: run.profile ? copy.found(run.profile.name) : null,
    posts: run.postsRead !== null ? copy.read(run.postsRead) : null,
    gather: counts
      ? copy.gathered(Number(counts[1]), Number(counts[2]))
      : candidates
        ? copy.gathered(candidates.length - quoted, quoted)
        : null,
    jev: candidates
      ? copy.kept(candidates.filter((c) => c.band !== "aside").length, candidates.length)
      : null,
    choose: run.chosen ? copy.chose(sites, accounts) : null,
    search: searchTerms
      ? run.searchFailed
        ? copy.searchFailed
        : copy.searched(searchTerms)
      : enough
        ? copy.enough
        : null,
    save: ready ? copy.saved : null,
  };

  let reached = false;
  const phases = phaseIds.map((id): Phase => {
    if (!reached && done[id])
      return {
        id,
        state: id === "search" && !searchTerms ? "skipped" : "done",
        result: result[id],
      };
    if (reached) return { id, state: "waiting", result: null };
    reached = true;
    return failed
      ? { id, state: "failed", result: monitorContent.buildReason }
      : { id, state: "running", result: null };
  });
  const heading = failed
    ? copy.stoppedTitle
    : ready
      ? copy.ready
      : done.choose
        ? copy.saving
        : copy.choosing;
  return { phases, heading, gathered, searchTerms };
}
