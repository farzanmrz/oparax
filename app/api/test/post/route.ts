// Imports
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDraftIssue } from "@/lib/draft/validate"
import { getFreshAccessToken } from "@/lib/x/tokens"
import { postTweet } from "@/lib/x/client"

// Node runtime: token refresh + AES use node:crypto.
export const runtime = "nodejs"
export const maxDuration = 60

// A hidden per-user monitor that owns all prompt-lab posts (keeps RLS intact).
const LAB_MONITOR_NAME = "__prompt_lab__"

/**
 * Find or create the hidden lab monitor that owns lab scans/stories/drafts.
 * @param supabase - the request-scoped Supabase client
 * @param userId - the owner
 * @returns the lab monitor id, or null on failure
 */
async function getLabMonitorId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("monitors")
    .select("id")
    .eq("user_id", userId)
    .eq("name", LAB_MONITOR_NAME)
    .maybeSingle<{ id: string }>()
  if (existing) {
    return existing.id
  }

  const { data: created } = await supabase
    .from("monitors")
    .insert({ user_id: userId, name: LAB_MONITOR_NAME, status: "paused" })
    .select("id")
    .single<{ id: string }>()
  return created?.id ?? null
}

/**
 * Prompt-lab post: validate the draft, persist the minimal chain (lab monitor →
 * scan → story → draft), post a real tweet, and record the post. This is the
 * only write path in the lab.
 * @param req - the request carrying the story content + final draft text
 * @returns the tweet id + url on success, or a JSON error
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  // Parse the request body.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  const record = (body ?? {}) as Record<string, unknown>
  const text = typeof record.text === "string" ? record.text : ""
  const storyTitle =
    typeof record.storyTitle === "string" ? record.storyTitle.trim() : ""
  const storySummary =
    typeof record.storySummary === "string" ? record.storySummary.trim() : ""
  const sourceUrls = Array.isArray(record.sourceUrls)
    ? record.sourceUrls.filter((u): u is string => typeof u === "string")
    : []

  // Refuse to post text that fails validation (cost + correctness).
  const issue = getDraftIssue(text)
  if (issue) {
    return NextResponse.json({ error: issue }, { status: 400 })
  }

  // Persist the minimal ownership chain so the post has valid FKs + RLS.
  const monitorId = await getLabMonitorId(supabase, user.id)
  if (!monitorId) {
    return NextResponse.json({ error: "Failed to prepare post." }, { status: 500 })
  }

  const { data: scan } = await supabase
    .from("scans")
    .insert({
      monitor_id: monitorId,
      status: "completed",
      completed_at: new Date().toISOString(),
      story_count: 1,
    })
    .select("id")
    .single<{ id: string }>()
  if (!scan) {
    return NextResponse.json({ error: "Failed to prepare post." }, { status: 500 })
  }

  const { data: story } = await supabase
    .from("stories")
    .insert({
      scan_id: scan.id,
      monitor_id: monitorId,
      title: storyTitle || "(untitled)",
      summary: storySummary,
      source_urls: sourceUrls,
      primary_tweet_url: sourceUrls[0] ?? "",
      dedupe_key: `lab-${scan.id}`,
    })
    .select("id")
    .single<{ id: string }>()
  if (!story) {
    return NextResponse.json({ error: "Failed to prepare post." }, { status: 500 })
  }

  const { data: draft } = await supabase
    .from("drafts")
    .insert({ story_id: story.id, text, status: "draft" })
    .select("id")
    .single<{ id: string }>()
  if (!draft) {
    return NextResponse.json({ error: "Failed to prepare post." }, { status: 500 })
  }

  // Fresh access token (refreshes + rotates if expired).
  let accessToken: string
  try {
    accessToken = await getFreshAccessToken(supabase, user.id)
  } catch {
    await supabase.from("drafts").update({ status: "failed" }).eq("id", draft.id)
    return NextResponse.json(
      { error: "Connect your X account in Settings first." },
      { status: 400 },
    )
  }

  // Post the real tweet.
  const result = await postTweet(accessToken, text)
  if (!result.ok) {
    await supabase.from("drafts").update({ status: "failed" }).eq("id", draft.id)
    await supabase.from("posts").insert({
      draft_id: draft.id,
      x_tweet_id: "",
      x_tweet_url: "",
      status: "failed",
      error_message: result.error,
    })
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  // Record the successful post and mark the draft posted.
  await supabase.from("drafts").update({ status: "posted" }).eq("id", draft.id)
  await supabase.from("posts").insert({
    draft_id: draft.id,
    x_tweet_id: result.id,
    x_tweet_url: result.url,
    status: "posted",
  })

  return NextResponse.json({ id: result.id, url: result.url })
}
