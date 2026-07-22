// lib/agent/draft-pipeline.ts
//
// SERVER-ONLY — transitively imports lib/sysprompts via draft-council-run.ts (which loads
// its prompts at module scope); never importable from a client component.
//
// Owns ALL persistence and metering for the drafting path. The council
// (draft-council-run.ts) and the notify senders (lib/notify/*) are pure and deliberately
// touch neither the DB nor the ledger — this module is where both cross-cutting invariants
// are actually satisfied (decisions.md L7, L12):
//   - L12: every element of a council's `calls` array becomes exactly one `model_calls` row,
//     carrying `output`, `reasoning`, and `usage` (including `reasoningWithheldByProvider`).
//   - L7: every touch point stamps `usage_events` — the inbound delivery, each model call,
//     each Slack push, each email send, each verified inbound reply.
// Ledger-first ordering throughout, copied from scripts/extract-voice-guide.ts: `model_calls`
// rows are written BEFORE the artifact rows (`post_drafts`) that point at them, so a failed
// artifact write never loses the record of a call already paid for.
import {
  type CouncilCall,
  reviseDraft,
  runDraftCouncil,
  type SourceBrief,
} from "@/lib/agent/draft-council-run";
import { composeDraftMessage, composeDraftMessagePlainText } from "@/lib/notify/compose";
import { sendDraftEmail } from "@/lib/notify/email";
import { sendSlackMessage } from "@/lib/notify/slack";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { sumCosts } from "./usage-cost";

type AdminClient = ReturnType<typeof createAdminClient>;

