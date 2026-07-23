"use client";

// Renders a voice guide's `guide_deploy` markdown as formatted prose (headings, bold, lists,
// code) instead of a raw-text dump. Streamdown is heavy (markdown + code/math plugins), so the
// Voice page loads this via next/dynamic, keeping it out of the route's initial JS. The guide is
// the reporter's own owner-scoped data; Streamdown sanitizes regardless.

import { Streamdown } from "streamdown";

export default function GuideMarkdown({ content }: { readonly content: string }) {
  // Streamdown ships its own markdown styling (headings/bold/lists/code); a plain text-sized
  // wrapper is all that's needed — same pattern as ai-elements' ReasoningContent.
  return (
    <div className="text-sm text-foreground leading-relaxed">
      <Streamdown>{content}</Streamdown>
    </div>
  );
}
