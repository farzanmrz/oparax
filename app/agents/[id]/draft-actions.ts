"use server";

import { after } from "next/server";
import { z } from "zod";
import { resolveDeskTier } from "@/lib/agent/desk-config";
import { insertModelCalls, stampUsageEvent } from "@/lib/agent/draft-pipeline";
import { draftSourcePost } from "@/lib/agent/draft-write";
import { reconcileMissingCosts } from "@/lib/agent/gateway-cost";
import {
  GEMINI_WRITE_CLAIM_STALE_MS,
  GEMINI_WRITE_TIMEOUT_MS,
} from "@/lib/agent/gemini-write-config";
import { normalizeWebsitePublisherMention, sourceIdentityOf } from "@/lib/agent/source-identity";
import { reportServerException, reportServerLog } from "@/lib/observability/posthog-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { listVoiceRules, resolveDraftingPrompt } from "@/lib/voice/rules";
import { getXLinkState } from "@/lib/x/link-state";

export type DraftStoryResult =
  | { ok: true; draftId: string; text: string }
  | { ok: false; error: string };

const draftIdSchema = z.string().uuid();
const persistedNewsPointsSchema = z
  .array(
    z.object({
      reason: z.string().trim().min(1),
      point: z.string().trim().min(1),
    }),
  )
  .min(1);
const GENERIC = "Couldn't write a draft this time. Press Draft to try again.";

function reportQueryError(
  error: unknown,
  operation: string,
  context: {
    draftId: string;
    distinctId: string;
    agentId?: string;
    modelCallId?: string;
  },
) {
  reportServerException(error, {
    distinctId: context.distinctId,
    tags: { scope: "draft_button", operation },
    extra: {
      draftId: context.draftId,
      agentId: context.agentId,
      modelCallId: context.modelCallId,
    },
  });
}