export type IngestDelivery = {
  x_post_id: string;
  author_handle: string;
  text: string;
  posted_at: string; // ISO
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

type MatchedExperiment = { id: string; owner_id: string; reporter_handle: string };

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
 *  sent stamps its usage_events row. */
async function deliverDraft(
  admin: AdminClient,
  input: {
    ownerId: string;
    authorHandle: string;
    sourceText: string;
    winningText: string;
    modelCount: number;
    totalCostUsd: number | null;
    winningPostDraftId: string;
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
    await sendSlackMessage(message);
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
  if (RESEND_API_KEY && RESEND_FROM && RESEND_REPLY_DOMAIN && NOTIFY_EMAIL_TO) {
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
): Promise<ProcessDeliveryResult["drafted"][number]> {
  // Idempotency: a redelivered post must not re-pay the council.
  const { data: existing, error: existingError } = await admin
    .from("post_drafts")
    .select("id")
    .eq("source_post_id", sourcePostId)
    .eq("experiment_id", experiment.id)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    return {
      experimentId: experiment.id,
      winningModel: "",
      degraded: false,
      skipped: "already_drafted",
    };
  }

  // Extraction stays script-only this slice (decisions.md L11) — absent guide, skip.
  const { data: guide, error: guideError } = await admin
    .from("voice_guides")
    .select("guide_deploy")
    .eq("reporter_handle", experiment.reporter_handle)
    .maybeSingle();
  if (guideError) throw guideError;
  if (!guide) {
    return { experimentId: experiment.id, winningModel: "", degraded: false, skipped: "no_guide" };
  }

  const result = await runDraftCouncil({
    guideDeploy: guide.guide_deploy,
    accountTier: "standard",
    brief,
  });

  // Ledger-first: model_calls rows before the post_drafts rows that point at them.
  const callIds = await insertModelCalls(admin, experiment.owner_id, result.calls, sourcePostId);

  let winningPostDraftId: string | null = null;
  for (const member of result.members) {
    const { data, error } = await admin
      .from("post_drafts")
      .insert({
        source_post_id: sourcePostId,
        experiment_id: experiment.id,
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
      model_call_id: callIds[result.judge.callIndex],
      is_winner: false,
      judge_verdict: result.judge.verdict,
    });
    if (error) throw error;
  }
  if (!winningPostDraftId) {
    throw new Error("draft-pipeline: no winning member produced a post_drafts row");
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

  await deliverDraft(admin, {
    ownerId: experiment.owner_id,
    authorHandle: brief.authorHandle,
    sourceText: brief.text,
    winningText: result.winningText,
    modelCount: result.members.length,
    totalCostUsd: sumCosts(result.calls.map((c) => c.costUsd)),
    winningPostDraftId,
    sourcePostId,
    revised: false,
  });

  return {
    experimentId: experiment.id,
    winningModel: result.winningModel,
    degraded: result.degraded,
  };
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
  const { data: upserted, error: upsertError } = await admin
    .from("source_posts")
    .upsert(
      {
        x_post_id: delivery.x_post_id,
        author_handle: delivery.author_handle,
        text: delivery.text,
        posted_at: delivery.posted_at,
        raw: (delivery.raw ?? null) as unknown as Json,
      },
      { onConflict: "x_post_id", ignoreDuplicates: true },
    )
    .select("id");
  if (upsertError) throw upsertError;

  let sourcePostId: string;
  if (upserted && upserted.length > 0) {
    sourcePostId = upserted[0].id;
  } else {
    const { data: existing, error: existingError } = await admin
      .from("source_posts")
      .select("id")
      .eq("x_post_id", delivery.x_post_id)
      .single();
    if (existingError) throw existingError;
    sourcePostId = existing.id;
  }

  // Route by author. PostgREST's array `contains` filter matches elements exactly, so a
  // stored handle whose casing differs from the delivery's would silently never match —
  // fetch every experiment and compare lowercased in application code instead (see
  // task-7-report.md for why this shape was chosen over the contains filter).
  const { data: allExperiments, error: experimentsError } = await admin
    .from("experiments")
    .select("id, owner_id, reporter_handle, tracked_handles");
  if (experimentsError) throw experimentsError;
  const wantedHandle = delivery.author_handle.toLowerCase();
  const matched: MatchedExperiment[] = (allExperiments ?? []).filter((e) =>
    e.tracked_handles.some((h) => h.toLowerCase() === wantedHandle),
  );

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

  const brief: SourceBrief = {
    sourcePostId,
    xPostId: delivery.x_post_id,
    authorHandle: delivery.author_handle,
    text: delivery.text,
  };

  const drafted: ProcessDeliveryResult["drafted"] = [];
  for (const experiment of matched) {
    drafted.push(await draftForExperiment(admin, experiment, sourcePostId, brief));
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
      id, source_post_id, experiment_id,
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

  // Idempotency CHECK stays first: a duplicate Svix delivery is a no-op. The WRITE of this
  // stamp is deliberately deferred past the paid revision call below (see the comment there) —
  // stamping here, before the call, would make any later failure in this function permanently
  // discard the reporter's correction, since every retry would then see the stamp and no-op.
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
    .select("guide_deploy")
    .eq("reporter_handle", experiment.reporter_handle)
    .maybeSingle();
  if (guideError) throw guideError;
  if (!guide) {
    throw new Error(`draft-pipeline: no voice_guides row for @${experiment.reporter_handle}`);
  }

  const brief: SourceBrief = {
    sourcePostId: sourcePost.id,
    xPostId: sourcePost.x_post_id,
    authorHandle: sourcePost.author_handle,
    text: sourcePost.text,
  };

  const revision = await reviseDraft({
    guideDeploy: guide.guide_deploy,
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
  await stampUsageEvent(admin, {
    owner_id: experiment.owner_id,
    kind: "email_reply_received",
    units: 1,
    cost_usd: null,
    ref_id: input.idempotencyKey,
  });

  for (const call of revision.calls) {
    await stampUsageEvent(admin, {
      owner_id: experiment.owner_id,
      kind: "drafting",
      units: 1,
      cost_usd: call.costUsd,
      ref_id: sourcePost.id,
    });
  }

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
    })
    .select("id")
    .single();
  if (newDraftError) throw newDraftError;

  // Pointer flip only — never touch a post_drafts row's content (source_post_id,
  // experiment_id, model_call_id, judge_verdict): it's an immutable record of what a model
  // produced.
  const { error: flipError } = await admin
    .from("post_drafts")
    .update({ is_winner: false })
    .eq("id", input.postDraftId);
  if (flipError) throw flipError;

  await deliverDraft(admin, {
    ownerId: experiment.owner_id,
    authorHandle: sourcePost.author_handle,
    sourceText: sourcePost.text,
    winningText: revision.text,
    modelCount: 1,
    totalCostUsd: sumCosts(revision.calls.map((c) => c.costUsd)),
    winningPostDraftId: newDraft.id,
    sourcePostId: sourcePost.id,
    revised: true,
  });

  return { newPostDraftId: newDraft.id };
}
