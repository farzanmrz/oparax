// The system prompts live as markdown under lib/sysprompts/ (one place, no escaping
// hazards in TS string literals). Read each once at module load. next.config.ts's
// outputFileTracingIncludes bundles the .md files into every serverless function that
// transitively imports this module — see .claude/rules/agent.md for the current list.
// SERVER-ONLY: readFileSync at module scope — never import this from a client component.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const load = (name: string) => readFileSync(join(process.cwd(), "lib/sysprompts", name), "utf8");

export const DRAFT_FILTER_PROMPT = load("draft-filter.md");
export const DRAFT_SYNTHESIZE_PROMPT = load("draft-synthesize.md");
export const STORY_GROUP_PROMPT = load("story-group.md");
export const ALERT_JUDGE_PROMPT = load("alert-judge.md");
export const ALERT_ECHO_PROMPT = load("alert-echo.md");
export const SOURCE_ONBOARDING_PROMPT = load("source-onboarding.md");
export const SOURCE_RESOLVER_PROMPT = load("source-resolver.md");
export const BEAT_GATE_PROMPT = load("beat-gate.md");
