// lib/split-list.ts
//
// The generic half of "split a typed/pasted blob into candidates" — comma / whitespace /
// newline separated, trimmed, empties dropped. Shared by `lib/x/handle-input.ts`'s
// `splitHandles` (which additionally strips a leading `@`, handle-specific shaping that a
// website URL must NOT get) and the Setup card's website-URL input
// (`app/agents/[id]/sources/sources-card.tsx`), so the two fields don't hand-roll the same
// regex split twice.

/** Split a typed/pasted blob on commas/whitespace into non-empty, trimmed candidates. */
export function splitList(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
