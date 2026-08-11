// lib/agent/draft-pipeline.ts
//
// SERVER-ONLY — transitively imports lib/sysprompts via draft-council-run.ts (which loads
// its prompts at module scope); never importable from a client component.
//
// Owns ALL persistence and metering for the drafting path. The council
// (draft-council-run.ts) is pure and deliberately touches neither the DB nor the ledger —
// this module is where both cross-cutting invariants are actually satisfied (AGENTS.md's
// metering + model-call rules):
//   - every element of a council's `calls` array becomes exactly one `model_calls` row,
//     carrying `output`, `reasoning`, and `usage` (including `reasoningWithheldByProvider`).
//   - every touch point stamps `usage_events` — the inbound delivery, each model call.
// Ledger-first ordering throughout, the same discipline the extraction path uses: `model_calls`
// rows are written BEFORE the artifact rows (`drafts`) that point at them, so a failed
// artifact write never loses the record of a call already paid for.
import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { assignToStory } from "@/lib/agent/cluster";
import { checkXPostable, resolveDeskTier } from "@/lib/agent/desk-config";
import type { CouncilCall, SourceBrief } from "@/lib/agent/draft-council-run";
import { filterSourcePost } from "@/lib/agent/draft-filter";
import { synthesizeSourcePost } from "@/lib/agent/draft-synthesize";
import { translateSourcePost } from "@/lib/agent/draft-translate";
import { draftSourcePost } from "@/lib/agent/draft-write";
import { normalizeWebsitePublisherMention } from "@/lib/agent/source-identity";
import { validateSourceMedia } from "@/lib/agent/source-media";
import { draftingConversationId } from "@/lib/observability/ai-conversation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { extractBeatSpec } from "@/lib/voice/deploy-guide";
import { listVoiceRules, resolveDraftingPrompt } from "@/lib/voice/rules";
import { getXAccount } from "@/lib/x/store";

type AdminClient = ReturnType<typeof createAdminClient>;

// Part A (T2.4b): source_posts / IngestDelivery now carries a source discriminator —
// app/api/ingest/route.ts's ingestBodySchema (already locked) validates this exact shape and
// passes parsed.data straight through, so this type must match it field-for-field.
export type IngestDelivery =
  | {
      source: "x";
      x_post_id: string;
      author_handle: string;
      text: string;
      posted_at: string; // ISO
      lang?: string | null;
      /** Attached photos (full image) or video/GIF poster frames — descriptors only, feeding
       *  the drafter's multimodal input. Absent on most posts. */
      media?: { kind: string; imageUrl: string }[];
      raw?: unknown;
    }
  | {
      source: "website";
      source_config_id: string;
      external_id: string;
      url: string;
      title: string;
      text: string;
      author_handle: string | null;
      published_at: string | null;
      lang: string | null;
      raw?: unknown;
    };

export type ProcessDeliveryResult = {
  sourcePostId: string;
  /** True when the delivery was recorded but deliberately not drafted — see isLowSignal. */
  lowSignal?: boolean;
  drafted: Array<{
    agentId: string;
    winningModel: string;
    degraded: boolean;
    skipped?: "already_drafted" | "no_guide" | "off_beat" | "oversized" | "synthesis_unusable";
  }>;
};

export class RetryableDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableDeliveryError";
  }
}

const MIN_NEXT_CLAIM_BUDGET_MS = 30_000;
const DIRECT_SYNTHESIS_ENABLED = true;
const OVERSIZED_EXCLUSION_REASON = "This delivery was too large to process and was skipped.";
const SYNTHESIS_EXCLUSION_REASON =
  "This story couldn't be turned into news points and was skipped.";

