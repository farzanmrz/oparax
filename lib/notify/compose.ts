import { formatSourceIdentity, type SourceIdentity } from "@/lib/agent/source-identity";

type ComposeDraftMessageInput = {
  sourceIdentity: SourceIdentity;
  sourceText: string;
  winningText: string;
  revised?: boolean; // true on the re-delivery after an email-reply correction
};

export function composeDraftMessage(input: ComposeDraftMessageInput): string {
  const attribution =
    input.sourceIdentity.kind === "x"
      ? `from a post by ${formatSourceIdentity(input.sourceIdentity)}`
      : `from ${formatSourceIdentity(input.sourceIdentity)}`;
  return [
    `*${input.revised ? "Revised draft" : "New draft"}* — ${attribution}`,
    "",
    `> ${input.sourceText.replace(/\n/g, "\n> ")}`,
    "",
    "*Draft:*",
    input.winningText,
  ].join("\n");
}

/** Same content as composeDraftMessage, without Slack mrkdwn — for the plaintext email body. */
export function composeDraftMessagePlainText(input: ComposeDraftMessageInput): string {
  const attribution =
    input.sourceIdentity.kind === "x"
      ? `from a post by ${formatSourceIdentity(input.sourceIdentity)}`
      : `from ${formatSourceIdentity(input.sourceIdentity)}`;
  return [
    `${input.revised ? "Revised draft" : "New draft"} — ${attribution}`,
    "",
    `Source: ${input.sourceText}`,
    "",
    "Draft:",
    input.winningText,
  ].join("\n");
}
