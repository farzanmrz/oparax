"use server"

// Imports
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  MONITOR_MAX_HANDLES,
  isValidHandle,
  normalizeHandle,
} from "@/lib/scan/handles"
import type { PreviewStory } from "@/lib/scan/stream"

// Metrics from a preview scan to persist on the scans row
export interface PreviewMetrics {
  costUsd: number | null
  xSearchCalls: number | null
}

// Monitor creation payload; server validates all fields
export interface CreateMonitorInput {
  name: string
  monitoringDescription: string
  handles: string[]
  draftingInstructions: string
  exampleTweets: string[]
  scanFrom: string | null
  scanTo: string | null
  previewStories?: PreviewStory[]
  previewMetrics?: PreviewMetrics | null
}

/**
 * Create a new monitor for the signed-in user after validation, then redirect
 * to the monitors list. Returns an error object only on failure — success
 * redirects server-side, which is race-free unlike a client-side router.push.
 * @param input - the monitor creation payload from the form
 * @returns an error with a user-facing message on failure; redirects on success
 */
export async function createMonitor(
  input: CreateMonitorInput,
): Promise<{ error: string } | void> {

  // Create a scoped Supabase client + get the signed-in user.
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Validate monitor name, handles, and optional scan window.
  const name = input.name.trim()
  if (!name) {
    return { error: "Name is required." }
  }

  // Normalize, dedupe, and validate handles against the 20-handle cap.
  const handles = [...new Set(input.handles.map(normalizeHandle).filter(Boolean))]

  if (handles.length > MONITOR_MAX_HANDLES) {
    return { error: `Maximum ${MONITOR_MAX_HANDLES} handles allowed.` }
  }

  const invalid = handles.find((handle) => !isValidHandle(handle))

  if (invalid) {
    return { error: `"${invalid}" is not a valid X handle.` }
  }

  // Parse optional scan dates; empty strings become null.
  const scanFrom = input.scanFrom?.trim() || null
  const scanTo = input.scanTo?.trim() || null

  if (scanFrom && scanTo && scanFrom > scanTo) {
    return { error: "Scan start date must be on or before the end date." }
  }

  // Trim and filter empty example tweets.
  const exampleTweets = input.exampleTweets
    .map((tweet) => tweet.trim())
    .filter(Boolean)

  // Insert the monitor; RLS enforces ownership.
  const { data: monitor, error } = await supabase
    .from("monitors")
    .insert({
      user_id: user.id,
      name,
      monitoring_description: input.monitoringDescription.trim(),
      monitored_handles: handles,
      drafting_instructions: input.draftingInstructions.trim(),
      example_tweets: exampleTweets,
      scan_from: scanFrom,
      scan_to: scanTo,
      status: "active",
    })
    .select("id")
    .single()

  if (error || !monitor) {
    return { error: "Failed to create monitor. Please try again." }
  }

  // Best-effort: persist the preview scan + stories (failure doesn't undo the monitor).
  const previewStories = input.previewStories ?? []
  if (previewStories.length > 0) {
    const { data: scan } = await supabase
      .from("scans")
      .insert({
        monitor_id: monitor.id,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        cost_usd: input.previewMetrics?.costUsd ?? null,
        x_search_count: input.previewMetrics?.xSearchCalls ?? null,
        story_count: previewStories.length,
      })
      .select("id")
      .single<{ id: string }>()

    if (scan) {

      // Dedupe by dedupe_key to satisfy the unique constraint.
      const seen = new Set<string>()
      const rows = previewStories
        .filter((story) => {
          if (seen.has(story.dedupeKey)) return false
          seen.add(story.dedupeKey)
          return true
        })
        .map((story) => ({
          scan_id: scan.id,
          monitor_id: monitor.id,
          title: story.title,
          summary: story.summary,
          source_urls: story.sourceUrls,
          primary_tweet_url: story.primaryTweetUrl,
          dedupe_key: story.dedupeKey,
        }))
      await supabase.from("stories").insert(rows)
    }
  }

  // Redirect to the new monitor's detail page.
  redirect(`/dashboard/test/${monitor.id}`)
}
