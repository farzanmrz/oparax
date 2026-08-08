# Cline lane lessons

Read by every cline invocation: `plan-cline.sh` prepends this file, if
present, right after `.cline/oparax-critic.md`. This is NOT a Cline "memory
bank" in the six-file sense (projectbrief/productContext/systemPatterns/
techContext already exist here as `AGENTS.md` and `DESIGN.md`, which Cline
loads on its own — duplicating them here would violate this repo's own
single-source-every-fact rule). The one thing worth carrying between one-shot
review lanes is narrower: corrections to mistakes a lane already made.

**Written by `ft-find` phase 5 and `ft-spec` phase 6** — inline,
synchronous, zero-dispatch appends via
`.claude/skills/ft/scripts/cline-lesson.sh`, done by the session that
already holds the adjudication verdict. Never edited by hand mid-round, and
never a place to park a general reminder — that belongs in the profile
(`.cline/oparax-critic.md`) or AGENTS.md instead.

**What qualifies:** a cline finding or critique that was wrong specifically
because it contradicted something already documented — AGENTS.md, DESIGN.md,
a plan-frozen veto, a dormant-by-design capability — not a lane's taste, and
not a real observation that was merely out of scope for the slice (that is
not a cline mistake, so it is not a lesson). Weigh each entry as "a past
reviewer got this wrong here," not as a standing rule that a similar-looking
future observation is automatically wrong too — a lesson that hardens into a
blind spot is worse than the repeat finding it was meant to prevent.

**Rolling, capped at 8 entries** — oldest drops off on append. This file is
deliberately kept too small to ever need its own subtractive pass.

<!-- LESSONS (most recent last) -->
