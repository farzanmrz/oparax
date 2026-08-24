// lib/agent/draft-council-run.ts
//
// The drafting pipeline's shared types: `SourceBrief` (what a delivery hands to a drafting
// stage) and `CouncilCall` (what a drafting stage hands back for the pipeline to ledger). Live
// deliveries run relevance filtering, optional translation fallback, synthesis, then drafting.
//
// Every stage's own module carries the model-call contract (AGENTS.md): every model call —
// translation, drafting, a repair — appears as its own `CouncilCall` element, carrying
// `output`, `reasoning`, and an explicitly stamped `reasoningWithheldByProvider`. An element
// missing from that array is a call whose trace is lost, which every stage's own module (this
// one, draft-translate.ts, draft-write.ts) exists to prevent.

import type { TelemetryMessage } from "../observability/posthog-ai";
import type { DraftConstruction } from "./draft-construction";
import type { SourceIdentity } from "./source-identity";

export type PublisherClaimKind =
  | "official"
  | "insider-sourced"
  | "outlet-characterization"
  | "aggregator";

export type NewsPoint = { reason: string; point: string };

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
  /** Attached photos (full image) or video/GIF poster frames — descriptors only. Filter and
   *  synthesizer read them; the drafter only receives persisted news points. */
  media: { kind: string; imageUrl: string }[];
  /** Conservative source-level attribution context. Explicit source text always wins. */
  publisherClaimKind: PublisherClaimKind;
};

export type CouncilCall = {
  kind: "draft" | "filter" | "judge" | "ground" | "synthesis" | "translation";
  stage:
    | "drafting"
    | "filtering"
    | "judge"
    | "clustering"
    | "grounding"
    | "synthesis"
    | "translation"; // model_calls.stage
  role: "filter" | "primary" | "judge" | "grounding" | "synthesis" | "translation"; // model_calls.role
  model: string;
  output: string | null; // verbatim; for a structured verdict, the serialized object
  reasoning: string | null;
  reasoningWithheldByProvider: boolean; // ALWAYS set, every element, no exceptions
  usage: unknown;
  costUsd: number | null;
  generationId: string | null;
  latencyMs: number | null;
  telemetryInput: TelemetryMessage[] | null;
  /** Present only for the live draft call: the model's structured editorial account, not
   * proof or chain-of-thought. Historic and human-originated calls may lack it. */
  draftConstruction?: DraftConstruction | null;
  /** Present only for the live primary draft: its explicit, reporter-facing beat decision.
   * It is kept distinct from raw provider reasoning so readers never need to parse that trace. */
  draftOnBeatReason?: string | null;
};
