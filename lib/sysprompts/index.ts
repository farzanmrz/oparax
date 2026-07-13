// The system prompts live as markdown under lib/sysprompts/ (one place, no escaping
// hazards in TS string literals). Read each once at module load. next.config.ts's
// outputFileTracingIncludes bundles the .md files into the /api/chat function on Vercel.
// SERVER-ONLY: readFileSync at module scope — never import this from a client component.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const load = (name: string) => readFileSync(join(process.cwd(), "lib/sysprompts", name), "utf8");

export const DESK_AGENT_PROMPT = load("desk-agent.md");
export const GROK_SCAN_PROMPT = load("grok-scan.md");
