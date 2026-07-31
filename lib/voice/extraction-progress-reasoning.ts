// The extraction ledger has one text column for live model output. Persist a versioned snapshot
// of stage-owned reasoning, ordinary text, and tool activity in that column so the UI can stream
// every content-bearing event without inventing boundaries at arbitrary client polls.

export type ExtractionReasoningStage = "scope" | "extract";
export type ExtractionReasoningByStage = Partial<Record<ExtractionReasoningStage, string>>;
export type ExtractionTextByStage = Partial<Record<ExtractionReasoningStage, string>>;
type ExtractionToolActivityState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";
export type ExtractionToolActivity = {
  id: string;
  toolName: string;
  stage: ExtractionReasoningStage;
  state: ExtractionToolActivityState;
  inputText: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};
export type ExtractionStreamProgress = {
  reasoningByStage: ExtractionReasoningByStage;
  textByStage: ExtractionTextByStage;
  toolActivities: ExtractionToolActivity[];
};

const SERIALIZED_PREFIX = "oparax-progress-v2:";
const LEGACY_SERIALIZED_PREFIX = "oparax-reasoning-v1:";

export function serializeExtractionProgress(value: ExtractionStreamProgress): string {
  return `${SERIALIZED_PREFIX}${JSON.stringify(value)}`;
}

function legacyStage(stage: string | null): ExtractionReasoningStage {
  return stage === "scoping" ? "scope" : "extract";
}

/** Reads current versioned snapshots and remains honest for rows written by the old cumulative
 * format: a legacy blob is attributed to the stage the ledger says owned it, never split at an
 * arbitrary client poll boundary. */
export function parseExtractionProgress(
  value: string | null,
  stage: string | null,
): ExtractionStreamProgress {
  if (!value) return { reasoningByStage: {}, textByStage: {}, toolActivities: [] };

  if (value.startsWith(LEGACY_SERIALIZED_PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(LEGACY_SERIALIZED_PREFIX.length)) as Record<
        string,
        unknown
      >;
      return {
        reasoningByStage: {
          ...(typeof parsed.scope === "string" && parsed.scope ? { scope: parsed.scope } : {}),
          ...(typeof parsed.extract === "string" && parsed.extract
            ? { extract: parsed.extract }
            : {}),
        },
        textByStage: {},
        toolActivities: [],
      };
    } catch {
      return {
        reasoningByStage: { [legacyStage(stage)]: value },
        textByStage: {},
        toolActivities: [],
      };
    }
  }

  if (!value.startsWith(SERIALIZED_PREFIX)) {
    return {
      reasoningByStage: { [legacyStage(stage)]: value },
      textByStage: {},
      toolActivities: [],
    };
  }

  try {
    const parsed = JSON.parse(value.slice(SERIALIZED_PREFIX.length)) as Record<string, unknown>;
    const reasoning =
      typeof parsed.reasoningByStage === "object" && parsed.reasoningByStage !== null
        ? (parsed.reasoningByStage as Record<string, unknown>)
        : {};
    return {
      reasoningByStage: {
        ...(typeof reasoning.scope === "string" && reasoning.scope
          ? { scope: reasoning.scope }
          : {}),
        ...(typeof reasoning.extract === "string" && reasoning.extract
          ? { extract: reasoning.extract }
          : {}),
      },
      textByStage:
        typeof parsed.textByStage === "object" && parsed.textByStage !== null
          ? parseTextByStage(parsed.textByStage)
          : typeof parsed.guidePartial === "string" && parsed.guidePartial
            ? { extract: parsed.guidePartial }
            : {},
      toolActivities: parseToolActivities(parsed.toolActivities),
    };
  } catch {
    // A malformed bookkeeping value must not take the setup page down. Showing it under the
    // ledger's current stage is the same truthful fallback used for pre-versioned rows.
    return {
      reasoningByStage: { [legacyStage(stage)]: value },
      textByStage: {},
      toolActivities: [],
    };
  }
}

function parseTextByStage(value: object): ExtractionTextByStage {
  const text = value as Record<string, unknown>;
  return {
    ...(typeof text.scope === "string" && text.scope ? { scope: text.scope } : {}),
    ...(typeof text.extract === "string" && text.extract ? { extract: text.extract } : {}),
  };
}

const TOOL_STATES = new Set<ExtractionToolActivityState>([
  "input-streaming",
  "input-available",
  "output-available",
  "output-error",
]);

function parseToolActivities(value: unknown): ExtractionToolActivity[] {
  if (!Array.isArray(value)) return [];
  const activities: ExtractionToolActivity[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const activity = item as Record<string, unknown>;
    if (
      typeof activity.id !== "string" ||
      typeof activity.toolName !== "string" ||
      (activity.stage !== "scope" && activity.stage !== "extract") ||
      typeof activity.state !== "string" ||
      !TOOL_STATES.has(activity.state as ExtractionToolActivityState) ||
      typeof activity.inputText !== "string"
    ) {
      continue;
    }
    activities.push({
      id: activity.id,
      toolName: activity.toolName,
      stage: activity.stage,
      state: activity.state as ExtractionToolActivityState,
      inputText: activity.inputText,
      ...(Object.hasOwn(activity, "input") ? { input: activity.input } : {}),
      ...(Object.hasOwn(activity, "output") ? { output: activity.output } : {}),
      ...(typeof activity.errorText === "string" ? { errorText: activity.errorText } : {}),
    });
  }
  return activities;
}

/** Poll requests can overlap. Keep the longest observed prefix per semantic stage so a slower,
 * older response cannot visually delete reasoning that a newer response already rendered. */
export function mergeExtractionReasoning(
  current: ExtractionReasoningByStage,
  incoming: ExtractionReasoningByStage,
): ExtractionReasoningByStage {
  const merged = { ...current };
  for (const stage of ["scope", "extract"] as const) {
    const next = incoming[stage];
    if (next && next.length >= (merged[stage]?.length ?? 0)) merged[stage] = next;
  }
  return merged;
}

const TOOL_STATE_RANK: Record<ExtractionToolActivityState, number> = {
  "input-streaming": 0,
  "input-available": 1,
  "output-available": 2,
  "output-error": 2,
};

/** Like reasoning, tool snapshots can arrive out of order across overlapping polls. Preserve the
 * furthest lifecycle state and longest streamed input observed for each call. */
export function mergeExtractionToolActivities(
  current: ExtractionToolActivity[],
  incoming: ExtractionToolActivity[],
): ExtractionToolActivity[] {
  const merged = new Map(current.map((activity) => [activity.id, activity]));
  for (const next of incoming) {
    const previous = merged.get(next.id);
    if (!previous) {
      merged.set(next.id, next);
      continue;
    }
    const state =
      TOOL_STATE_RANK[next.state] >= TOOL_STATE_RANK[previous.state] ? next.state : previous.state;
    merged.set(next.id, {
      ...previous,
      ...next,
      state,
      inputText:
        next.inputText.length >= previous.inputText.length ? next.inputText : previous.inputText,
      input: next.input ?? previous.input,
      output: next.output ?? previous.output,
      errorText: next.errorText ?? previous.errorText,
    });
  }
  return [...merged.values()];
}
