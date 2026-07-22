type ComposeDraftMessageInput = {
  authorHandle: string;
  sourceText: string;
  winningText: string;
  modelCount: number;
  totalCostUsd: number | null;
  revised?: boolean; // true on the re-delivery after an email-reply correction
};

export function composeDraftMessage(input: ComposeDraftMessageInput): string {
  const cost = input.totalCostUsd == null ? "—" : `$${input.totalCostUsd.toFixed(4)}`;
  return [
    `*${input.revised ? "Revised draft" : "New draft"}* — from a post by @${input.authorHandle}`,
    "",
    `> ${input.sourceText.replace(/\n/g, "\n> ")}`,
    "",
    "*Draft:*",
    input.winningText,
    "",
    `_${input.modelCount} model${input.modelCount === 1 ? "" : "s"} · ${cost}_`,
  ].join("\n");
}

/** Same content as composeDraftMessage, without Slack mrkdwn — for the plaintext email body. */
export function composeDraftMessagePlainText(input: ComposeDraftMessageInput): string {
  const cost = input.totalCostUsd == null ? "—" : `$${input.totalCostUsd.toFixed(4)}`;
  return [
    `${input.revised ? "Revised draft" : "New draft"} — from a post by @${input.authorHandle}`,
    "",
    `Source: ${input.sourceText}`,
    "",
    "Draft:",
    input.winningText,
    "",
    `${input.modelCount} model${input.modelCount === 1 ? "" : "s"} · ${cost}`,
  ].join("\n");
}
