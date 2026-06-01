"use client"

// Imports
import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

interface HandleInputProps {
  handles: string[]
  maxHandles: number
  controlClassName?: string
  showCount?: boolean
  onAdd: (handle: string) => void
  onRemove: (index: number) => void
}

function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@/, "")
}

function isValidHandle(handle: string): boolean {
  return /^[A-Za-z0-9_]{1,15}$/.test(handle)
}

export function HandleInput({
  controlClassName,
  handles,
  maxHandles,
  showCount = true,
  onAdd,
  onRemove,
}: HandleInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  function commitHandle(raw: string) {
    setError(null)
    const cleaned = cleanHandle(raw)
    if (!cleaned) return

    if (handles.length >= maxHandles) {
      setError(`Maximum ${maxHandles} handles allowed.`)
      return
    }
    if (handles.includes(cleaned)) {
      setError(`@${cleaned} is already added.`)
      return
    }
    if (!isValidHandle(cleaned)) {
      setError(`"${cleaned}" is not a valid X handle.`)
      return
    }

    onAdd(cleaned)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setError(null)

    // Comma or space triggers chip creation
    if (value.includes(",") || value.includes(" ")) {
      const parts = value.split(/[, ]/)
      for (const part of parts.slice(0, -1)) {
        if (part.trim()) commitHandle(part)
      }
      setInputValue(parts[parts.length - 1])
      return
    }

    setInputValue(value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      const cleaned = cleanHandle(inputValue)
      if (cleaned) {
        commitHandle(inputValue)
        setInputValue("")
      }
    }
    // Backspace on empty input removes last chip
    if (e.key === "Backspace" && !inputValue && handles.length > 0) {
      onRemove(handles.length - 1)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        data-slot="handle-input-control"
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border-2 border-input bg-background/35 px-3 py-1.5 transition-colors hover:border-foreground/35 hover:bg-background/45 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          controlClassName,
        )}
      >
        {handles.map((handle, index) => (
          <span
            key={handle}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-link/25 bg-link/10 px-2.5 text-sm font-medium text-link"
          >
            @{handle}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-link/70 transition-colors hover:bg-link/15 hover:text-link-hover"
              aria-label={`Remove @${handle}`}
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                strokeWidth={2}
                className="size-3"
              />
            </button>
          </span>
        ))}
        <input
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={handles.length === 0 ? "e.g. FabrizioRomano, AlexKayKay" : ""}
          className="min-w-[10rem] flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          disabled={handles.length >= maxHandles}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showCount && handles.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {handles.length} of {maxHandles} added
        </p>
      )}
    </div>
  )
}
