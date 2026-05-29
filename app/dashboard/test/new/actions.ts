"use server"

// Imports
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  MONITOR_MAX_HANDLES,
  isValidHandle,
  normalizeHandle,
} from "@/lib/scan/handles"

// Input payload for monitor creation (validation happens server-side).
export interface CreateMonitorInput {
  name: string
  monitoringDescription: string
  handles: string[]
  draftingInstructions: string
  exampleTweets: string[]
  scanFrom: string | null
  scanTo: string | null
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

  // Supabase client scoped to the current request.
  const supabase = await createClient()

  // Fetch the signed-in user; redirect to login if missing.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Validate the monitor name is non-empty.
  const name = input.name.trim()
  if (!name) {
    return { error: "Name is required." }
  }

  // Normalize, dedupe, and validate the monitored handles; check the 20 cap before insert.
  const handles = [...new Set(input.handles.map(normalizeHandle).filter(Boolean))]
  if (handles.length > MONITOR_MAX_HANDLES) {
    return { error: `Maximum ${MONITOR_MAX_HANDLES} handles allowed.` }
  }

  // Verify each handle is valid.
  const invalid = handles.find((handle) => !isValidHandle(handle))
  if (invalid) {
    return { error: `"${invalid}" is not a valid X handle.` }
  }

  // Optional scan window; empty strings become null for chronological sorting.
  const scanFrom = input.scanFrom?.trim() || null
  const scanTo = input.scanTo?.trim() || null
  if (scanFrom && scanTo && scanFrom > scanTo) {
    return { error: "Scan start date must be on or before the end date." }
  }

  // Trim and filter empty example tweets.
  const exampleTweets = input.exampleTweets
    .map((tweet) => tweet.trim())
    .filter(Boolean)

  // Insert the monitor into the DB; RLS enforces user ownership.
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

  // Redirect to the monitors list where the new monitor now appears.
  redirect("/dashboard/test")
}
