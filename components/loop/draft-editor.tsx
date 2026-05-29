"use client"

// Imports
import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveDraft } from "@/app/dashboard/test/[id]/actions"
import { weightedLength, TWEET_WEIGHTED_LIMIT } from "@/lib/draft/count"
import { getDraftIssue } from "@/lib/draft/validate"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

// An existing persisted draft for a story, if one was already generated.
export interface ExistingDraft {
  id: string
  text: string
  status: string
}

/**
 * Per-story drafting control: generate a draft, edit it inline with a live
 * weighted count + validation, and save (status → edited).
 * @param props.storyId - the story to draft for
 * @param props.initialDraft - an already-persisted draft, if any
 * @returns the draft generate/edit UI
 */
export function DraftEditor({
  storyId,
  initialDraft,
}: {
  storyId: string
  initialDraft: ExistingDraft | null
}) {
  const router = useRouter()

  // Draft id, text, and status; in-flight and error flags; save confirmation.
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null)
  const [text, setText] = useState(initialDraft?.text ?? "")
  const [status, setStatus] = useState<string | null>(initialDraft?.status ?? null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Live weighted count and validation.
  const count = weightedLength(text)
  const issue = text ? getDraftIssue(text) : null

  // Fetch a draft from the API and update local state.
  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      })
      const data = (await response.json()) as {
        draftId?: string
        text?: string
        error?: string
      }
      if (!response.ok || !data.draftId || typeof data.text !== "string") {
        throw new Error(data.error || "Draft generation failed.")
      }
      setDraftId(data.draftId)
      setText(data.text)
      setStatus("draft")
      setSaved(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  // Persist the edited draft text and update local state.
  async function save() {
    if (!draftId) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const result = await saveDraft(draftId, text)
    if ("error" in result) {
      setError(result.error)
    } else {
      setStatus("edited")
      setSaved(true)
      router.refresh()
    }
    setSaving(false)
  }

  if (!draftId) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={generate}
          pending={generating}
          disabled={generating}
          className="self-start"
        >
          Generate draft
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setSaved(false)
        }}
        rows={3}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span
          className={
            count > TWEET_WEIGHTED_LIMIT
              ? "text-destructive"
              : "text-muted-foreground"
          }
        >
          {count} / {TWEET_WEIGHTED_LIMIT}
        </span>
        <div className="flex items-center gap-2">
          {status && <Badge variant="secondary">{status}</Badge>}
          {saved && <span className="text-muted-foreground">Saved</span>}
          <Button size="sm" onClick={save} pending={saving} disabled={saving}>
            Save
          </Button>
        </div>
      </div>
      {issue && <p className="text-xs text-destructive">{issue}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
