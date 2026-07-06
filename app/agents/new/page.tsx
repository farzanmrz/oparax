import { NewAgentExperience } from "./new-agent-experience";

/**
 * New-agent page — a focused, full-height chat for spinning up a desk. The chat
 * body is the existing eve-backed AgentChat; NewAgentExperience wraps it with a
 * slim header and the unsaved-progress guard (reload, tab close, browser Back,
 * and in-app navigation all confirm before discarding the conversation).
 */
export default function NewAgentPage() {
  return <NewAgentExperience />;
}
