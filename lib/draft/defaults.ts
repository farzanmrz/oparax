// Operator-facing prefill default for the prompt-lab draft input. The draft
// SYSTEM prompt is NOT here — it lives in lib/draft/prompt.ts (DRAFT_SYSTEM_PROMPT),
// tuned in code. The operator only supplies drafting instructions on the page.

// Default drafting instructions prefilled into the lab (editable, may be cleared).
export const DEFAULT_DRAFTING_INSTRUCTIONS =
  "Punchy, factual, concise reporter voice. Lead with the key development.";
