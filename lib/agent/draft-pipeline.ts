// lib/agent/draft-pipeline.ts
//
// SERVER-ONLY — transitively imports lib/sysprompts via draft-council-run.ts (which loads
// its prompts at module scope); never importable from a client component.
//
// Owns ALL persistence and metering for the drafting path. The council
// (draft-council-run.ts) and the notify senders (lib/notify/*) are pure and deliberately
// touch neither the DB nor the ledger — this module is where both cross-cutting invariants
// are actually satisfied (AGENTS.md's metering + model-call rules):
//   - every element of a council's `calls` array becomes exactly one `model_calls` row,
//     carrying `output`, `reasoning`, and `usage` (including `reasoningWithheldByProvider`).
//   - every touch point stamps `usage_events` — the inbound delivery, each model call,
//     each Slack push, each email send, each verified inbound reply.
// Ledger-first ordering throughout, copied from scripts/extract-voice-guide.ts: `model_calls`
// rows are written BEFORE the artifact rows (`post_drafts`) that point at them, so a failed
// artifact write never loses the record of a call already paid for.
import { assignToStory } from "@/lib/agent/cluster";
import { PLATFORMS, type Platform } from "@/lib/agent/desk-config";
import {
  type CouncilCall,
  type CouncilResult,
  reviseDraft,
  runDraftCouncil,
  type SourceBrief,
} from "@/lib/agent/draft-council-run";
import { composeDraftMessage, composeDraftMessagePlainText } from "@/lib/notify/compose";
import { sendDraftEmail } from "@/lib/notify/email";
import { sendSlackMessage } from "@/lib/notify/slack";
import { buildDraftBlocks, postMessage } from "@/lib/slack/api";
import { getSlackAccount } from "@/lib/slack/store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { listVoiceRules, resolveDraftingPrompt } from "@/lib/voice/rules";
import { postDraftToXForOwner } from "@/lib/x/actions";
import { sumCosts } from "./usage-cost";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Email draft-delivery is DORMANT — the shipped flow notifies on Slack only. Until now this
 *  path was inert only by accident (the `RESEND_*` keys were never provisioned), so provisioning
 *  Resend for any other reason would have silently switched draft emails back on. This makes it
 *  a decision. `lib/notify/email.ts`, the plus-addressed reply encoding, and the inbound-reply
 *  webhook all stay wired behind it — flipping this to `true` (with the keys set) restores the
 *  whole email leg, including reply-to-correct-a-draft. */
const EMAIL_DELIVERY_ENABLED = false;

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
      raw?: unknown;
    }
  | {
      source: "website";
      external_id: string;
      url: string;
      title: string;
      text: string;
      author_handle: string | null;
      published_at: string | null;
      raw?: unknown;
    };

export type ProcessDeliveryResult = {
  sourcePostId: string;
  drafted: Array<{
    experimentId: string;
    winningModel: string;
    degraded: boolean;
    skipped?: "already_drafted" | "no_guide";
  }>;
};

type MatchedExperiment = {
  id: string;
  owner_id: string;
  reporter_handle: string;
  status: string;
  auto_post_master: boolean;
  auto_post_sources: Json;
};

/** Best-effort hostname extraction — used both for the website-source experiment match key
 *  (an experiment's `websites` array holds tracked site URLs, an incoming delivery's `url` is
 *  a specific article on that site, so matching by hostname/origin is the right key, not an
 *  exact URL match) and as the author-handle fallback for a website post with a null
 *  `author_handle` (see the brief-context comment on `assignToStory`'s call site below).
 *  Malformed input degrades to "" rather than throwing — every caller treats "" as no-match /
 *  no-fallback. */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** A "website" delivery is tracked via `experiments.websites` (a desk's own list of tracked
 *  site URLs, saved in Wave 3), NOT via `tracked_handles`/`author_handle` — see the matching
 *  branch in `processDelivery` below. */
function matchesTrackedWebsite(websites: Json, deliveryUrl: string): boolean {
  const host = hostnameOf(deliveryUrl);
  if (!host || !Array.isArray(websites)) return false;
  return websites.some((w) => typeof w === "string" && hostnameOf(w) === host);
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
  if (error) throw error;
}

