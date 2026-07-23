import { CreateDeskForm } from "./create-desk-form";

// Mirrors app/api/ingest/route.ts's maxDuration: the `after()` voice-extraction call this
// page's create action kicks off needs the function alive long enough to run.
export const maxDuration = 300;

/**
 * New-desk page — the create-desk form + live preview (create-desk-form.tsx). Replaces the
 * old chat-based create flow (new-agent-experience.tsx + agent-chat.tsx, deleted alongside
 * this rewrite).
 */
export default function NewDeskPage() {
  return <CreateDeskForm />;
}
