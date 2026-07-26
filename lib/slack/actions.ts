// lib/slack/actions.ts
//
// Server actions for disconnecting a desk's Slack link and sending a test message. The
// link/connect flow's entry point is the OAuth route (Wave 3) — this file only owns
// disconnect + test-send. Both actions prove desk ownership the same way
// `lib/slack/link-state.ts` does: a cookie-client (RLS) SELECT against `experiments`, which
// is owner-scoped — no row back means either "not signed in" or "not this reporter's desk",
// and both are treated identically as "please sign in again" rather than leaking which.
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { postMessage } from "@/lib/slack/api";
import { ownsDesk } from "@/lib/slack/link-state";
import { deleteSlackAccount, getSlackAccount } from "@/lib/slack/store";

const experimentIdSchema = z.string().uuid();

export async function unlinkSlack(
  experimentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsedId = experimentIdSchema.safeParse(experimentId);
  if (!parsedId.success) return { ok: false, error: "Select a desk to unlink." };
  if (!(await ownsDesk(parsedId.data))) return { ok: false, error: "Please sign in again." };

  try {
    await deleteSlackAccount(parsedId.data);
  } catch {
    return { ok: false, error: "Could not unlink Slack. Please try again." };
  }

  revalidatePath(`/agents/${parsedId.data}`);
  return { ok: true };
}

export async function sendTestSlack(
  experimentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsedId = experimentIdSchema.safeParse(experimentId);
  if (!parsedId.success) return { ok: false, error: "Select a desk to test." };
  if (!(await ownsDesk(parsedId.data))) return { ok: false, error: "Please sign in again." };

  const account = await getSlackAccount(parsedId.data);
  if (!account) return { ok: false, error: "Connect Slack first." };

  try {
    await postMessage({
      channelId: account.channel_id,
      accessToken: account.access_token,
      text: "Oparax is connected — drafts for this desk will land here.",
    });
  } catch {
    return {
      ok: false,
      error: "Could not send a test message. Check your Slack connection and try again.",
    };
  }

  return { ok: true };
}
