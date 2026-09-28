import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";

export const FACTS_MIN = 1;
export const FACTS_MAX = 5;
export const EVIDENCE_MIN = 1;
export const EVIDENCE_MAX = 3;
export const SUPPORT_LINE = 0.5;

const line = z
  .string()
  .trim()
  .min(1)
  .regex(/^[^\r\n\u2014]+$/);
export const evidenceSchema = z.object({ item: z.string().min(1), span: z.string().min(1) });
export const factSchema = z.object({
  text: line,
  evidence: z.array(evidenceSchema).min(EVIDENCE_MIN).max(EVIDENCE_MAX),
});
export const cardSchema = z.object({
  headline: line,
  facts: z.array(factSchema).min(FACTS_MIN).max(FACTS_MAX),
});
export const verifiedCardSchema = cardSchema.extend({
  facts: z
    .array(
      factSchema.extend({
        support: z.number().min(SUPPORT_LINE).max(1),
        attribution: z.number().min(SUPPORT_LINE).max(1),
      }),
    )
    .min(FACTS_MIN)
    .max(FACTS_MAX),
  publishers: z.array(z.object({ source_id: z.string(), name: z.string(), url: z.string() })),
  image: z.string().nullable(),
  headline_from: z.enum(["writer", "title", "first fact"]),
});
export type Card = z.infer<typeof cardSchema>;
export type Fact = z.infer<typeof factSchema>;
export type VerifiedCard = z.infer<typeof verifiedCardSchema>;
export type VerifiedFact = VerifiedCard["facts"][number];

export const itemViewSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  kind: z.enum(["article", "post"]),
  title: z.string(),
  text: z.string(),
  published_at: z.string(),
  url: z.string(),
  image: z.string().nullable(),
  lang: z.string().nullable(),
  outcome: z.enum(["full", "short", "unreadable"]),
  publisher: z.string(),
});
export type ItemView = z.infer<typeof itemViewSchema>;
export type FeedContext = {
  monitorId: string;
  runId: string;
  beat: string;
  brief: Json;
  source: { name: string; focus: string; description: string; why: string };
  item: ItemView;
  deadline: number;
};
export type StoryView = { id: string; headline: string; facts: VerifiedFact[] };
export type Drop = { fact: Fact; check: "code" | "jev support"; reasons: string[] };
export type CheckResult = {
  facts: VerifiedFact[];
  drops: Drop[];
  scores: Record<string, number>;
  headlineScore: number | null;
  error: string | null;
};
export type Attempt = {
  user: string;
  raw: string | null;
  error: string | null;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
  reasoning: "medium";
  repair: boolean;
};
export type WriteRecord = {
  trigger: "single source" | "new story" | "adds";
  item: string;
  system: string;
  user: string;
  attempts: Attempt[];
  raw: Card | null;
  checks: CheckResult | null;
  group: Record<string, number>;
  adds: Record<string, number>;
  repair: {
    user: string;
    card: Card | null;
    checks: CheckResult | null;
    used: boolean;
    note: string;
  } | null;
  headline_from: VerifiedCard["headline_from"];
  titleScore: number | null;
  final: "card" | "no card: no fact survived" | "write failed";
  verified: VerifiedCard | null;
};
export type WriteResult = {
  card: VerifiedCard | null;
  status: "written" | "no_card" | "write_failed";
  record: WriteRecord;
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
