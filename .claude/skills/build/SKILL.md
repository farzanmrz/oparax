---
name: build
description: "Build (or fix) an oparax feature slice on its ft/<N> branch from the issue's detailed plan, owner-triggered only. Use only when the owner explicitly types /build <N> in Claude Code. Two modes, picked automatically: BUILD mode implements the detailed plan's build steps and commits once; FIX mode applies the fix list the /qc round left in .feature/fixes-<N>.md, runs tsc, commits, posts the QC round marker, and ends with a plain walk-through of what the owner checks before /ship. Never invoke automatically during other work."
argument-hint: "[issue #]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Skill Write Read Edit Grep Glob
model: inherit
disable-model-invocation: true
---

# Build (Claude Code entry point)

The build skill is one file shared with Codex (`$build <N>` there) and Claude Code (`/build <N>` here). Read `.agents/skills/build/SKILL.md` in this repository now, whole, and follow it exactly as written for issue N, in this session, with the owner watching. Its shell blocks are the mechanics (`git`, `gh`, the Supabase MCP tools); its mode logic decides BUILD, AMEND, or FIX; one commit at the end, then stop, is the contract. Nothing else in this file: the canonical skill is the whole instruction.

One difference in mechanics only, never in behavior: where the canonical file names Codex-native invocation (typing `$name`, e.g. `$vercel:nextjs`, `$supabase:supabase`, `$posthog:instrument-llm-analytics`, `$use-railway`, and so on), the Claude Code equivalent is the `Skill` tool called with the same skill names (`vercel:nextjs`, `supabase`, `posthog:instrument-llm-analytics`, etc.). Invoke exactly the skills a step names, in the Skill-tool form, and no others.
