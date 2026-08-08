import { z } from "zod";

const ruleTextSchema = z.string().trim().min(1).max(750);
const explanationSchema = z.string().trim().min(1).max(500);
const MAX_DRAFT_ON_BEAT_REASON_CODE_POINTS = 750;
const draftOnBeatReasonSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => Array.from(value).length <= MAX_DRAFT_ON_BEAT_REASON_CODE_POINTS,
    `Must be at most ${MAX_DRAFT_ON_BEAT_REASON_CODE_POINTS} code points`,
  );

/** A concise, model-produced editorial account of how a live draft was constructed. This is
 * deliberately structured provenance for reporters, not proof of the model's reasoning or
 * chain-of-thought. */
export const draftConstructionSchema = z.object({
  version: z.literal(1),
  appliedRules: z
    .array(
      z.object({
        rule: ruleTextSchema,
        why: explanationSchema,
      }),
    )
    .min(1)
    .max(5),
  postMode: z.object({
    name: z.string().trim().min(1).max(160),
    description: explanationSchema,
    whyThisSourceFits: explanationSchema,
  }),
  formattingChoices: z
    .array(
      z.object({
        choice: z.string().trim().min(1).max(250),
        why: explanationSchema,
      }),
    )
    .min(1)
    .max(5),
});

export type DraftConstruction = z.infer<typeof draftConstructionSchema>;

/** The explicit beat decision a live drafter returned. Stored separately from the provider's
 * raw trace so the reporter-facing sheet never has to infer it from that trace. */
export function normalizeDraftOnBeatReason(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Array.from(trimmed).slice(0, MAX_DRAFT_ON_BEAT_REASON_CODE_POINTS).join("");
}

/** Reads only the bounded, explicit beat-decision provenance that live drafts persist. */
export function draftOnBeatReasonFromUsage(usage: unknown): string | null {
  if (typeof usage !== "object" || usage === null || Array.isArray(usage)) return null;
  const parsed = draftOnBeatReasonSchema.safeParse(
    (usage as Record<string, unknown>).draftOnBeatReason,
  );
  return parsed.success ? parsed.data : null;
}

/** Historic, revision, and human-originated model calls may have no construction account. */
export function draftConstructionFromUsage(usage: unknown): DraftConstruction | null {
  if (typeof usage !== "object" || usage === null || Array.isArray(usage)) return null;
  const parsed = draftConstructionSchema.safeParse(
    (usage as Record<string, unknown>).draftConstruction,
  );
  return parsed.success ? parsed.data : null;
}
