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
import { translateSourcePost } from "@/lib/agent/draft-translate";
import { draftSourcePost } from "@/lib/agent/draft-write";
import { normalizeWebsitePublisherMention } from "@/lib/agent/source-identity";
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
    skipped?: "already_drafted" | "no_guide" | "off_beat";
  }>;
};

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
function isLowSignal(text: string, title?: string): boolean {
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

async function draftForAgent(
  admin: AdminClient,
  agent: MatchedAgent,
  sourcePostId: string,
  brief: SourceBrief,
  siteGuidance: { onBeat: string; offBeat: string } | null,
): Promise<ProcessDeliveryResult["drafted"][number]> {
  // WHICH reporter's desk was drafting is most of an error report's diagnostic value, and this
  // path runs from /api/ingest's Bearer-authed delivery — no user session exists to attribute it
  // automatically. The owner id only; the desk's content stays out of Sentry (ai-telemetry.ts
  // keeps drafting content unrecorded).
  Sentry.setUser({ id: agent.owner_id });
  // A desk with no voice guide is a valid working state — its sources are tracked and
  // ingestion runs; only drafting waits. Checked
  // BEFORE the atomic claim below: a no-guide desk must not burn a draft_claims row it will
  // never use.
  const { data: guide, error: guideError } = await admin
    .from("voice_guides")
    .select("guide_raw, guide_deploy, measured_facts")
    .eq("agent_id", agent.id)
    .maybeSingle();
  if (guideError) throw guideError;
  if (!guide) {
    return { agentId: agent.id, winningModel: "", degraded: false, skipped: "no_guide" };
  }
  // rules.ts's own docstring names this composition step "the drafting call sites' job" —
  // flattened enabled voice_rules + measured facts is the actual drafting input of record,
  // falling back to the raw deployed guide only when no rule is enabled yet.
  const voiceGuidance = resolveDraftingPrompt(
    await listVoiceRules(agent.id),
    guide.measured_facts,
    guide.guide_deploy,
  );
  const beatSpec = extractBeatSpec(guide.guide_raw) ?? agent.beat;
  const xAccount = await getXAccount(agent.owner_id);
  const accountTier = resolveDeskTier(agent.reporter_tier, xAccount?.tier);

  const claimToken = randomUUID();
  // Atomic claim/reclaim: a delivery that outlives the ingest route's 800-second budget can
  // leave a claim behind without running the catch below. The RPC inserts when absent and only
  // reclaims a claim older than that same route budget, preserving an in-progress delivery.
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

  // The claim above is a "drafting started" marker, not "drafting done". Every step below is
  // paid or fallible; if any throws (a transient gateway 5xx, a DB error), the claim must be
  // RELEASED — otherwise the worker's retry cannot re-attempt until claim_draft's stale cutoff.
  // The attempt token prevents an old claimant from deleting a newer reclaimed claim.
  // Release-on-failure reopens the (source_post, agent) pair immediately; the re-run re-bills,
  // which is the right trade against a silently lost draft. The on-beat happy path AND the
  // off-beat outcome both leave the claim in place (dedup intact) — an off-beat verdict must not
  // be re-billed on redelivery.
  try {
    // Stage 1: deterministic English sources skip translation entirely. Any completed model call
    // is ledgered and metered before its output can decide whether drafting continues.
    const translated = await translateSourcePost({ brief });
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

    // Stage 2: one Qwen pass makes the beat decision, generated news title, news synthesis, and draft.
    const written = await draftSourcePost({
      source: { identity: brief.identity, media: brief.media },
      englishSourceText: translated.englishSourceText,
      beatSpec,
      siteGuidance,
      voiceGuidance,
      platform: "x",
      accountTier,
    });
    if (written.verdict?.onBeat && written.verdict.draft !== null) {
      written.call.output = normalizeWebsitePublisherMention(written.verdict.draft, brief.identity);
    }
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
    if (!written.verdict) {
      throw new Error(`draft-pipeline: draft verdict unusable for source post ${sourcePostId}`);
    }
    const verdict = written.verdict;

    if (!verdict.onBeat) {
      // Persist every off-beat verdict so a reporter can review what got filtered and why
      // (the Excluded tab reads this). One verdict, one reason: the single drafter's — the
      // grounder-vs-judge arbitration beta recorded here died with those stages.
      const { data: exclusionId, error: exclusionError } = await admin.rpc(
        "upsert_claimed_exclusion",
        {
          p_agent_id: agent.id,
          p_claim_token: claimToken,
          p_excluded_at: new Date().toISOString(),
          p_on_beat_reason: verdict.onBeatReason,
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

      // Off-beat: no story row, no council, no drafts row — reported, not drafted-and-hidden.
      return {
        agentId: agent.id,
        winningModel: "",
        degraded: false,
        skipped: "off_beat",
      };
    }

    const unnormalizedDraftText = verdict.draft;
    if (unnormalizedDraftText === null) {
      throw new Error(
        `draft-pipeline: on-beat verdict missing draft for source post ${sourcePostId}`,
      );
    }
    const draftText = normalizeWebsitePublisherMention(unnormalizedDraftText, brief.identity);
    written.call.output = draftText;
    const fit = checkXPostable(draftText, accountTier);
    if (!fit.ok) {
      console.error(
        `draft-pipeline: drafter output fails the X gate (${fit.reason}) for source post ${sourcePostId}; persisting for manual trim`,
      );
    }

    // Part B: on-beat — one story per source post, directly (CLUSTERING_ENABLED stays off; the
    // clustering path is not newly built into this flow).
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

    // Grouping by story id is what lets Explore > Conversations show one story's drafting
    // call as a single readable thread. Set after clustering because the story id does not
    // exist before it; every AI span below inherits it from the isolation scope.
    Sentry.setConversationId(draftingConversationId(cluster.storyId));

    // Part C: the X winner row. Its model-call provenance is the single drafter; no
    // verification judge or audit row follows this stage. The draft is persisted here and
    // surfaced to the reporter in the app feed — there is no push delivery channel.
    const { data: winningDraftId, error: winnerError } = await admin.rpc("insert_claimed_winner", {
      p_agent_id: agent.id,
      p_claim_token: claimToken,
      p_model_call_id: drafterCallId,
      p_news_synthesis: verdict.newsSynthesis,
      p_news_title: verdict.newsTitle,
      p_platform: "x",
      p_source_post_id: sourcePostId,
      p_story_id: cluster.storyId,
      // The column is nullable and the translation fast path deliberately persists null;
      // generated RPC args model PostgreSQL text as non-nullable.
      p_translation: translated.translation as string,
    });
    if (winnerError) throw winnerError;
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
    // Release the claim so a retry of this delivery can re-attempt (see the comment above).
    // The delete's own result must be inspected: a release that silently fails leaves the claim
    // held until claim_draft's stale cutoff and this (source_post, agent) pair cannot produce a
    // draft promptly — capture it so the failure is at
    // least visible, using the same tagged Sentry.captureException pattern post-core.ts uses
    // elsewhere in that file (not releaseClaim's own console-only handling).
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
    throw err;
  }
}

export async function processDelivery(delivery: IngestDelivery): Promise<ProcessDeliveryResult> {
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
            raw: (delivery.raw ?? null) as unknown as Json,
          },
      { onConflict: onConflictColumn, ignoreDuplicates: true },
    )
    .select("id");
  if (upsertError) throw upsertError;

  let sourcePostId: string;
  if (upserted && upserted.length > 0) {
    sourcePostId = upserted[0].id;
  } else {
    const conflictValue = delivery.source === "x" ? delivery.x_post_id : delivery.external_id;
    const { data: existing, error: existingError } = await admin
      .from("source_posts")
      .select("id")
      .eq(onConflictColumn, conflictValue)
      .single();
    if (existingError) throw existingError;
    sourcePostId = existing.id;
  }

  // The low-signal gate sits AFTER the source_posts upsert (the record is kept — the post
  // really was delivered) and BEFORE matching/claiming/clustering (nothing downstream runs,
  // nothing bills, no story row is created so the feed never shows it).
  if (isLowSignal(delivery.text, delivery.source === "website" ? delivery.title : undefined)) {
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
  if (delivery.source === "website") {
    const { data: sourceConfig, error: sourceConfigError } = await admin
      .from("source_configs")
      .select("agent_id")
      .eq("id", delivery.source_config_id)
      .maybeSingle();
    if (sourceConfigError) throw sourceConfigError;
    websiteSourceAgentId = sourceConfig?.agent_id ?? null;
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
          lang: delivery.lang ?? null,
          media: delivery.media ?? [],
        }
      : {
          sourcePostId,
          xPostId: "",
          identity: { kind: "website", publisher: hostnameOf(delivery.url) },
          title: delivery.title,
          text: delivery.text,
          lang: delivery.lang,
          // Website sources carry no structured media descriptors this slice.
          media: [],
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
    const siteGuidance =
      delivery.source === "website"
        ? await fetchSiteGuidance(admin, agent.id, delivery.source_config_id)
        : null;
    drafted.push(await draftForAgent(admin, agent, sourcePostId, brief, siteGuidance));
  }

  return { sourcePostId, drafted };
}