export async function draftStory(draftId: string): Promise<DraftStoryResult> {
  const parsedId = draftIdSchema.safeParse(draftId);
  if (!parsedId.success) return { ok: false, error: "That story could not be found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const context = { draftId: parsedId.data, distinctId: user.id };
  const { data: story, error: storyError } = await supabase
    .from("drafts")
    .select(
      "id, agent_id, source_post_id, story_id, platform, news_title, news_points, model_call_id, is_winner, posted_at, posting_claimed_at",
    )
    .eq("id", parsedId.data)
    .maybeSingle();
  if (storyError) {
    reportQueryError(storyError, "drafts.select", context);
    return { ok: false, error: GENERIC };
  }
  if (!story || story.is_winner !== true || story.platform !== "x") {
    return { ok: false, error: "That story could not be found." };
  }
  if (story.model_call_id !== null) {
    return { ok: false, error: "This story already has a draft." };
  }

  const newsPoints = persistedNewsPointsSchema.safeParse(story.news_points);
  const newsTitle = story.news_title?.trim();
  if (!newsPoints.success || !newsTitle) {
    reportServerLog(
      "draft-actions: story has no usable news points",
      { draftId: story.id, agentId: story.agent_id, scope: "draft_button" },
      { distinctId: user.id },
    );
    return { ok: false, error: GENERIC };
  }

  const admin = createAdminClient();
  const staleBefore = new Date(Date.now() - GEMINI_WRITE_CLAIM_STALE_MS).toISOString();
  const { data: claimed, error: claimError } = await admin.rpc("claim_story_draft", {
    p_draft_id: story.id,
    p_stale_cutoff: staleBefore,
  });
  if (claimError) {
    reportQueryError(claimError, "drafts.acquire_claim", {
      ...context,
      agentId: story.agent_id,
    });
    return { ok: false, error: GENERIC };
  }
  if (claimed !== true) {
    return { ok: false, error: "This story is already being drafted." };
  }

  // Hoisted function declarations do not keep the null-narrowing on `story`; bind the ids first.
  const claimedStoryId = story.id;
  const claimedAgentId = story.agent_id;
  async function releaseClaim() {
    try {
      const { error } = await admin
        .from("drafts")
        .update({ draft_requested_at: null })
        .eq("id", claimedStoryId)
        .is("model_call_id", null);
      if (!error) return;
      reportQueryError(error, "drafts.release_claim", {
        ...context,
        agentId: claimedAgentId,
      });
    } catch (error) {
      reportQueryError(error, "drafts.release_claim", {
        ...context,
        agentId: claimedAgentId,
      });
    }
  }

  try {
    const [agentResult, sourceResult, guideResult, xLink] = await Promise.all([
      supabase
        .from("agents")
        .select("id, owner_id, reporter_tier")
        .eq("id", story.agent_id)
        .maybeSingle(),
      admin
        .from("source_posts")
        .select("id, source, author_handle, url")
        .eq("id", story.source_post_id)
        .maybeSingle(),
      supabase
        .from("voice_guides")
        .select("guide_deploy, measured_facts")
        .eq("agent_id", story.agent_id)
        .maybeSingle(),
      getXLinkState(),
    ]);

    if (agentResult.error) {
      reportQueryError(agentResult.error, "agents.select", {
        ...context,
        agentId: story.agent_id,
      });
      await releaseClaim();
      return { ok: false, error: GENERIC };
    }
    if (!agentResult.data || agentResult.data.owner_id !== user.id) {
      await releaseClaim();
      return { ok: false, error: "That story could not be found." };
    }
    if (sourceResult.error) {
      reportQueryError(sourceResult.error, "source_posts.select", {
        ...context,
        agentId: story.agent_id,
      });
      await releaseClaim();
      return { ok: false, error: GENERIC };
    }
    if (!sourceResult.data) {
      await releaseClaim();
      return { ok: false, error: "That story could not be found." };
    }
    if (guideResult.error) {
      reportQueryError(guideResult.error, "voice_guides.select", {
        ...context,
        agentId: story.agent_id,
      });
      await releaseClaim();
      return { ok: false, error: GENERIC };
    }
    if (!guideResult.data) {
      await releaseClaim();
      return { ok: false, error: "Finish your Guide before drafting." };
    }

    const identity = sourceIdentityOf(sourceResult.data);
    let rules: Awaited<ReturnType<typeof listVoiceRules>>;
    try {
      rules = await listVoiceRules(story.agent_id);
    } catch (error) {
      reportQueryError(error, "voice_rules.select", {
        ...context,
        agentId: story.agent_id,
      });
      await releaseClaim();
      return { ok: false, error: GENERIC };
    }
    const voiceGuidance = resolveDraftingPrompt(
      rules,
      guideResult.data.measured_facts,
      guideResult.data.guide_deploy,
    );
    const written = await draftSourcePost({
      identity,
      newsTitle,
      newsPoints: newsPoints.data,
      voiceGuidance,
      platform: "x",
      accountTier: resolveDeskTier(agentResult.data.reporter_tier, xLink.tier),
      ownerId: user.id,
      deadlineAt: Date.now() + GEMINI_WRITE_TIMEOUT_MS,
    });

    if (written.verdict) {
      written.call.output = normalizeWebsitePublisherMention(written.verdict.draft, identity);
    }
    let modelCallId: string;
    try {
      const ids = await insertModelCalls(admin, user.id, [written.call], story.source_post_id);
      if (!ids[0]) throw new Error("Model call insert returned no id");
      modelCallId = ids[0];
    } catch (error) {
      reportQueryError(error, "model_calls.insert", {
        ...context,
        agentId: story.agent_id,
      });
      await releaseClaim();
      return { ok: false, error: GENERIC };
    }
    try {
      await stampUsageEvent(admin, {
        owner_id: user.id,
        kind: "drafting",
        units: 1,
        cost_usd: written.call.costUsd,
        ref_id: story.source_post_id,
      });
    } catch (error) {
      reportQueryError(error, "usage_events.insert", {
        ...context,
        agentId: story.agent_id,
        modelCallId,
      });
      await releaseClaim();
      return { ok: false, error: GENERIC };
    }

    after(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25_000));
      try {
        await reconcileMissingCosts(admin);
      } catch (error) {
        reportServerException(error, {
          distinctId: user.id,
          tags: { scope: "draft_button", operation: "reconcile_missing_costs" },
          extra: { draftId: story.id, modelCallId },
        });
      }
    });

    if (!written.verdict) {
      reportServerLog(
        "draft-actions: unusable draft",
        {
          draftId: story.id,
          agentId: story.agent_id,
          sourcePostId: story.source_post_id,
          modelCallId,
          scope: "draft_button",
        },
        { distinctId: user.id },
      );
      await releaseClaim();
      return { ok: false, error: GENERIC };
    }

    const text = written.call.output ?? written.verdict.draft;
    const { data: attached, error: attachError } = await admin.rpc("attach_story_draft", {
      p_draft_id: story.id,
      p_model_call_id: modelCallId,
    });
    if (attachError) {
      reportQueryError(attachError, "drafts.attach", {
        ...context,
        agentId: story.agent_id,
        modelCallId,
      });
      await releaseClaim();
      return { ok: false, error: GENERIC };
    }
    if (attached !== true) {
      reportQueryError(new Error("Draft attach lost its compare-and-set"), "drafts.attach_lost", {
        ...context,
        agentId: story.agent_id,
        modelCallId,
      });
      await releaseClaim();
      return { ok: false, error: "This story already has a draft." };
    }
    return { ok: true, draftId: story.id, text };
  } catch (error) {
    reportQueryError(error, "draft_write", { ...context, agentId: story.agent_id });
    await releaseClaim();
    return { ok: false, error: GENERIC };
  }
}
