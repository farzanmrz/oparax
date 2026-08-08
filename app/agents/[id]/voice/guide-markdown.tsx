"use client";

// Renders a voice guide's `guide_deploy` markdown as formatted prose (headings, bold, lists,
// code) instead of a raw-text dump. Streamdown is heavy (markdown + code/math plugins), so the
// Voice page loads this via next/dynamic, keeping it out of the route's initial JS. The guide is
// the reporter's own owner-scoped data; Streamdown sanitizes regardless.

import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { type Components, Streamdown } from "streamdown";
import { XEntityText } from "@/components/x-entity-text";

const POST_EXAMPLE_MARKER = "\uE000";

// The extraction prompt (lib/sysprompts/voice-extract.md) mandates every rule's example
// evidence be wrapped in bare `<post>...</post>` blocks — blockquotes are explicitly forbidden
// there. Streamdown's sanitizer strips unrecognized tags like `<post>`, leaving the evidence as
// unstyled orphan text and force-closing the enclosing rule list. Rewriting each *complete*
// `<post>...</post>` block into a markdown blockquote (right before handing content to
// Streamdown) keeps the stored guide untouched and fixes only how it renders.
function postTagsToBlockquotes(markdown: string): string {
  return markdown.replace(/<post>\n?([\s\S]*?)\n?<\/post>/g, (_match, body: string) => {
    return body
      .split("\n")
      .map((line: string, index: number) => {
        const markedLine = index === 0 ? `${POST_EXAMPLE_MARKER}${line}` : line;
        return markedLine.length === 0 ? ">" : `> ${markedLine}`;
      })
      .join("\n");
  });
}

function hasPostExampleMarker(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => {
    if (typeof child === "string") return child.includes(POST_EXAMPLE_MARKER);
    return (
      isValidElement<{ children?: ReactNode }>(child) && hasPostExampleMarker(child.props.children)
    );
  });
}

function renderPostExampleText(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return <XEntityText text={child.replaceAll(POST_EXAMPLE_MARKER, "")} />;
    }
    if (!isValidElement<{ children?: ReactNode }>(child)) return child;
    return cloneElement(child, undefined, renderPostExampleText(child.props.children));
  });
}

const guideComponents: Components = {
  blockquote: ({ children, node: _node, ...props }) => (
    <blockquote {...props}>
      {hasPostExampleMarker(children) ? renderPostExampleText(children) : children}
    </blockquote>
  ),
};

export default function GuideMarkdown({ content }: { readonly content: string }) {
  // Streamdown ships its own markdown styling (headings/bold/lists/code); a plain text-sized
  // wrapper is all that's needed — same pattern as ai-elements' ReasoningContent.
  return (
    <div className="text-sm leading-relaxed text-text-body [&_blockquote]:my-3 [&_blockquote]:whitespace-pre-wrap [&_blockquote]:rounded-r-[7px] [&_blockquote]:border-primary [&_blockquote]:border-l-[3px] [&_blockquote]:bg-white/4 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_em]:text-xs [&_em]:italic">
      <Streamdown components={guideComponents}>{postTagsToBlockquotes(content)}</Streamdown>
    </div>
  );
}