/** A post whose text carries nothing to write FROM. The drafting models receive text only —
 *  never media — so "🌟 https://t.co/…" hands them an emoji and an opaque link, and the
 *  council either fails outright (a story stuck winner-less on the feed) or, worse, succeeds
 *  and emits "JUST IN: https://t.co/…" junk; both happened live on 2026-07-25. Strip links,
 *  @/# tags, emoji and whitespace — if what remains couldn't caption a photo, there is
 *  nothing to draft, so the delivery is recorded (source_posts) but never claims, clusters,
 *  or spends, and no story row means no feed card. Deterministic and free on purpose: this
 *  is NOT beat relevance (that's clustering's future job) — it only rejects posts whose text
 *  is structurally empty. Website headlines are part of that signal, so a useful title is not
 *  discarded merely because body retrieval fell back to a teaser. Text is NOT low-signal if a link is present AND at least 4 characters
 *  of caption remain after stripping @/# tags and emoji, OR (independent of any link) the
 *  stripped text alone is 12+ characters. */
function isLowSignal(text: string, title?: string, media: SourceBrief["media"] = []): boolean {
  if (media.length > 0) return false;
  const sourceText = title ? `${title}\n${text}` : text;
  const hasLink = /https?:\/\/\S+/.test(sourceText);
  const stripped = sourceText
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[@#][\p{L}\p{N}_]+/gu, "")
    .replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}|\u{20E3}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (hasLink && stripped.length >= 4) return false; // a link plus a real caption is signal
  return stripped.length < 12;
}

function requireTimeBudget(deadlineAt: number | undefined, beforeClaim = false): void {
  if (deadlineAt === undefined) return;
  const remaining = deadlineAt - Date.now();
  const required = beforeClaim ? MIN_NEXT_CLAIM_BUDGET_MS : 1;
  if (remaining < required) {
    throw new RetryableDeliveryError(
      `draft-pipeline: only ${Math.max(0, remaining)}ms remained in the drafting deadline`,
    );
  }
}

function isProviderInputTooLarge(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === "object" && error !== null && "statusCode" in error
      ? (error as { statusCode?: unknown }).statusCode
      : undefined;
  return (
    status === 413 ||
    /(?:context|input|request).{0,80}(?:too large|too long|exceed|limit)|(?:too large|too long|context length|input length)/i.test(
      message,
    )
  );
}

function isNewsPointsValidationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "22023" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("news_points")
  );
}

type MatchedAgent = {
  id: string;
  owner_id: string;
  reporter_handle: string;
  reporter_tier: string | null;
  beat: string;
  status: string;
};

