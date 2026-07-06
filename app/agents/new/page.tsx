import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { AgentChat } from "./agent-chat";

/**
 * New-agent page — hosts the setup chat over the eve agent. The chat is the
 * existing AgentChat (ai-elements + eve, already the trimmed chatbot layout:
 * no web-search / mic / model-select / attachment controls). Slim header with a
 * back link sits above it.
 *
 * TODO (v0 slice): unsaved-progress guard — once the user sends the first
 * message, warn on reload / tab close / browser back / in-app navigation that
 * leaving discards the conversation (not yet persisted across navigation).
 */
export default function NewAgentPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border py-4">
        <Link
          href="/agents"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Agents
        </Link>
        <h1 className="text-lg font-semibold leading-none tracking-tight">New agent</h1>
      </div>
      <div className="min-h-0 flex-1 py-4">
        <AgentChat />
      </div>
    </div>
  );
}
