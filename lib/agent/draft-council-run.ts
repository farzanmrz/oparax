// lib/agent/draft-council-run.ts
//
// The drafting pipeline's shared types: `SourceBrief` (what a delivery hands to a drafting
// stage) and `CouncilCall` (what a drafting stage hands back for the pipeline to ledger). Live
// deliveries run a deterministic language check, an optional translation call, and one Qwen
// drafting/filtration call; those stages live in draft-translate.ts and draft-write.ts.
//
// Every stage's own module carries the model-call contract (AGENTS.md): every model call —
// translation, drafting, a repair — appears as its own `CouncilCall` element, carrying
// `output`, `reasoning`, and an explicitly stamped `reasoningWithheldByProvider`. An element
// missing from that array is a call whose trace is lost, which every stage's own module (this
// one, draft-translate.ts, draft-write.ts) exists to prevent.
import type { DraftConstruction } from "./draft-construction";
import type { SourceIdentity } from "./source-identity";

export type SourceBrief = {
  sourcePostId: string;
  xPostId: string;
  identity: SourceIdentity;
  text: string;
  /** Website headline when available. X posts have no separate title. */
  title?: string;
  /** BCP-47 source language supplied by X or website onboarding; null = unknown → the
   *  translator stage decides. */
  lang: string | null;
  /** Attached photos (full image) or video/GIF poster frames — descriptors only. The
   *  vision-capable drafter reads these original attachments directly. */
  media: { kind: string; imageUrl: string }[];
};

export type CouncilCall = {
  kind: "draft" | "judge" | "ground" | "synthesis" | "translation";
  stage: "drafting" | "judge" | "clustering" | "grounding" | "translation"; // model_calls.stage
  role: "primary" | "judge" | "grounding" | "translation"; // model_calls.role
  model: string;
  output: string | null; // verbatim; for a structured verdict, the serialized object
  reasoning: string | null;
  reasoningWithheldByProvider: boolean; // ALWAYS set, every element, no exceptions
  usage: unknown;
  costUsd: number | null;
  generationId: string | null;
  /** Present only for the live draft call: the model's structured editorial account, not
   * proof or chain-of-thought. Historic and human-originated calls may lack it. */
  draftConstruction?: DraftConstruction | null;
  /** Present only for the live primary draft: its explicit, reporter-facing beat decision.
   * It is kept distinct from raw provider reasoning so readers never need to parse that trace. */
  draftOnBeatReason?: string | null;
};
