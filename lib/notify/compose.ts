type ComposeDraftMessageInput = {
  authorHandle: string;
  sourceText: string;
  winningText: string;
  revised?: boolean; // true on the re-delivery after an email-reply correction
};

export function composeDraftMessage(input: ComposeDraftMessageInput): string {
  return [
    `*${input.revised ? "Revised draft" : "New draft"}* — from a post by @${input.authorHandle}`,
    "",
    `> ${input.sourceText.replace(/\n/g, "\n> ")}`,
    "",
    "*Draft:*",
    input.winningText,
  ].join("\n");
}

/** Same content as composeDraftMessage, without Slack mrkdwn — for the plaintext email body. */
export function composeDraftMessagePlainText(input: ComposeDraftMessageInput): string {
  return [
    `${input.revised ? "Revised draft" : "New draft"} — from a post by @${input.authorHandle}`,
    "",
    `Source: ${input.sourceText}`,
    "",
    "Draft:",
    input.winningText,
  ].join("\n");
}
