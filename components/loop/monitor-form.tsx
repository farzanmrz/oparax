"use client"

// Imports
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  createMonitor,
  type CreateMonitorInput,
} from "@/app/dashboard/test/new/actions"
import {
  MONITOR_MAX_HANDLES,
  isValidHandle,
  normalizeHandle,
} from "@/lib/scan/handles"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/**
 * Form for creating a new X monitor with handles, drafting rules, and scan window.
 * Validates handles locally before submission to the server action.
 * @returns the monitor creation form UI
 */
export function MonitorForm() {
  // Router for navigation after successful monitor creation.
  const router = useRouter()

  // Form fields: name, descriptions, handles, tweets, and scan window.
  const [name, setName] = useState("")
  const [monitoringDescription, setMonitoringDescription] = useState("")
  const [draftingInstructions, setDraftingInstructions] = useState("")

  // Handles management: validated list and current input with error state.
  const [handles, setHandles] = useState<string[]>([])
  const [handleInput, setHandleInput] = useState("")
  const [handleError, setHandleError] = useState<string | null>(null)

  // Example tweets and optional scan window; form-level error and pending state.
  const [exampleTweets, setExampleTweets] = useState<string[]>([""])
  const [scanFrom, setScanFrom] = useState("")
  const [scanTo, setScanTo] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  /**
   * Add a handle chip from the current input, validating it locally.
   * Matches server-side rules: 1–15 [A-Za-z0-9_], ≤20 total, no duplicates.
   * @param raw - the raw handle string from the input
   */
  function commitHandle(raw: string) {
    const cleaned = normalizeHandle(raw)
    if (!cleaned) return
    if (handles.length >= MONITOR_MAX_HANDLES) {
      setHandleError(`Maximum ${MONITOR_MAX_HANDLES} handles allowed.`)
      return
    }
    if (handles.includes(cleaned)) {
      setHandleError(`@${cleaned} is already added.`)
      return
    }
    if (!isValidHandle(cleaned)) {
      setHandleError(`"${cleaned}" is not a valid X handle.`)
      return
    }
    setHandles((prev) => [...prev, cleaned])
    setHandleInput("")
    setHandleError(null)
  }

  /**
   * Handle Enter, comma, and Backspace keys in the handle input field.
   * @param event - the keyboard event
   */
  function handleHandleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      commitHandle(handleInput)
    } else if (event.key === "Backspace" && !handleInput && handles.length > 0) {
      setHandles((prev) => prev.slice(0, -1))
      setHandleError(null)
    }
  }

  /**
   * Remove a handle chip from the list by index.
   * @param index - the position in the handles array
   */
  function removeHandle(index: number) {
    setHandles((prev) => prev.filter((_, i) => i !== index))
    setHandleError(null)
  }

  /**
   * Update an example tweet by index.
   * @param index - the position in the exampleTweets array
   * @param value - the new tweet text
   */
  function updateExampleTweet(index: number, value: string) {
    setExampleTweets((prev) => prev.map((t, i) => (i === index ? value : t)))
  }

  /**
   * Add a new empty example tweet field.
   */
  function addExampleTweet() {
    setExampleTweets((prev) => [...prev, ""])
  }

  /**
   * Remove an example tweet by index; keep at least one empty field.
   * @param index - the position in the exampleTweets array
   */
  function removeExampleTweet(index: number) {
    setExampleTweets((prev) =>
      prev.length === 1 ? [""] : prev.filter((_, i) => i !== index),
    )
  }

  /**
   * Submit the monitor form: validates fields, includes any pending handle, and calls the server action.
   * On success the server redirects; on failure shows an error message here.
   * @param event - the form submission event
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    // Require a non-empty monitor name.
    if (!name.trim()) {
      setFormError("Name is required.")
      return
    }

    // Fold any half-typed handle still in the input into the final list.
    const pendingHandle = normalizeHandle(handleInput)
    const finalHandles =
      pendingHandle && isValidHandle(pendingHandle) && !handles.includes(pendingHandle)
        ? [...handles, pendingHandle]
        : handles

    // Build the server action input from the form state.
    const input: CreateMonitorInput = {
      name,
      monitoringDescription,
      handles: finalHandles,
      draftingInstructions,
      exampleTweets,
      scanFrom: scanFrom || null,
      scanTo: scanTo || null,
    }

    // Submit to the server action; success redirects server-side and unmounts this form.
    setPending(true)
    const result = await createMonitor(input)
    if (result?.error) {
      setFormError(result.error)
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>New monitor</CardTitle>
          <CardDescription>
            Configure what to watch on X. You can run a scan from the monitor
            once it&apos;s created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="monitor-name">Name</FieldLabel>
              <Input
                id="monitor-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. NFL trade deadline"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="monitor-description">
                What to monitor
              </FieldLabel>
              <Textarea
                id="monitor-description"
                value={monitoringDescription}
                onChange={(event) =>
                  setMonitoringDescription(event.target.value)
                }
                placeholder="Describe the kinds of stories this monitor should surface."
                rows={3}
              />
            </Field>

            <Field data-invalid={handleError ? true : undefined}>
              <FieldLabel htmlFor="monitor-handles">
                Monitored handles
              </FieldLabel>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-input bg-background/35 px-3 py-2">
                {handles.map((handle, index) => (
                  <span
                    key={handle}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                  >
                    @{handle}
                    <button
                      type="button"
                      aria-label={`Remove @${handle}`}
                      onClick={() => removeHandle(index)}
                      className="text-secondary-foreground/70 hover:text-secondary-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="monitor-handles"
                  value={handleInput}
                  onChange={(event) => {
                    setHandleInput(event.target.value)
                    setHandleError(null)
                  }}
                  onKeyDown={handleHandleKeyDown}
                  onBlur={() => commitHandle(handleInput)}
                  disabled={handles.length >= MONITOR_MAX_HANDLES}
                  placeholder={
                    handles.length >= MONITOR_MAX_HANDLES
                      ? "Limit reached"
                      : "Type a handle and press Enter"
                  }
                  className="min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
              </div>
              <FieldDescription>
                Up to {MONITOR_MAX_HANDLES} X handles ({handles.length} added).
              </FieldDescription>
              <FieldError>{handleError}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="monitor-drafting">
                Drafting instructions
              </FieldLabel>
              <Textarea
                id="monitor-drafting"
                value={draftingInstructions}
                onChange={(event) =>
                  setDraftingInstructions(event.target.value)
                }
                placeholder="How drafts should sound (voice, format, do's and don'ts)."
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel>Example tweets</FieldLabel>
              <FieldDescription>
                Sample posts that capture the voice to imitate.
              </FieldDescription>
              <div className="flex flex-col gap-2">
                {exampleTweets.map((tweet, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Textarea
                      value={tweet}
                      onChange={(event) =>
                        updateExampleTweet(index, event.target.value)
                      }
                      placeholder="Paste an example tweet…"
                      rows={2}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Remove example tweet"
                      onClick={() => removeExampleTweet(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={addExampleTweet}
                >
                  Add example tweet
                </Button>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="monitor-scan-from">Scan from</FieldLabel>
                <Input
                  id="monitor-scan-from"
                  type="date"
                  value={scanFrom}
                  onChange={(event) => setScanFrom(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="monitor-scan-to">Scan to</FieldLabel>
                <Input
                  id="monitor-scan-to"
                  type="date"
                  value={scanTo}
                  onChange={(event) => setScanTo(event.target.value)}
                />
              </Field>
            </div>

            <FieldError>{formError}</FieldError>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/test")}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" pending={pending} disabled={pending}>
                Create monitor
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  )
}
