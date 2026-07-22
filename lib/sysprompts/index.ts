// The system prompts live as markdown under lib/sysprompts/ (one place, no escaping
// hazards in TS string literals). Read each once at module load. next.config.ts's
// outputFileTracingIncludes bundles the .md files into the /api/chat function on Vercel.
// SERVER-ONLY: readFileSync at module scope — never import this from a client component.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const load = (name: string) => readFileSync(join(process.cwd(), "lib/sysprompts", name), "utf8");
const SCAN_PROTOCOL_RUNNING = load("scan-protocol.md");
const SCAN_CLUSTERING = load("scan-clustering.md");
const SCAN_PROTOCOL = `${SCAN_PROTOCOL_RUNNING}\n\n${SCAN_CLUSTERING}`;
const withProtocol = (t: string) => t.replace("{{SCAN_PROTOCOL}}", SCAN_PROTOCOL);
const withClustering = (t: string) => t.replace("{{SCAN_CLUSTERING}}", SCAN_CLUSTERING);

export const DESK_AGENT_PROMPT = withProtocol(load("desk-agent.md"));
export const SCAN_RUNNER_PROMPT = withProtocol(load("scan-runner.md"));
export const SCAN_STRUCTURE_PROMPT = load("scan-structure.md");
export const SCAN_CLUSTER_RUNNER_PROMPT = withClustering(load("scan-cluster-runner.md"));
export const DRAFT_RUNNER_PROMPT = load("draft-runner.md");
export const X_SEARCH_EXECUTOR_PROMPT = load("x-search-executor.md");
export const ONBOARDING_EXTRACT_PROMPT = load("onboarding-extract.md");
export const VOICE_EXTRACT_PROMPT = load("voice-extract.md");
