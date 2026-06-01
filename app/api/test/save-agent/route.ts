// Imports
import { NextResponse } from "next/server"
import {
  MONITOR_MAX_HANDLES,
  isValidHandle,
  normalizeHandle,
} from "@/lib/scan/handles"
import { createClient } from "@/lib/supabase/server"

/**
 * Save a prompt-lab run as a real monitor configuration after the operator has
 * proven the scan + draft shape in the lab UI.
 * @param req - request carrying the monitor name, handles, and instructions
 * @returns the saved monitor id, or a JSON error
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const name =
    typeof record.name === "string" && record.name.trim()
      ? record.name.trim()
      : "Prompt lab agent"
  const monitoringDescription =
    typeof record.monitoringDescription === "string"
      ? record.monitoringDescription.trim()
      : ""
  const draftingInstructions =
    typeof record.draftingInstructions === "string"
      ? record.draftingInstructions.trim()
      : ""
  const rawHandles = Array.isArray(record.handles) ? record.handles : []
  const seenHandles = new Set<string>()
  const handles = rawHandles
    .filter((handle): handle is string => typeof handle === "string")
    .map(normalizeHandle)
    .filter((handle) => {
      const key = handle.toLowerCase()
      if (!handle || seenHandles.has(key)) return false
      seenHandles.add(key)
      return true
    })

  if (handles.length === 0) {
    return NextResponse.json(
      { error: "Add at least one X account to monitor." },
      { status: 400 },
    )
  }
  if (handles.length > MONITOR_MAX_HANDLES) {
    return NextResponse.json(
      { error: `Use ${MONITOR_MAX_HANDLES} or fewer X accounts.` },
      { status: 400 },
    )
  }

  const invalidHandle = handles.find((handle) => !isValidHandle(handle))
  if (invalidHandle) {
    return NextResponse.json(
      { error: `@${invalidHandle} is not a valid X handle.` },
      { status: 400 },
    )
  }

  const { data: monitor, error } = await supabase
    .from("monitors")
    .insert({
      user_id: user.id,
      name,
      monitored_handles: handles,
      monitoring_description: monitoringDescription,
      drafting_instructions: draftingInstructions,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>()

  if (error || !monitor) {
    return NextResponse.json(
      { error: "Failed to save workflow." },
      { status: 500 },
    )
  }

  return NextResponse.json({ id: monitor.id })
}