/** Slack push + (conditionally) email, each independently error-tolerant: a channel outage
 *  must never discard an already-paid council run's drafts. Only a channel that actually
 *  sent stamps its usage_events row.
 *
 *  QC fix: the per-desk Slack app (lib/slack/*, item 5) was built and linkable but this
 *  function still only ever called the legacy workspace webhook (sendSlackMessage) — the
 *  Block Kit "Post to X" button (buildDraftBlocks) and the whole interactions route were
 *  unreachable in every real delivery. Fixed: a linked desk (slack_accounts row present) gets
 *  the real per-desk push with the actionable button; SLACK_WEBHOOK_URL is now genuinely the
 *  legacy fallback for a desk that hasn't linked Slack, matching AGENTS.md's documented
 *  intent. */
async function deliverDraft(
  admin: AdminClient,
  input: {
    experimentId: string;
    ownerId: string;
    authorHandle: string;
    sourceText: string;
    winningText: string;
    modelCount: number;
    totalCostUsd: number | null;
    winningPostDraftId: string;
    winningPlatform: Platform;
    sourcePostId: string;
    revised: boolean;
  },
): Promise<void> {
  // Slack mrkdwn and plain text are NOT interchangeable: the same string in an email body
  // renders its `*bold*` and `>` markers literally. One input, two renderings.
  const composeInput = {
    authorHandle: input.authorHandle,
    sourceText: input.sourceText,
    winningText: input.winningText,
    modelCount: input.modelCount,
    totalCostUsd: input.totalCostUsd,
    revised: input.revised,
  };
  const message = composeDraftMessage(composeInput);

  try {
    const slackAccount = await getSlackAccount(input.experimentId);
    if (slackAccount) {
      // The interactive button always posts to X (SLACK_POST_TO_X_ACTION_ID ->
      // postDraftToXForOwner) — only attach it when the winning draft actually IS an X draft.
      // Otherwise (X's council failed and another platform's draft won instead) this would
      // wire "Post to X" to a LinkedIn/Bluesky draft, posting the wrong platform's content.
      await postMessage({
        channelId: slackAccount.channel_id,
        accessToken: slackAccount.access_token,
        text: message,
        ...(input.winningPlatform === "x"
          ? {
              blocks: buildDraftBlocks({
                text: input.winningText,
                postDraftId: input.winningPostDraftId,
              }),
            }
          : {}),
      });
    } else {
      await sendSlackMessage(message);
    }
    await stampUsageEvent(admin, {
      owner_id: input.ownerId,
      kind: "slack_notification",
      units: 1,
      cost_usd: null,
      ref_id: input.sourcePostId,
    });
  } catch (err) {
    console.error("draft-pipeline: slack delivery failed", err);
  }

  const { RESEND_API_KEY, RESEND_FROM, RESEND_REPLY_DOMAIN, NOTIFY_EMAIL_TO } = process.env;
  if (
    EMAIL_DELIVERY_ENABLED &&
    RESEND_API_KEY &&
    RESEND_FROM &&
    RESEND_REPLY_DOMAIN &&
    NOTIFY_EMAIL_TO
  ) {
    try {
      await sendDraftEmail({
        to: NOTIFY_EMAIL_TO,
        subject: `${input.revised ? "Revised draft" : "New draft"} from @${input.authorHandle}`,
        text: composeDraftMessagePlainText(composeInput),
        postDraftId: input.winningPostDraftId,
      });
      await stampUsageEvent(admin, {
        owner_id: input.ownerId,
        kind: "email_notification",
        units: 1,
        cost_usd: null,
        ref_id: input.sourcePostId,
      });
    } catch (err) {
      console.error("draft-pipeline: email delivery failed", err);
    }
  }
}

