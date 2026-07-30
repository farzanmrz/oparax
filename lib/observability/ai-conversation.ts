// lib/observability/ai-conversation.ts
//
// What counts as one "conversation" in Sentry's Conversations view (Explore > Conversations).
//
// Sentry groups AI spans sharing a `gen_ai.conversation.id` into one readable thread. The feature
// is designed for chatbots, where the unit is obvious — one user, one chat. This product has no
// chat: it has a PIPELINE, several models deep, that runs unattended. So the unit had to be
// chosen, and the choice is "the span of model work a human would want to read top to bottom when
// something looks wrong":
//
//   - extraction — one desk's voice extraction, retries included. Reading a desk's extraction
//     history as one thread is exactly the view that was missing when a run billed $0.31 and
//     produced nothing.
//   - drafting  — one STORY's council: five drafters and the judge that ranks them. This is the
//     genuinely multi-party conversation in the product, and it is unreadable any other way; six
//     spans scattered across a trace do not show you that four models agreed and the judge picked
//     the fifth.
//
// Deliberately NOT one conversation per desk-forever: a desk lives for months and would accumulate
// every draft it ever wrote into one unreadable thread, which is the same as having no grouping.
//
// Sentry uses the id as a URL path segment, so it must stay short and opaque — alphanumerics with
// dashes or underscores, never a handle, URL, or anything free-form a user typed.

/** One desk's voice extraction, across retries. */
export function extractionConversationId(agentId: string): string {
  return `ext-${agentId}`;
}

/** One story's drafting council + judge. */
export function draftingConversationId(storyId: string): string {
  return `draft-${storyId}`;
}
