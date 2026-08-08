// The system prompts live as markdown under lib/sysprompts/ (one place, no escaping
// hazards in TS string literals). Read each once at module load. next.config.ts's
// outputFileTracingIncludes bundles the .md files into every serverless function that
// transitively imports this module — see .claude/rules/agent.md for the current list.
// SERVER-ONLY: readFileSync at module scope — never import this from a client component.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const load = (name: string) => readFileSync(join(process.cwd(), "lib/sysprompts", name), "utf8");

export const VOICE_EXTRACT_PROMPT = load("voice-extract.md");
export const DRAFT_COUNCIL_CONTRACT = load("draft-council-contract.md");
export const DRAFT_REVISE_PROMPT = load("draft-revise.md");
export const DRAFT_TRANSLATE_PROMPT = load("draft-translate.md");
export const DRAFT_WRITE_PROMPT = load("draft-write.md");
export const STORY_CLUSTER_PROMPT = load("story-cluster.md");
export const SOURCE_ONBOARDING_PROMPT = load("source-onboarding.md");
