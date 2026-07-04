import { AgentChat } from "./agent-chat";

/**
 * Agents page: the news-desk chat over the repo's eve agent. A slim desk
 * header sits above the chat, which fills the rest of the dashboard shell.
 */
export default function AgentsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">News desk</h1>
          <p className="text-sm text-muted-foreground">
            Your agent on the wire — ask it to watch, catch, or draft.
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
          <span aria-hidden="true" className="size-2 rounded-full bg-live" />
          On the wire
        </span>
      </div>
      <div className="min-h-0 flex-1 py-4">
        <AgentChat />
      </div>
    </div>
  );
}
