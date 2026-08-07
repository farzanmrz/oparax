"use client";

import { Streamdown } from "streamdown";

export default function DraftReasoning({ content }: { readonly content: string }) {
  return (
    <div className="text-sm leading-relaxed text-text-body [&_p]:mb-3 [&_p:last-child]:mb-0">
      <Streamdown>{content}</Streamdown>
    </div>
  );
}
