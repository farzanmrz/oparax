---
name: build
description: "Build one component of an approved Oparax plan in the feature checkout, one commit per numbered step, owner-triggered only. Use only when the owner explicitly types /build <N> <component> in Claude Code. Mode picked from files: AMEND (a pending amendment naming the component), FIX (a pending QC fix list for it), else BUILD (its plan slice). Never invoke automatically during other work."
argument-hint: "[issue #] [component]"
allowed-tools: Bash(git *) Bash(gh *) Bash(pnpm *) Bash(python3 *) Skill Write Read Edit Grep Glob
model: inherit
disable-model-invocation: true
---

# Build (Claude Code entry point)

The build skill is one file shared with Codex. Read `.agents/skills/build/SKILL.md` in this repository now, whole, and follow it for issue N and that component. A manual invocation follows its section 0: it launches the leased Astra High worker and does not implement the code on this host's model.

One difference in mechanics: where the canonical file names a Codex `$name` invocation (`$vercel:nextjs`, `$supabase:supabase`), use the Skill tool with the same name (`vercel:nextjs`, `supabase`). `vercel:shadcn` means the official global `shadcn`; do not load both.
