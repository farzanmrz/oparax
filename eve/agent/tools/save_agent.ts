// agent/tools/save_agent.ts
import { defineTool } from "eve/tools";
import { validateCadence } from "../lib/cadence";
import { type DeskConfig, deskConfigSchema } from "../lib/desk-config";

// Approval-gated echo — this tool must NEVER write to a database. eve sessions
// carry no user identity until the channel-auth slice, so persistence happens
// in the app: the approval pause renders a Save card in the chat; the signed-in
// reporter's Save click inserts via a Next server action FIRST, then approves
// this call — so execute() running doubles as the model's proof the desk was
// really saved. "Not yet" denies, and the conversation continues.
export default defineTool({
  description:
    "Present the completed desk for the reporter's final Save. Call ONLY at the save moment — after the desk is complete, read back in plain language, and the reporter has said an explicit yes. Pass the full final configuration. The call pauses on a Save card in the chat: clicking Save persists the desk and approves this call; 'Not yet' denies it — keep adjusting and offer again. Never claim the desk is saved unless this call completed.",
  inputSchema: deskConfigSchema,
  // A cadence that slipped past validate_cadence is auto-denied with a reason
  // (the model self-corrects); a valid config pauses for the reporter's click.
  approval: ({ toolInput }) => {
    const cadence = (toolInput as DeskConfig | undefined)?.cadence;
    if (!cadence) return "user-approval"; // malformed input dies on inputSchema anyway
    const verdict = validateCadence(cadence);
    return verdict.ok
      ? "user-approval"
      : {
          type: "denied" as const,
          reason: `Cadence violates the rate rail (${verdict.violations.join(", ")}) — fix it with validate_cadence, then offer to save again.`,
        };
  },
  async execute(config) {
    return { ok: true as const, config };
  },
});
