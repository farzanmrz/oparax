"use client"

// Imports
import { useState } from "react"

interface HandleInputProps {
  handles: string[]
  maxHandles: number
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
    <div className="ws-handle-wrap">
      <div className="ws-handle-well">
        {handles.map((handle, index) => (
          <span key={handle} className="ws-handle-chip">
            @{handle}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="ws-handle-x"
              aria-label={`Remove @${handle}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            handles.length === 0 ? "e.g. FabrizioRomano, AlexKayKay" : ""
          }
          className="ws-handle-input"
          disabled={handles.length >= maxHandles}
        />
      </div>

      {error && (
        <p className="ferr show" style={{ margin: 0 }}>
          {error}
        </p>
      )}

      {showCount && handles.length > 0 && (
        <p className="ws-handle-count">
          {handles.length} of {maxHandles} added
        </p>
      )}
    </div>
  )
}
