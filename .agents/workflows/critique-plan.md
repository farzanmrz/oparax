---
description: Critique the current feature plan against the actual repo code, and write the verdict to a file the Claude/Codex plan session picks up.
---

# Critique the pending plan

A manual second opinion on a plan that is waiting at its ✋ gate. This exists so a
GUI-only surface can join the council **without any orchestration** — no wrapper, no
tmux, no schema binding. The handoff is two files on disk, which is the same durable-state
pattern that makes the Codex↔Claude phase hops work.

1. Read the brief. It is the newest `.feature/critique-*.in.txt` — the plan phase already
   wrote it, and it contains the full plan plus the grounding pack (the distilled
   `.claude/rules/*.md` guards for the paths this slice touches).
2. Read `AGENTS.md` — in particular **Settled decisions**. A critique that re-litigates a
   settled decision without a NEW fact is noise, and will be rejected at adjudication.
3. Work **requirement by requirement**, and verify every claim against the code as it
   exists in this working tree right now. Cite `file:line`. Do not trust the plan's own
   description of the code.
4. Judge: correctness, cross-file contract breaks, missing acceptance criteria, convention
   violations, security (authz, injection, secret/token handling, trust boundaries),
   concurrency, error paths. Flag anything the plan assumes that the code contradicts.
5. An empty list is a valid verdict — but only after you have actually worked every
   requirement. Say which ones you checked.

Write the result to `.feature/critique-manual.out.md` as a numbered list: each item gets
`file:line`, one technical sentence, and one plain-terms sentence. Then say in chat that
the file is written, and stop.

The plan session adjudicates it exactly like a CLI lane's output — on merits, with
plan-frozen decisions as vetoes.
