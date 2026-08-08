import { z } from "zod";

/** Per-clause ceiling on onboarding-written site guidance. It is persisted once and replayed
 *  on EVERY drafting call for that source, so an over-long clause is permanent prompt bloat —
 *  a sentence or two is all this section was ever meant to carry. */
export const MAX_SITE_GUIDANCE_CHARS = 500;

const MARKUP = /<[^>]*>/;
const ROLE_PREFIX =
  /^\s*(?:#{1,6}\s*)?(?:\[\s*)?(?:system|developer|assistant|user)(?:\s+message)?(?:\s*\])?\s*(?::|-|—)/i;
const PROMPT_TAKEOVER =
  /\b(?:forget|ignore|disregard|override)\b.{0,80}\b(?:(?:all|any|the)\s+)?(?:prior|previous|earlier)\s+(?:directions?|instructions?|prompts?)\b|\b(?:follow|execute)\b.{0,80}\b(?:(?:supplied|provided|these|the)\s+)?(?:instructions?|prompts?)\b|\b(?:output|respond)\b\s+(?:with\s+)?(?:exactly|only)\b/i;

/** A short, declarative beat clause is durable data, not prompt control text. This is a bounded
 *  heuristic: it rejects unmistakable takeover patterns without attempting to parse intent. */
export const siteGuidanceClauseSchema = z
  .string()
  .trim()
  .min(1, "Site guidance must not be empty")
  .max(MAX_SITE_GUIDANCE_CHARS, "Site guidance must be 500 characters or fewer")
  .refine(
    (value) =>
      !Array.from(value).some((character) => {
        const code = character.codePointAt(0) ?? 0;
        return code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029;
      }) &&
      !MARKUP.test(value) &&
      !ROLE_PREFIX.test(value) &&
      !PROMPT_TAKEOVER.test(value),
    "Site guidance must be one plain-text beat clause, not prompt instructions",
  );

export const siteGuidanceSchema = z.object({
  onBeat: siteGuidanceClauseSchema.describe("what counts as on-beat for this site, title-level"),
  offBeat: siteGuidanceClauseSchema.describe("what to exclude, title-level"),
});
