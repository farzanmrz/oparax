# Voice-extractor lab notes (#99, historical Workbench phase)

This file describes the original Workbench-only loop and is retained as history. The measured pipeline, benchmark, frozen 93.71% no-extractor control, current downstream prompt, and next extractor iteration now live in `filtration-eval/README.md`. Do not resume from `system-prompt-v1.md`.

Companion-session log for Workbench prompt iteration. Lab-only — nothing here
is app code. When the prompt converges, the owner pastes the settled system
prompt + output shape as a comment on #99; that comment is the spec of record.

## Paste-ready pieces

- System box: `system-prompt-v1.md` (iterate here, bump the version per revision)
- User message: `workbench-user-message.txt` (regenerate: `node dump-corpus.mjs message`)

## Loop

1. Owner runs the pair in Workbench (billed to console credits).
2. Owner pastes the model's guide output back into the companion session.
3. Session audits: byte-fidelity of every example against `corpus-snapshot.jsonl`,
   total char count vs the ~4–6K target, section headings vs the parser contract,
   trigger-rule coverage vs the judge-correction evidence (🚨/❗️ opener, curly
   quotes, blank-line breaks, @handle placement, hashtag + emoji closer, mode choice),
   off-beat leakage into rules/representative posts.
4. Revise `system-prompt-vN.md`, log the delta below, repeat.

## Constraints discovered (carry into wire-back)

- `## Beat & Scope` must stay in the output: `extractBeatSpec(guide_raw)`
  (lib/voice/deploy-guide.ts:33) still feeds the drafter/judge `beatSpec`, and
  `deployGuide()` strips the section before rules materialize. Dropping it from
  the lean guide would orphan beat filtration.
- Measured facts are NOT in the lab input (user message is reporter/beat/corpus
  only) and NOT written by the model — code appends the block to the guide
  after extraction. The system prompt therefore never references a facts block.

## Iteration log

- v1 (2026-07-31): initial lean draft from issue #99 decision 4 — four output
  sections (Beat & Scope kept for beatSpec, Identity, 10–15 trigger rules with
  verbatim evidence, 8–10 representative posts), no tools, no absence ceremony,
  under-6K target. Untested in Workbench.
