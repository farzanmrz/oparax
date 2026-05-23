import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  parseScanInput,
  runWorkflowScan,
  WorkflowScanError,
} from "@/lib/workflow-scans"

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return error("Authentication required.", 401)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON.", 400)
  }

  try {
    const input = parseScanInput(body)
    const knowledgeBank = await runWorkflowScan(input)
    return NextResponse.json(knowledgeBank)
  } catch (err) {
    if (err instanceof WorkflowScanError) {
      return error(err.message, err.status)
    }

    console.error("Unexpected scan route error:", err)
    return error("Failed to reach news scanning service.", 502)
  }
}