/** Best-effort publisher extraction. A website hostname is provenance, never an X handle. */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** The title-level beat guidance #100's onboarding call already produces for this desk's
 *  source (#105) — previously computed and discarded, now persisted on `source_configs` and
 *  threaded here into the drafter's beat decision, so cases a URL path filter alone can't
 *  decide (e.g. "Barcelona the club" vs. "Barcelona the city") get the site-specific
 *  disambiguation the onboarding model already worked out. Best-effort: a lookup failure or
 *  a source with no guidance yet must never block or error drafting — the beat decision
 *  degrades to exactly today's behavior (desk-level beat text only) on any null return. */
async function fetchSiteGuidance(
  admin: AdminClient,
  agentId: string,
  sourceConfigId: string,
): Promise<{ onBeat: string; offBeat: string } | null> {
  // try/catch, not just the `{ error }` check below: a transport-level failure (rejected
  // connection, DNS, timeout) throws past the client instead of resolving to `{ error }`, and
  // this lookup's one caller isn't itself wrapped — an uncaught throw here would fail the
  // entire delivery for every matched desk, not just skip this best-effort lookup for one.
  try {
    const { data, error } = await admin
      .from("source_configs")
      .select("beat_guidance")
      .eq("agent_id", agentId)
      .eq("id", sourceConfigId)
      .maybeSingle();
    if (error || !data) return null;
    const guidance = data.beat_guidance as { onBeat?: string; offBeat?: string } | null;
    if (!guidance?.onBeat || !guidance?.offBeat) return null;
    return { onBeat: guidance.onBeat, offBeat: guidance.offBeat };
  } catch (err) {
    console.error("draft-pipeline: fetchSiteGuidance lookup failed", err);
    return null;
  }
}

/** The ONE place a `CouncilCall` becomes a `model_calls` row. Inserted one row at a time (not
 *  batched) so the returned ids are guaranteed aligned with `calls` BY INDEX — a batched
 *  insert's returned order is not a contract PostgREST makes, and a misaligned join would
 *  silently attribute a draft to the wrong model. */
async function insertModelCalls(
  admin: AdminClient,
  ownerId: string,
  calls: CouncilCall[],
  sourcePostId: string,
): Promise<string[]> {
  const ids: string[] = [];
  for (const call of calls) {
    const { data, error } = await admin
      .from("model_calls")
      .insert({
        owner_id: ownerId,
        stage: call.stage,
        role: call.role,
        model: call.model,
        output: call.output,
        reasoning: call.reasoning,
        usage: {
          ...(call.usage as object),
          reasoningWithheldByProvider: call.reasoningWithheldByProvider,
          // This model-produced editorial account is reporter-facing provenance, not proof or
          // chain-of-thought. Only live drafts carry it; historic, revision, and human calls do not.
          ...(call.draftConstruction === null || call.draftConstruction === undefined
            ? {}
            : { draftConstruction: call.draftConstruction }),
          // Persist the normalized verdict field separately from raw provider reasoning. The
          // reporter-facing sheet must never derive its beat explanation by parsing that trace.
          ...(call.draftOnBeatReason === null || call.draftOnBeatReason === undefined
            ? {}
            : { draftOnBeatReason: call.draftOnBeatReason }),
        } as unknown as Json,
        cost_usd: call.costUsd,
        generation_id: call.generationId,
        ref_kind: "source_post",
        ref_id: sourcePostId,
      })
      .select("id")
      .single();
    if (error) throw error;
    ids.push(data.id);
  }
  return ids;
}

async function stampUsageEvent(
  admin: AdminClient,
  row: { owner_id: string; kind: string; units: number; cost_usd: number | null; ref_id: string },
): Promise<void> {
  const { error } = await admin.from("usage_events").insert(row);
  // stream_delivery is idempotent on (owner_id, ref_id) in the database. A lost ingest
  // response can redeliver the same source post; that duplicate is success, while every other
  // ledger error remains fatal.
  const isDuplicateStreamDelivery =
    row.kind === "stream_delivery" &&
    error?.code === "23505" &&
    error.details?.includes("Key (owner_id, ref_id)=");
  if (error && !isDuplicateStreamDelivery) throw error;
}

async function completeClaimWithExclusion(
  admin: AdminClient,
  agentId: string,
  sourcePostId: string,
  claimToken: string,
  reason: string,
): Promise<boolean> {
  const { data: exclusionId, error } = await admin.rpc("upsert_claimed_exclusion", {
    p_agent_id: agentId,
    p_claim_token: claimToken,
    p_excluded_at: new Date().toISOString(),
    p_on_beat_reason: reason,
    p_source_post_id: sourcePostId,
  });
  if (error) throw error;
  return exclusionId !== null;
}

async function draftForAgent(
  admin: AdminClient,
  agent: MatchedAgent,
  sourcePostId: string,
  brief: SourceBrief,
  siteGuidance: { onBeat: string; offBeat: string } | null,
  options: { deadlineAt?: number; oversizedInput: boolean },
): Promise<ProcessDeliveryResult["drafted"][number]> {
  Sentry.setUser({ id: agent.owner_id });
  Sentry.setConversationId(undefined);
  const { data: guide, error: guideError } = await admin
    .from("voice_guides")
    .select("guide_raw, guide_deploy, measured_facts")
    .eq("agent_id", agent.id)
    .maybeSingle();
  if (guideError) throw guideError;
  if (!guide) {
    return { agentId: agent.id, winningModel: "", degraded: false, skipped: "no_guide" };
  }
  const beatSpec = extractBeatSpec(guide.guide_raw) ?? agent.beat;

  requireTimeBudget(options.deadlineAt, true);
  const claimToken = randomUUID();
  const { data: claimed, error: claimError } = await admin.rpc("claim_draft", {
    p_agent_id: agent.id,
    p_source_post_id: sourcePostId,
    p_stale_cutoff: new Date(Date.now() - 800 * 1_000).toISOString(),
    p_claim_token: claimToken,
  });
  if (claimError) throw claimError;
  if (!claimed) {
    return {
      agentId: agent.id,
      winningModel: "",
      degraded: false,
      skipped: "already_drafted",
    };
  }

  try {
    if (options.oversizedInput) {
      const completed = await completeClaimWithExclusion(
        admin,
        agent.id,
        sourcePostId,
        claimToken,
        OVERSIZED_EXCLUSION_REASON,
      );
      Sentry.captureMessage("draft-pipeline: terminal oversized delivery", {
        level: "warning",
        tags: { sourcePostId, agentId: agent.id, scope: "draft_oversized" },
      });
      return {
        agentId: agent.id,
        winningModel: "",
        degraded: false,
        skipped: completed ? "oversized" : "already_drafted",
      };
    }

    // The cheap relevance stage is always ledgered before its verdict controls the next call.
    const filtered = await filterSourcePost({
      brief,
      beatSpec,
      siteGuidance,
      deadlineAt: options.deadlineAt,
    });
    await insertModelCalls(admin, agent.owner_id, [filtered.call], sourcePostId);
    await stampUsageEvent(admin, {
      owner_id: agent.owner_id,
      kind: "filtering",
      units: 1,
      cost_usd: filtered.call.costUsd,
      ref_id: sourcePostId,
    });
    if (!filtered.verdict) {
      throw new Error(`draft-pipeline: filter verdict unusable for source post ${sourcePostId}`);
    }

    if (!filtered.verdict.onBeat) {
      const { data: exclusionId, error: exclusionError } = await admin.rpc(
        "upsert_claimed_exclusion",
        {
          p_agent_id: agent.id,
          p_claim_token: claimToken,
          p_excluded_at: new Date().toISOString(),
          p_on_beat_reason: filtered.verdict.onBeatReason,
          p_source_post_id: sourcePostId,
        },
      );
      if (exclusionError) throw exclusionError;
      if (exclusionId === null) {
        return {
          agentId: agent.id,
          winningModel: "",
          degraded: false,
          skipped: "already_drafted",
        };
      }
      return {
        agentId: agent.id,
        winningModel: "",
        degraded: false,
        skipped: "off_beat",
      };
    }

    requireTimeBudget(options.deadlineAt);
    let translation: string | null = null;
    let synthesisSourceText = brief.text;
    let synthesisSourceTitle = brief.title;
    if (!DIRECT_SYNTHESIS_ENABLED) {
      const translated = await translateSourcePost({ brief, deadlineAt: options.deadlineAt });
      if (translated.call) {
        await insertModelCalls(admin, agent.owner_id, [translated.call], sourcePostId);
        await stampUsageEvent(admin, {
          owner_id: agent.owner_id,
          kind: "translation",
          units: 1,
          cost_usd: translated.call.costUsd,
          ref_id: sourcePostId,
        });
      }
      if (!translated.usable || !translated.englishSourceText?.trim()) {
        throw new Error(`draft-pipeline: translation unusable for source post ${sourcePostId}`);
      }
      translation = translated.translation;
      synthesisSourceText = translated.englishSourceText;
      synthesisSourceTitle = undefined;
    }

    const synthesized = await synthesizeSourcePost({
      brief,
      sourceText: synthesisSourceText,
      sourceTitle: synthesisSourceTitle,
      deadlineAt: options.deadlineAt,
    });
    await insertModelCalls(admin, agent.owner_id, [synthesized.call], sourcePostId);
    await stampUsageEvent(admin, {
      owner_id: agent.owner_id,
      kind: "synthesis",
      units: 1,
      cost_usd: synthesized.call.costUsd,
      ref_id: sourcePostId,
    });
    if (!synthesized.verdict) {
      const completed = await completeClaimWithExclusion(
        admin,
        agent.id,
        sourcePostId,
        claimToken,
        SYNTHESIS_EXCLUSION_REASON,
      );
      Sentry.captureMessage("draft-pipeline: terminal unusable synthesis", {
        level: "warning",
        tags: { sourcePostId, agentId: agent.id, scope: "draft_synthesis_unusable" },
      });
      return {
        agentId: agent.id,
        winningModel: "",
        degraded: false,
        skipped: completed ? "synthesis_unusable" : "already_drafted",
      };
    }

    // Voice-rule composition is intentionally deferred until the story is known on-beat.
    const voiceGuidance = resolveDraftingPrompt(
      await listVoiceRules(agent.id),
      guide.measured_facts,
      guide.guide_deploy,
    );
    const xAccount = await getXAccount(agent.owner_id);
    const accountTier = resolveDeskTier(agent.reporter_tier, xAccount?.tier);
    const written = await draftSourcePost({
      identity: brief.identity,
      newsTitle: synthesized.verdict.newsTitle,
      newsPoints: synthesized.verdict.newsPoints,
      voiceGuidance,
      platform: "x",
      accountTier,
      deadlineAt: options.deadlineAt,
    });
    if (!written.verdict) {
      await insertModelCalls(admin, agent.owner_id, [written.call], sourcePostId);
      await stampUsageEvent(admin, {
        owner_id: agent.owner_id,
        kind: "drafting",
        units: 1,
        cost_usd: written.call.costUsd,
        ref_id: sourcePostId,
      });
      throw new Error(`draft-pipeline: drafter verdict unusable for source post ${sourcePostId}`);
    }
    const draftText = normalizeWebsitePublisherMention(written.verdict.draft, brief.identity);
    written.call.output = draftText;
    const [drafterCallId] = await insertModelCalls(
      admin,
      agent.owner_id,
      [written.call],
      sourcePostId,
    );
    await stampUsageEvent(admin, {
      owner_id: agent.owner_id,
      kind: "drafting",
      units: 1,
      cost_usd: written.call.costUsd,
      ref_id: sourcePostId,
    });
    const fit = checkXPostable(draftText, accountTier);
    if (!fit.ok) {
      console.error(
        `draft-pipeline: drafter output fails the X gate (${fit.reason}) for source post ${sourcePostId}; persisting for manual trim`,
      );
    }

    const cluster = await assignToStory({
      agentId: agent.id,
      sourcePostId,
      sourceIdentity: brief.identity,
      text: brief.text,
    });
    if (cluster.calls.length > 0) {
      // Ledger-first, same ordering discipline as every other CouncilCall producer here —
      // this insert happens BEFORE the platform fan-out's own ledger-first inserts.
      await insertModelCalls(admin, agent.owner_id, cluster.calls, sourcePostId);
      for (const call of cluster.calls) {
        await stampUsageEvent(admin, {
          owner_id: agent.owner_id,
          kind: "clustering",
          units: 1,
          cost_usd: call.costUsd,
          ref_id: sourcePostId,
        });
      }
    }

    Sentry.setConversationId(draftingConversationId(cluster.storyId));

    const { data: winningDraftId, error: winnerError } = await admin.rpc("insert_claimed_winner", {
      p_agent_id: agent.id,
      p_claim_token: claimToken,
      p_model_call_id: drafterCallId,
      p_news_points: synthesized.verdict.newsPoints as unknown as Json,
      p_news_synthesis: null as unknown as string,
      p_news_title: synthesized.verdict.newsTitle,
      p_on_beat_reason: filtered.verdict.onBeatReason,
      p_platform: "x",
      p_source_post_id: sourcePostId,
      p_story_id: cluster.storyId,
      p_translation: translation as unknown as string,
    });
    if (winnerError) {
      if (isNewsPointsValidationError(winnerError)) {
        const completed = await completeClaimWithExclusion(
          admin,
          agent.id,
          sourcePostId,
          claimToken,
          SYNTHESIS_EXCLUSION_REASON,
        );
        Sentry.captureException(winnerError, {
          tags: { sourcePostId, agentId: agent.id, scope: "draft_synthesis_validation" },
        });
        return {
          agentId: agent.id,
          winningModel: "",
          degraded: false,
          skipped: completed ? "synthesis_unusable" : "already_drafted",
        };
      }
      throw winnerError;
    }
    // No drafts row exists when the claim was lost between claim_draft and here (a concurrent
    // retry already won). Propagate so the outer catch releases draft_claims and allows a
    // retry. The billable stage ledger rows are already committed above, so no paid call is
    // discarded by this return.
    if (winningDraftId === null) {
      return {
        agentId: agent.id,
        winningModel: "",
        degraded: false,
        skipped: "already_drafted",
      };
    }

    return {
      agentId: agent.id,
      winningModel: written.call.model,
      degraded: false,
    };
  } catch (err) {
    if (isProviderInputTooLarge(err)) {
      try {
        const completed = await completeClaimWithExclusion(
          admin,
          agent.id,
          sourcePostId,
          claimToken,
          OVERSIZED_EXCLUSION_REASON,
        );
        Sentry.captureException(err, {
          tags: { sourcePostId, agentId: agent.id, scope: "draft_oversized" },
        });
        return {
          agentId: agent.id,
          winningModel: "",
          degraded: false,
          skipped: completed ? "oversized" : "already_drafted",
        };
      } catch (completionError) {
        Sentry.captureException(completionError, {
          tags: { sourcePostId, agentId: agent.id, scope: "draft_oversized_completion" },
        });
      }
    }
    const { error: releaseError } = await admin
      .from("draft_claims")
      .delete()
      .eq("source_post_id", sourcePostId)
      .eq("agent_id", agent.id)
      .eq("claim_token", claimToken)
      .is("completed_at", null);
    if (releaseError) {
      Sentry.captureException(releaseError, {
        tags: { sourcePostId, agentId: agent.id, scope: "draft_claims_release" },
      });
    }
    if (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) {
      throw new RetryableDeliveryError(
        "draft-pipeline: drafting deadline elapsed after a claimed run",
      );
    }
    throw err;
  }
}

export async function processDelivery(
  delivery: IngestDelivery,
  options: { deadlineAt?: number } = {},
): Promise<ProcessDeliveryResult> {
  const admin = createAdminClient();

  // Deduped-by-post-id (L4): redelivery of the same post must not create a second row — and must
  // not touch an existing one either. `ignoreDuplicates: true` makes the upsert an insert-if-
  // absent, ON CONFLICT DO NOTHING otherwise (verified against the installed postgrest-js:
  // `ignoreDuplicates` is the option name); a plain merge-upsert here would silently overwrite an
  // existing row's `text`/`author_handle`/`raw` out from under every draft already produced from
  // it, breaking the drafting contract's carry-over guarantee retroactively. A no-op conflict
  // returns no row via RETURNING, so the existing id is fetched separately when that happens.
  // Part A: the upsert branches on delivery.source — "x" upserts by x_post_id exactly as
  // before; "website" upserts by external_id (a deterministic hash, per the ingest schema's
  // comment), storing url/title/author_handle(nullable)/source, x_post_id left null.
  const onConflictColumn = delivery.source === "x" ? "x_post_id" : "external_id";
  const { data: upserted, error: upsertError } = await admin
    .from("source_posts")
    .upsert(
      delivery.source === "x"
        ? {
            source: "x",
            x_post_id: delivery.x_post_id,
            author_handle: delivery.author_handle,
            text: delivery.text,
            posted_at: delivery.posted_at,
            lang: delivery.lang ?? null,
            publisher_claim_kind: "aggregator",
            raw: (delivery.raw ?? null) as unknown as Json,
          }
        : {
            source: "website",
            source_config_id: delivery.source_config_id,
            external_id: delivery.external_id,
            url: delivery.url,
            title: delivery.title,
            author_handle: delivery.author_handle,
            text: delivery.text,
            posted_at: delivery.published_at,
            lang: delivery.lang,
            publisher_claim_kind: "outlet-characterization",
            raw: (delivery.raw ?? null) as unknown as Json,
          },
      { onConflict: onConflictColumn, ignoreDuplicates: true },
    )
    .select("id, lang, publisher_claim_kind");
  if (upsertError) throw upsertError;

  let sourcePost: {
    id: string;
    lang: string | null;
    publisher_claim_kind: SourceBrief["publisherClaimKind"];
  };
  if (upserted && upserted.length > 0) {
    sourcePost = upserted[0];
  } else {
    const conflictValue = delivery.source === "x" ? delivery.x_post_id : delivery.external_id;
    const { data: existing, error: existingError } = await admin
      .from("source_posts")
      .select("id, lang, publisher_claim_kind")
      .eq(onConflictColumn, conflictValue)
      .single();
    if (existingError) throw existingError;
    sourcePost = existing;
  }
  const sourcePostId = sourcePost.id;

  const mediaValidation =
    delivery.source === "x"
      ? await validateSourceMedia(delivery.media, options.deadlineAt)
      : { media: [], oversized: false };
  if (
    delivery.source === "x" &&
    delivery.media?.length &&
    mediaValidation.media.length === 0 &&
    !mediaValidation.oversized
  ) {
    console.warn("draft-pipeline: all delivery media dropped before low-signal evaluation", {
      sourcePostId,
      deliveredMediaCount: delivery.media.length,
    });
  }

  // The low-signal gate sits AFTER the source_posts upsert (the record is kept — the post
  // really was delivered) and BEFORE matching/claiming/clustering (nothing downstream runs,
  // nothing bills, no story row is created so the feed never shows it).
  if (
    !mediaValidation.oversized &&
    isLowSignal(
      delivery.text,
      delivery.source === "website" ? delivery.title : undefined,
      mediaValidation.media,
    )
  ) {
    return { sourcePostId, lowSignal: true, drafted: [] };
  }

  // Route by source. An "x" delivery matches tracked_handles exactly as before (PostgREST's
  // array `contains` filter matches elements exactly, so a stored handle whose casing differs
  // from the delivery's would silently never match — fetch every agent and compare
  // lowercased in application code instead, see task-7-report.md). A website delivery carries
  // the exact source_configs id that found it; hostname matching cannot distinguish two paths
  // on one publisher and loses valid sitemap subdomain entries.
  // Unbounded per-delivery scan, deliberately: bounded by tenant count (a small table today, no
  // near-term latency risk), not by delivery volume. A `.eq("status", "active")` prefilter was
  // considered and rejected — it would silently change what counts as "matched" for the
  // paused-desk metering/unmatched-deliveries behavior documented below (a paused desk must
  // still count toward `matched` there). A real bound needs a Postgres function doing
  // server-side case-insensitive array matching, which is schema-adjacent and out of scope for
  // a no-schema-change slice — deferred, not silently fixed.
  const { data: allAgents, error: agentsError } = await admin
    .from("agents")
    .select(
      "id, owner_id, reporter_handle, reporter_tier, beat, tracked_handles, websites, status",
    );
  if (agentsError) throw agentsError;
  let websiteSourceAgentId: string | null = null;
  let websiteSourceLanguage: string | null = null;
  if (delivery.source === "website") {
    const { data: sourceConfig, error: sourceConfigError } = await admin
      .from("source_configs")
      .select("agent_id, language")
      .eq("id", delivery.source_config_id)
      .maybeSingle();
    if (sourceConfigError) throw sourceConfigError;
    websiteSourceAgentId = sourceConfig?.agent_id ?? null;
    websiteSourceLanguage = sourceConfig?.language ?? null;
  }
  const matched: MatchedAgent[] =
    delivery.source === "x"
      ? (() => {
          const wantedHandle = delivery.author_handle.toLowerCase();
          return (allAgents ?? []).filter((e) =>
            e.tracked_handles.some((h) => h.toLowerCase() === wantedHandle),
          );
        })()
      : (allAgents ?? []).filter((e) => e.id === websiteSourceAgentId);

  // D16a: usage_events.owner_id is NOT NULL, so an unmatched delivery (no agent tracks
  // this author) is invisible to usage_events and, with it, to the stream-volume alarm — there
  // is no owner to bill, so there was no row and no signal. Best-effort: a write failure here
  // must never change processDelivery's response or its drafting outcome. unmatched_deliveries'
  // columns (x_post_id, author_handle) are both NOT NULL and x-shaped — only an "x"-sourced miss
  // stamps this table; an unmatched "website" delivery is log-only (see task-20-report.md).
  if (matched.length === 0) {
    if (delivery.source === "x") {
      const { error: unmatchedError } = await admin
        .from("unmatched_deliveries")
        .insert({ x_post_id: delivery.x_post_id, author_handle: delivery.author_handle });
      if (unmatchedError) {
        console.error("draft-pipeline: unmatched_deliveries insert failed", unmatchedError);
      }
    } else {
      console.error(
        `draft-pipeline: unmatched website delivery, no agent tracks ${delivery.url} — not stamped to unmatched_deliveries`,
      );
    }
  }

  // Stamp the delivery — one row per distinct matched owner; no match, no stamp (a
  // usage_events row requires an owner and there is no one to bill — see task-7-report.md).
  const distinctOwnerIds = [...new Set(matched.map((e) => e.owner_id))];
  for (const ownerId of distinctOwnerIds) {
    await stampUsageEvent(admin, {
      owner_id: ownerId,
      kind: "stream_delivery",
      units: 1,
      cost_usd: null,
      ref_id: sourcePostId,
    });
  }

  const brief: SourceBrief =
    delivery.source === "x"
      ? {
          sourcePostId,
          xPostId: delivery.x_post_id,
          identity: { kind: "x", handle: delivery.author_handle },
          text: delivery.text,
          lang: sourcePost.lang ?? delivery.lang ?? null,
          media: mediaValidation.media,
          publisherClaimKind: sourcePost.publisher_claim_kind,
        }
      : {
          sourcePostId,
          xPostId: "",
          identity: { kind: "website", publisher: hostnameOf(delivery.url) },
          title: delivery.title,
          text: delivery.text,
          lang: sourcePost.lang ?? websiteSourceLanguage ?? delivery.lang,
          // Website sources carry no structured media descriptors this slice.
          media: [],
          publisherClaimKind: sourcePost.publisher_claim_kind,
        };

  const drafted: ProcessDeliveryResult["drafted"] = [];
  for (const agent of matched) {
    // Draft only for ACTIVE desks. A paused desk still appears in `matched` (it tracks this
    // author, so it still counts for the unmatched check and the delivery metering above — the
    // stream volume was real), but pausing means "stop watching the beat": no new drafts. Without
    // this gate the pause control just flips a `status` column that nothing downstream reads. The
    // worker also drops paused desks' handles from the stream on its next ~5-min rule rebuild;
    // this is the immediate guard for that lag window and for hand-seeded deliveries.
    if (agent.status !== "active") continue;
    // A serial fan-out never acquires a new claim if the route cannot leave enough time for the
    // claimed desk's release path. The worker treats the resulting 503 as retryable.
    requireTimeBudget(options.deadlineAt, true);
    const siteGuidance =
      delivery.source === "website"
        ? await fetchSiteGuidance(admin, agent.id, delivery.source_config_id)
        : null;
    drafted.push(
      await draftForAgent(admin, agent, sourcePostId, brief, siteGuidance, {
        deadlineAt: options.deadlineAt,
        oversizedInput: mediaValidation.oversized,
      }),
    );
  }

  return { sourcePostId, drafted };
}
