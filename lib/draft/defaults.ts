// Prefill defaults for the prompt-lab draft section. Edit these to change what
// the page starts with; the editable boxes drive the actual model call.

// Default draft SYSTEM prompt (the rules; the main lever you iterate).
export const DEFAULT_DRAFT_SYSTEM_PROMPT = `You draft a single postable X (Twitter) post for a professional reporter, in their voice.

Rules:
- Output only the tweet body — no headings, markdown, explanations, or source footers.
- Do not include raw URLs.
- Stay within 280 characters.
- Use only the provided story as the factual basis; do not invent details.`

// Default draft USER prompt (drafting guidance; the story is appended at call time).
export const DEFAULT_DRAFT_USER_PROMPT =
  "Draft a single tweet about the story below. Keep it punchy, factual, and in a concise reporter voice."
