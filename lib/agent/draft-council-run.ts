// lib/agent/draft-council-run.ts
//
// The story pipeline's shared types: `SourceBrief` (what a delivery hands to a model stage)
// and `CouncilCall` (what a model stage hands back for the pipeline to ledger). Live
// deliveries run relevance filtering, synthesis, then story grouping.
//
// Every stage's own module carries the model-call contract (AGENTS.md): every model call
// appears as its own `CouncilCall` element, carrying `output`, `reasoning`, and an explicitly
// stamped `reasoningWithheldByProvider`. An element missing from that array is a call whose
// trace is lost, which every stage's own module exists to prevent.

import type { TelemetryMessage } from "../observability/posthog-ai";
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
  kind: "filter" | "synthesis" | "story_group" | "alert_judge";
  stage: "filtering" | "synthesis" | "story_group" | "alert_judge"; // model_calls.stage
  role: "filter" | "synthesis" | "story_group" | "alert_judge"; // model_calls.role
  model: string;
  output: string | null; // verbatim; for a structured verdict, the serialized object
  reasoning: string | null;
  reasoningWithheldByProvider: boolean; // ALWAYS set, every element, no exceptions
  usage: unknown;
  costUsd: number | null;
  generationId: string | null;
  latencyMs: number | null;
  telemetryInput: TelemetryMessage[] | null;
};
