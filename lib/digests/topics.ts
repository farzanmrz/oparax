import "server-only";

import { z } from "zod";

export const briefSchema = z.object({
  summary: z.string(),
  interests: z.array(z.string()),
  languages: z.array(z.string()),
  topic_terms: z.array(z.string().trim().min(1)),
});

const MAX_TOPIC_TERMS = 5;

export function githubTopics(brief: unknown): string[] {
  const { topic_terms } = briefSchema.parse(brief);
  const terms = topic_terms
    .map((term) =>
      term
        .replace(/["\\\p{Cc}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((term) => term.length > 0 && term.length <= 120);
  return [...new Set(terms)].slice(0, MAX_TOPIC_TERMS).map((term) => `"${term}"`);
}
