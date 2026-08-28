// lib/agent/story-group.ts
//
// The same-story judge for the grouping stage (Part B2 of #131): given the new post's
// synthesized headline + facts and the desk's recent stories, decide whether this is the same
// underlying news story as one of them. One qwen call per judgment, ledgered as a CouncilCall
// (stage "story_group") by the pipeline like every other model stage.
// SERVER-ONLY: reads prompts from lib/sysprompts.

import type { GenerateTextStepEndEvent } from "ai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { aiContentAllowed, aiTelemetry } from "@/lib/observability/ai-telemetry";
import type { TelemetryMessage } from "@/lib/observability/posthog-ai";
import { STORY_GROUP_PROMPT } from "@/lib/sysprompts";
import { escapeXmlText } from "@/lib/xml";
import { resolveCallMeta } from "./call-meta";
import type { CouncilCall, NewsPoint } from "./draft-council-run";
import {
  QWEN_DRAFT_MODEL,
  QWEN_DRAFT_PROVIDER_OPTIONS,
  QWEN_DRAFT_TIMEOUT_MS,
  qwenStageAbortSignal,
} from "./qwen-draft-config";

const storyGroupSchema = z.object({
  // 1-based index into the numbered story list, or null when nothing matches.
  matchIndex: z.number().int().min(1).nullable(),
  reason: z.string().trim().min(1).max(750),
});

export type StoryCandidate = {
  storyId: string;
  /** Winner headline when one exists; the deterministic story summary otherwise. */
  title: string;
  points: string[];
};

export type StoryGroupResult = {
  call: CouncilCall;
  /** The matched story id, or null (no match, or an unusable verdict — both mean "new story"). */
  matchStoryId: string | null;
};

function buildPrompt(input: {
  candidateTitle: string;
  candidatePoints: NewsPoint[];
  stories: StoryCandidate[];
}): string {
  const lines: string[] = ["<candidate>", `<title>${escapeXmlText(input.candidateTitle)}</title>`];
  for (const point of input.candidatePoints) {
    lines.push(`<fact>${escapeXmlText(point.point)}</fact>`);
  }
  lines.push("</candidate>", "", "<existing_stories>");
  input.stories.forEach((story, index) => {
    lines.push(`<story number="${index + 1}">`);
    lines.push(`<title>${escapeXmlText(story.title)}</title>`);
    for (const point of story.points) lines.push(`<fact>${escapeXmlText(point)}</fact>`);
    lines.push("</story>");
  });
  lines.push("</existing_stories>");
  return lines.join("\n");
}

export async function judgeSameStory(input: {
  candidateTitle: string;
  candidatePoints: NewsPoint[];
  stories: StoryCandidate[];
  deadlineAt?: number;
}): Promise<StoryGroupResult> {
  const completedStepRef: { value: GenerateTextStepEndEvent | null } = { value: null };
  const prompt = buildPrompt(input);
  const telemetryInput: TelemetryMessage[] | null = aiContentAllowed("story_group")
    ? [
        { role: "system", content: STORY_GROUP_PROMPT },
        { role: "user", content: prompt },
      ]
    : null;
  const requestStartedAtMs = Date.now();
  try {
    const result = await generateText({
      model: QWEN_DRAFT_MODEL,
      providerOptions: QWEN_DRAFT_PROVIDER_OPTIONS,
      temperature: 0,
      reasoning: "low",
      abortSignal: qwenStageAbortSignal(QWEN_DRAFT_TIMEOUT_MS, input.deadlineAt),
      output: Output.object({ name: "StoryGroupVerdict", schema: storyGroupSchema }),
      system: STORY_GROUP_PROMPT,
      prompt,
      onStepEnd: (event) => {
        completedStepRef.value = event;
      },
      experimental_telemetry: aiTelemetry("story_cluster", "story-group-qwen"),
    });
    const call = await resolveCallMeta({
      kind: "story_group",
      stage: "story_group",
      role: "story_group",
      model: QWEN_DRAFT_MODEL,
      output: JSON.stringify(result.output),
      reasoning: result.reasoningText ?? null,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
      latencyMs: Date.now() - requestStartedAtMs,
      telemetryInput,
    });
    const index = result.output.matchIndex;
    const matched =
      index !== null && index >= 1 && index <= input.stories.length
        ? input.stories[index - 1].storyId
        : null;
    return { call, matchStoryId: matched };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      // The call BILLED — ledger it, and treat the unusable verdict as "no match" (a duplicate
      // story is merely redundant; a lost story would be missing news).
      const step = completedStepRef.value;
      const call = await resolveCallMeta({
        kind: "story_group",
        stage: "story_group",
        role: "story_group",
        model: QWEN_DRAFT_MODEL,
        output: step?.text ?? error.text ?? null,
        reasoning: step?.reasoningText ?? null,
        usage: step?.usage ?? error.usage,
        providerMetadata: step?.providerMetadata,
        latencyMs: Date.now() - requestStartedAtMs,
        telemetryInput,
      });
      return { call, matchStoryId: null };
    }
    throw error;
  }
}