async function draftForExperiment(
  admin: AdminClient,
  experiment: MatchedExperiment,
  sourcePostId: string,
  brief: SourceBrief,
  deliverySource: IngestDelivery["source"],
): Promise<ProcessDeliveryResult["drafted"][number]> {
  // A desk with no voice guide is a valid working state — its sources are tracked and
  // ingestion runs; only drafting waits. Checked
  // BEFORE the atomic claim below: a no-guide desk must not burn a draft_claims row it will
  // never use.
  const { data: guide, error: guideError } = await admin
    .from("voice_guides")
    .select("guide_deploy, measured_facts")
    .eq("experiment_id", experiment.id)
    .maybeSingle();
  if (guideError) throw guideError;
  if (!guide) {
    return { experimentId: experiment.id, winningModel: "", degraded: false, skipped: "no_guide" };
  }
  // rules.ts's own docstring names this composition step "the drafting call sites' job" —
  // flattened enabled voice_rules + measured facts is the actual drafting input of record,
  // falling back to the raw deployed guide only when no rule is enabled yet.
  const voiceGuidance = resolveDraftingPrompt(
    await listVoiceRules(experiment.id),
    guide.measured_facts,
    guide.guide_deploy,
  );

  // Atomic claim (D16): draft_claims carries UNIQUE(source_post_id, experiment_id), so this
  // insert IS the idempotency check — a non-atomic select-then-check here could let two
  // concurrent deliveries (or a redelivery racing an in-flight draft) both pass the check and
  // both pay for runDraftCouncil below. A 23505 unique-violation means another delivery already
  // claimed this pair — return the same already-drafted shape the old select-then-check
  // returned; any other error propagates as before.
  const { error: claimError } = await admin
    .from("draft_claims")
    .insert({ source_post_id: sourcePostId, experiment_id: experiment.id })
    .select("id");
  if (claimError) {
    if (claimError.code === "23505") {
      return {
        experimentId: experiment.id,
        winningModel: "",
        degraded: false,
        skipped: "already_drafted",
      };
    }
    throw claimError;
  }

  // The claim above is a "drafting started" marker, not "drafting done". Every step below is
  // paid or fallible; if any throws (a transient gateway 5xx, a DB error), the claim must be
  // RELEASED — otherwise the worker's retry hits the 23505 above, returns already_drafted, and
  // permanently drops a draft that the retry would have produced. Release-on-failure reopens the
  // (source_post, experiment) pair for the retry; the re-run re-bills, which is the right trade
  // against a silently lost draft. The happy path leaves the claim in place (dedup intact).
  try {
    // Part B: clustering happens per matched ACTIVE experiment (a `stories` row is
    // experiment_id-scoped — one story belongs to one desk), BEFORE the platform fan-out
    // below, inside this same try block so a cluster.ts throw hits the release-on-failure
    // catch below exactly like any other paid step here — no special-cased handling needed.
    const cluster = await assignToStory({
      experimentId: experiment.id,
      sourcePostId,
      authorHandle: brief.authorHandle,
      text: brief.text,
    });
    if (cluster.calls.length > 0) {
      // Ledger-first, same ordering discipline as every other CouncilCall producer here —
      // this insert happens BEFORE the platform fan-out's own ledger-first inserts.
      await insertModelCalls(admin, experiment.owner_id, cluster.calls, sourcePostId);
      // QC fix: every model_calls row also stamps usage_events (L7 house rule, "from birth") —
      // the clustering call was inserted into model_calls but never metered here, undercounting
      // per-owner LLM spend against any usage_events-based cap/alarm by one call per delivery.
      for (const call of cluster.calls) {
        await stampUsageEvent(admin, {
          owner_id: experiment.owner_id,
          kind: "clustering",
          units: 1,
          cost_usd: call.costUsd,
          ref_id: sourcePostId,
        });
      }
    }

    // Part C: one self-contained unit per platform (council -> ledger-first insert ->
    // post_drafts insert), run in parallel — a DB failure persisting platform B's calls can
    // never affect platform A's already-committed work because each platform's persistence
    // lives inside its own thunk, not batched together at the end.
    const runPlatformDraft = async (
      platform: Platform,
    ): Promise<{ platform: Platform; result: CouncilResult; winningPostDraftId: string }> => {
      const result = await runDraftCouncil({
        voiceGuidance,
        accountTier: "standard",
        brief,
        platform,
      });

      // Ledger-first: model_calls rows before the post_drafts rows that point at them.
      const callIds = await insertModelCalls(
        admin,
        experiment.owner_id,
        result.calls,
        sourcePostId,
      );

      let winningPostDraftId: string | null = null;
      for (const member of result.members) {
        const { data, error } = await admin
          .from("post_drafts")
          .insert({
            source_post_id: sourcePostId,
            experiment_id: experiment.id,
            story_id: cluster.storyId,
            platform,
            model_call_id: callIds[member.finalCallIndex],
            is_winner: member.isWinner,
            judge_verdict: null,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (member.isWinner) winningPostDraftId = data.id;
      }
      if (result.judge) {
        const { error } = await admin.from("post_drafts").insert({
          source_post_id: sourcePostId,
          experiment_id: experiment.id,
          story_id: cluster.storyId,
          platform,
          model_call_id: callIds[result.judge.callIndex],
          is_winner: false,
          judge_verdict: result.judge.verdict,
        });
        if (error) throw error;
      }
      if (!winningPostDraftId) {
        throw new Error(
          `draft-pipeline: no winning member produced a post_drafts row for platform ${platform}`,
        );
      }

      for (const call of result.calls) {
        await stampUsageEvent(admin, {
          owner_id: experiment.owner_id,
          kind: "drafting",
          units: 1,
          cost_usd: call.costUsd,
          ref_id: sourcePostId,
        });
      }

      return { platform, result, winningPostDraftId };
    };

    const platformResults = await Promise.allSettled(PLATFORMS.map(runPlatformDraft));

    platformResults.forEach((outcome, i) => {
      if (outcome.status === "rejected") {
        console.error(
          `draft-pipeline: platform ${PLATFORMS[i]} failed for experiment ${experiment.id}`,
          outcome.reason,
        );
      }
    });

    const fulfilled = platformResults
      .filter(
        (
          outcome,
        ): outcome is PromiseFulfilledResult<Awaited<ReturnType<typeof runPlatformDraft>>> =>
          outcome.status === "fulfilled",
      )
      .map((outcome) => outcome.value);

    // Zero fulfilled platforms is equivalent to today's total-failure case: propagate so the
    // outer catch releases draft_claims and allows a retry. runDraftCouncil's members===0 throw
    // still fires before any CouncilCall is billed (a rejected family means its initial
    // generate() call itself never completed), so this path never discards a paid call.
    if (fulfilled.length === 0) {
      throw new Error(`draft-pipeline: all platforms failed for experiment ${experiment.id}`);
    }

    // At least one platform succeeded — a partial multi-platform draft is a real, useful
    // outcome. Do NOT throw and do NOT release the claim past this point: releasing it here
    // would let a retry re-bill the platforms that already succeeded.
    const xResult = fulfilled.find((f) => f.platform === "x");
    // deliverDraft fires ONCE per delivery per experiment (not once per platform) — using the
    // X platform's winning text when X succeeded, else the first-succeeded platform's winning
    // text as a reasonable fallback (documented in task-20-report.md). modelCount/totalCostUsd
    // are summed across every fulfilled platform's calls so the notification reflects the
    // delivery's actual total spend, not just the chosen platform's.
    const primary = xResult ?? fulfilled[0];
    const allFulfilledCalls = fulfilled.flatMap((f) => f.result.calls);

    await deliverDraft(admin, {
      experimentId: experiment.id,
      ownerId: experiment.owner_id,
      authorHandle: brief.authorHandle,
      sourceText: brief.text,
      winningText: primary.result.winningText,
      modelCount: fulfilled.reduce((sum, f) => sum + f.result.members.length, 0),
      totalCostUsd: sumCosts(allFulfilledCalls.map((c) => c.costUsd)),
      winningPostDraftId: primary.winningPostDraftId,
      winningPlatform: primary.platform,
      sourcePostId,
      revised: false,
    });

    // Part D: auto-post, after the X platform's post_drafts row exists. auto_post_sources is
    // keyed by delivery source TYPE ({ x?: boolean; website?: boolean }) — a per-source-type
    // toggle, the natural reading of "master + per-source toggles" given the only two source
    // types this slice has (documented in task-20-report.md). No model_calls row for the post
    // itself — posting isn't a model call. A posting failure is logged and left as a
    // recoverable draft state: never a rollback of drafts or ledgers, never a claim release.
    const sourcesConfig = (experiment.auto_post_sources ?? {}) as Record<string, boolean>;
    const autoPostEligible =
      experiment.auto_post_master === true && sourcesConfig[deliverySource] === true;
    if (autoPostEligible && xResult) {
      const postResult = await postDraftToXForOwner(
        xResult.winningPostDraftId,
        experiment.owner_id,
      );
      if (!postResult.ok) {
        console.error(
          `draft-pipeline: auto-post failed for draft ${xResult.winningPostDraftId}`,
          postResult.error,
        );
      }
    }

    return {
      experimentId: experiment.id,
      winningModel: primary.result.winningModel,
      degraded: fulfilled.some((f) => f.result.degraded) || fulfilled.length < PLATFORMS.length,
    };
  } catch (err) {
    // Release the claim so a retry of this delivery can re-attempt (see the comment above).
    await admin
      .from("draft_claims")
      .delete()
      .eq("source_post_id", sourcePostId)
      .eq("experiment_id", experiment.id);
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
            raw: (delivery.raw ?? null) as unknown as Json,
          }
        : {
            source: "website",
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

  // Route by source. An "x" delivery matches tracked_handles exactly as before (PostgREST's
  // array `contains` filter matches elements exactly, so a stored handle whose casing differs
  // from the delivery's would silently never match — fetch every experiment and compare
  // lowercased in application code instead, see task-7-report.md). A "website" delivery has no
  // author_handle concept — it's tracked via experiments.websites (a desk's own list of
  // tracked site URLs, saved in Wave 3), matched by hostname (matchesTrackedWebsite above), NOT
  // forced through the same tracked_handles matching function since the match key genuinely
  // differs between the two source types.
  const { data: allExperiments, error: experimentsError } = await admin
    .from("experiments")
    .select(
      "id, owner_id, reporter_handle, tracked_handles, websites, status, auto_post_master, auto_post_sources",
    );
  if (experimentsError) throw experimentsError;
  const matched: MatchedExperiment[] =
    delivery.source === "x"
      ? (() => {
          const wantedHandle = delivery.author_handle.toLowerCase();
          return (allExperiments ?? []).filter((e) =>
            e.tracked_handles.some((h) => h.toLowerCase() === wantedHandle),
          );
        })()
      : (allExperiments ?? []).filter((e) => matchesTrackedWebsite(e.websites, delivery.url));

  // D16a: usage_events.owner_id is NOT NULL, so an unmatched delivery (no experiment tracks
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
        `draft-pipeline: unmatched website delivery, no experiment tracks ${delivery.url} — not stamped to unmatched_deliveries`,
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
          authorHandle: delivery.author_handle,
          text: delivery.text,
        }
      : {
          sourcePostId,
          // xPostId is unused by draft-council-run.ts's actual logic (never read past being
          // carried on SourceBrief) — "" for a website delivery rather than widening the type
          // for a field nothing consumes (documented in task-20-report.md).
          xPostId: "",
          authorHandle: delivery.author_handle ?? hostnameOf(delivery.url),
          text: delivery.text,
        };

  const drafted: ProcessDeliveryResult["drafted"] = [];
  for (const experiment of matched) {
    // Draft only for ACTIVE desks. A paused desk still appears in `matched` (it tracks this
    // author, so it still counts for the unmatched check and the delivery metering above — the
    // stream volume was real), but pausing means "stop watching the beat": no new drafts. Without
    // this gate the pause control just flips a `status` column that nothing downstream reads. The
    // worker also drops paused desks' handles from the stream on its next ~5-min rule rebuild;
    // this is the immediate guard for that lag window and for hand-seeded deliveries.
    if (experiment.status !== "active") continue;
    drafted.push(await draftForExperiment(admin, experiment, sourcePostId, brief, delivery.source));
  }

  return { sourcePostId, drafted };
}

/** Applies an emailed correction to a draft: one revision call → new post_drafts row →
 *  re-deliver. Returns null when the draft id is unknown (caller answers 200 regardless). */
export async function applyCorrection(input: {
  postDraftId: string;
  feedback: string;
  idempotencyKey: string; // the Svix message id
}): Promise<{ newPostDraftId: string } | null> {
  const admin = createAdminClient();

  const { data: draftRow, error: draftError } = await admin
    .from("post_drafts")
    .select(
      `
      id, source_post_id, experiment_id, platform, story_id,
      source_posts ( id, x_post_id, author_handle, text ),
      experiments ( id, owner_id, reporter_handle ),
      model_calls ( output )
    `,
    )
    .eq("id", input.postDraftId)
    .maybeSingle();
  if (draftError) throw draftError;
  if (!draftRow?.source_posts || !draftRow.experiments || !draftRow.model_calls) return null;
  const sourcePost = draftRow.source_posts;
  const experiment = draftRow.experiments;
  const previousDraft = draftRow.model_calls.output;
  if (previousDraft == null) return null;
  // QC fix: carried forward into the dethrone scope + the revision insert below — without
  // these, a correction lost its story (feed-query only lists winners whose story_id belongs
  // to the querying desk's stories, so a NULL story_id winner never renders) and dethroned
  // every OTHER platform's winner for this story too (the old dethrone filtered only by
  // source_post_id + experiment_id, not platform).
  const { platform, story_id: storyId } = draftRow;

  // Idempotency CHECK stays first: a duplicate Svix delivery is a no-op. The WRITE of this
  // stamp is deliberately deferred past the paid revision call below (see the comment there) —
  // stamping here, before the call, would make any later failure in this function permanently
  // discard the reporter's correction, since every retry would then see the stamp and no-op.
  // This select is a fast-path only; the actual guarantee is the D16 partial unique index on
  // usage_events(ref_id) WHERE kind = 'email_reply_received', enforced at the stamp's WRITE
  // below — two concurrent deliveries of the same Svix message can both pass this select.
  const { data: dup, error: dupError } = await admin
    .from("usage_events")
    .select("id")
    .eq("kind", "email_reply_received")
    .eq("ref_id", input.idempotencyKey)
    .maybeSingle();
  if (dupError) throw dupError;
  if (dup) return null;

  const { data: guide, error: guideError } = await admin
    .from("voice_guides")
    .select("guide_deploy, measured_facts")
    .eq("experiment_id", experiment.id)
    .maybeSingle();
  if (guideError) throw guideError;
  if (!guide) {
    throw new Error(`draft-pipeline: no voice_guides row for experiment ${experiment.id}`);
  }
  const voiceGuidance = resolveDraftingPrompt(
    await listVoiceRules(experiment.id),
    guide.measured_facts,
    guide.guide_deploy,
  );

  // source_posts.x_post_id / author_handle are nullable as of this Wave's website-source
  // support (Part A above) — applyCorrection's own behavior is unchanged (out of scope for
  // this task per the brief), this is only the minimal null-safety fix required to keep this
  // file compiling against the widened schema; every draft reachable through this path today
  // is still "x"-sourced (Wave 3 wires up website drafts' UI), so these fall back to "" in
  // practice but never actually hit it (documented in task-20-report.md).
  const brief: SourceBrief = {
    sourcePostId: sourcePost.id,
    xPostId: sourcePost.x_post_id ?? "",
    authorHandle: sourcePost.author_handle ?? "",
    text: sourcePost.text,
  };

  const revision = await reviseDraft({
    voiceGuidance,
    accountTier: "standard",
    brief,
    previousDraft,
    feedback: input.feedback,
  });

  // Ledger-first, again.
  const callIds = await insertModelCalls(admin, experiment.owner_id, revision.calls, sourcePost.id);

  // The idempotency stamp's WRITE lands here — after the revision call succeeded and its
  // model_calls rows are durably written — not before the call as it originally was. The
  // original ordering's stated reason ("prevent double-pay on a duplicate webhook delivery")
  // buys almost nothing here: the inbound route acks 200 immediately and runs this function
  // inside `after()`, so Resend never observes a failure and never redelivers a failed
  // correction anyway. Stamping first therefore only bought a narrow anti-double-pay window
  // at the cost of silently discarding the reporter's correction outright on any failure
  // after the stamp. Tradeoff accepted: a crash in the narrow window between this line and the
  // paid call above can re-pay one ~cent revision on a redelivery, which is strictly preferable
  // to losing a reporter's correction.
  //
  // D16's partial unique index on usage_events(ref_id) WHERE kind = 'email_reply_received' makes
  // THIS insert the real idempotency guard: a 23505 unique-violation means another concurrent
  // delivery of the same Svix message won the race and already stamped — that's the existing
  // no-op return, never a 500 (any other error still propagates as before).
  const { error: stampError } = await admin.from("usage_events").insert({
    owner_id: experiment.owner_id,
    kind: "email_reply_received",
    units: 1,
    cost_usd: null,
    ref_id: input.idempotencyKey,
  });
  if (stampError) {
    if (stampError.code === "23505") return null;
    throw stampError;
  }

  for (const call of revision.calls) {
    await stampUsageEvent(admin, {
      owner_id: experiment.owner_id,
      kind: "drafting",
      units: 1,
      cost_usd: call.costUsd,
      ref_id: sourcePost.id,
    });
  }

  // Dethrone the story's CURRENT winner FOR THIS PLATFORM before crowning the revision — NOT
  // just the replied-to draft. A reporter can reply to a superseded draft (an older email still
  // in the thread); flipping only input.postDraftId would leave the actual current winner set
  // AND crown the revision, so one story ends up with two is_winner=true rows for this platform,
  // which feed-query renders as duplicate cards. Unsetting whichever row currently wins this
  // (source_post, experiment, platform) keeps the one-winner-per-platform-per-story invariant
  // regardless of which draft the reply targeted. Scoped by `platform` (QC fix) — without it
  // this dethroned every OTHER platform's winner too, since a story can carry one winner PER
  // platform (X, LinkedIn, Bluesky) as of the multi-platform fan-out. This runs BEFORE the
  // insert so the new winner below isn't itself caught by this update. Pointer flip only — a
  // post_drafts row's content stays an immutable record of what a model produced.
  const { error: dethroneError } = await admin
    .from("post_drafts")
    .update({ is_winner: false })
    .eq("source_post_id", sourcePost.id)
    .eq("experiment_id", experiment.id)
    .eq("platform", platform)
    .eq("is_winner", true);
  if (dethroneError) throw dethroneError;

  const { data: newDraft, error: newDraftError } = await admin
    .from("post_drafts")
    .insert({
      source_post_id: sourcePost.id,
      experiment_id: experiment.id,
      model_call_id: callIds[revision.finalCallIndex],
      is_winner: true,
      judge_verdict: null,
      parent_draft_id: input.postDraftId,
      feedback: input.feedback,
      // QC fix: carry the original draft's platform + story_id forward — omitting these
      // defaulted platform to "x" and story_id to NULL, and a NULL-story winner is invisible
      // to fetchFeedPage (it only lists winners whose story_id is among the querying desk's
      // own stories), so the correction silently vanished from the feed.
      platform,
      story_id: storyId,
    })
    .select("id")
    .single();
  if (newDraftError) throw newDraftError;

  await deliverDraft(admin, {
    experimentId: experiment.id,
    ownerId: experiment.owner_id,
    authorHandle: sourcePost.author_handle ?? "",
    sourceText: sourcePost.text,
    winningText: revision.text,
    modelCount: 1,
    totalCostUsd: sumCosts(revision.calls.map((c) => c.costUsd)),
    winningPostDraftId: newDraft.id,
    winningPlatform: platform as Platform,
    sourcePostId: sourcePost.id,
    revised: true,
  });

  return { newPostDraftId: newDraft.id };
}
