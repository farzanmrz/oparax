---
name: build
description: "Build one component of an approved Oparax plan in that component's worktree, one commit per numbered step, owner-triggered only. Use only when the owner explicitly types /build <N> <component> in Claude Code. Mode picked from files: AMEND (a pending amendment naming the component), FIX (a pending QC fix list for it), else BUILD (its plan slice). Never invoke automatically during other work."
argument-hint: "[issue #] [component]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Skill Write Read Edit Grep Glob
model: inherit
disable-model-invocation: true
---

# Build (Claude Code entry point)

The build skill is one file shared with Codex (`$build <N>` there) and Claude Code (`/build <N> <component>` here). Read `.agents/skills/build/SKILL.md` in this repository now, whole, and follow it exactly as written for issue N and that component, in this session. Its shell blocks are the mechanics (`git`, `gh`, the Supabase MCP tools); its mode rule decides BUILD, AMEND or FIX; one commit per step with the trailers, the decision log, then stop, is the contract. Nothing else in this file: the canonical skill is the whole instruction.

Two differences in mechanics only, never in behavior:

- Where the canonical file names Codex-native invocation (typing `$name`, e.g. `$vercel:nextjs`, `$supabase:supabase`, `$posthog:instrument-llm-analytics`), the Claude Code equivalent is the `Skill` tool called with the same skill names (`vercel:nextjs`, `supabase`, `posthog:instrument-llm-analytics`, etc.). Invoke exactly the skills a step names, in the Skill-tool form, and no others.
- This session sits in the main checkout, so every command runs against the component's worktree: read its path from `.feature/run-<N>.json` (the component's `worktree` and `plan_section`), then use `git -C <worktree>` and `pnpm -C <worktree>` and edit files under that path. The worktree and its branch must already exist (the launcher creates them, `python3 .claude/scripts/build-launch.py launch ...` with `--dry-run` if only the worktree is wanted); this skill never creates a worktree or a branch.
