"use client"

// Imports
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { HandleInput } from "@/components/handle-input"

const DEFAULT_HANDLES = [
  "talkfcb_",
  "EduardoHagn",
  "FabrizioRomano",
  "DavidOrnstein",
  "Glongari",
  "cfcpys",
  "Barza_Buzz",
  "Messilizer0",
  "fcbarcelona",
  "BarcaSpaces",
  "NealGardner_",
]

const DEFAULT_SCANNING_INSTRUCTIONS =
  "All news around FC Barcelona, including transfers, league news, rumors, murmurs, and anything relevant around the club."

/**
 * Renders the minimal test workflow form and streamed scan console.
 * @returns the test workflow form UI
 */
export function TestWorkflowForm() {
  const [workflowName, setWorkflowName] = useState("")
  const [frequencyAmount, setFrequencyAmount] = useState("10")
  const [frequencyUnit, setFrequencyUnit] = useState("m")
  const [handles, setHandles] = useState<string[]>(DEFAULT_HANDLES)
  const [scanningInstructions, setScanningInstructions] = useState(
    DEFAULT_SCANNING_INSTRUCTIONS,
  )
  const [output, setOutput] = useState("")
  const [isScanning, setIsScanning] = useState(false)

  const canRunScan =
    workflowName.trim().length > 0 &&
    scanningInstructions.trim().length > 0 &&
    handles.length > 0 &&
    !isScanning

  /**
   * Adds one normalized X handle to the form state.
   * @param handle - the handle returned by the handle input
   * @returns nothing
   */
  function addHandle(handle: string) {
    setHandles((prev) => [...prev, handle])
  }

  /**
   * Removes one X handle from the form state.
   * @param index - the handle index to remove
   * @returns nothing
   */
  function removeHandle(index: number) {
    setHandles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  /**
   * Starts the test scan and streams output into the console block.
   * @returns a promise that settles when streaming finishes
   */
  async function runScan() {
    if (!canRunScan) return

    setIsScanning(true)
    setOutput("")

    try {
      const response = await fetch("/api/test-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowName,
          frequencyAmount,
          frequencyUnit,
          handles,
          scanningInstructions,
        }),
      })

      if (!response.body) {
        const message = await response.text()
        setOutput(message || "Scan did not return a readable stream.")
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        setOutput((prev) => prev + decoder.decode(value, { stream: true }))
      }

      const finalText = decoder.decode()
      if (finalText) {
        setOutput((prev) => prev + finalText)
      }
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Scan failed.")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-2 md:px-4">
      <Card>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 lg:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="test-workflow-name">
                  Workflow name
                </FieldLabel>
                <Input
                  id="test-workflow-name"
                  value={workflowName}
                  onChange={(event) => setWorkflowName(event.target.value)}
                  placeholder="e.g. Barcelona transfer watch"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="test-frequency-amount">
                  Frequency
                </FieldLabel>
                <div className="grid max-w-md grid-cols-[9.5rem_minmax(0,1fr)] gap-0">
                  <Select
                    value={frequencyUnit}
                    onValueChange={setFrequencyUnit}
                  >
                    <SelectTrigger className="w-full rounded-r-none border-r-0 text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="m">Minutes</SelectItem>
                        <SelectItem value="h">Hours</SelectItem>
                        <SelectItem value="d">Days</SelectItem>
                        <SelectItem value="w">Weeks</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Input
                    id="test-frequency-amount"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={frequencyAmount}
                    onChange={(event) =>
                      setFrequencyAmount(event.target.value.replace(/\D/g, ""))
                    }
                    className="rounded-l-none text-foreground"
                  />
                </div>
              </Field>
            </div>

            <Field>
              <FieldLabel>X accounts to monitor</FieldLabel>
              <HandleInput
                handles={handles}
                maxHandles={20}
                onAdd={addHandle}
                onRemove={removeHandle}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="test-scanning-instructions">
                Scanning instructions
              </FieldLabel>
              <Textarea
                id="test-scanning-instructions"
                value={scanningInstructions}
                onChange={(event) =>
                  setScanningInstructions(event.target.value)
                }
                placeholder={DEFAULT_SCANNING_INSTRUCTIONS}
                rows={6}
              />
            </Field>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={runScan}
                disabled={!canRunScan}
                pending={isScanning}
              >
                {isScanning ? "Scanning..." : "Run Scan"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <pre className="min-h-64 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-background/50 p-4 font-mono text-sm leading-6 text-foreground">
            {output || "Run a scan to see output here."}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
