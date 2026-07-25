// lib/x/handle-input.ts
//
// Client-side split/merge helpers for a tracked-X-handle input field — pure, no React, so the
// create-desk form (app/agents/new/create-desk-form.tsx) and the Setup card's X-accounts field
// (app/agents/[id]/setup/sources-card.tsx) share ONE implementation instead of two copies
// drifting apart, which is exactly how these two fields disagreed before (Setup had no client-side
// split/paste handling at all). Light shaping only — the server (createDesk / addTrackedHandles)
// does the real charset validation, dedupe, and cap regardless of what a client sends.

import { MAX_TRACKED_HANDLES } from "@/lib/x/handle";

/** Strip leading @(s) + whitespace. Case is preserved for display; the server normalizes +
 *  charset-validates on save (lib/x/handle.ts). */
function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

/** Split a typed/pasted blob into candidate handles — comma / whitespace / newline separated,
 *  each with or without a leading @. */
export function splitHandles(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map(cleanHandle)
    .filter(Boolean);
}

/** Merge new handles into an existing client-held list: case-insensitive dedupe, capped at
 *  MAX_TRACKED_HANDLES. Used where a list is assembled locally before the desk exists yet
 *  (create-desk form, ahead of `createDesk`); Setup's field commits straight through
 *  `addTrackedHandles` instead, which performs this same merge server-side against the
 *  already-persisted row. */
export function mergeHandles(existing: readonly string[], incoming: readonly string[]): string[] {
  const next = [...existing];
  for (const handle of incoming) {
    if (next.length >= MAX_TRACKED_HANDLES) break;
    if (!next.some((h) => h.toLowerCase() === handle.toLowerCase())) next.push(handle);
  }
  return next;
}
