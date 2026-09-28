---
name: run-plan
description: "Start, check, stop or resume the overnight run of an approved oparax plan: the script .claude/scripts/run-plan.py builds, reviews and merges every component of .feature/plan-<N>.md on its own and leaves one morning list. Use only when the owner explicitly types $run-plan <N>, $run-plan <N> status, $run-plan <N> stop or $run-plan <N> resume in Codex. Never invoke automatically during other work."
argument-hint: "<issue #> [status|stop|resume]"
---

# Run (Codex entry point)

The run skill is one file shared with Claude Code (`/run-plan <N>` there, `$run-plan <N>` here). Read `.claude/skills/run-plan/SKILL.md` in this repository now, whole, and follow it exactly as written for issue N, in this session. Its one shell block is the mechanics (`python3 .claude/scripts/run-plan.py`); the script decides what runs and when; this session only starts it, shows its status, stops it or resumes it. Nothing else in this file: the shared skill is the whole instruction.
