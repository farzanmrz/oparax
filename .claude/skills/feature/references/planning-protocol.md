# Planning protocol after plain approval

Applies to a feature plan and to amend mode. The owner and the planning host settle scope and approve the plain plan with no peer calls. After that, Fable and Astra High each draft the whole detailed plan (or amendment) independently, compare and settle one result; the fixed critique reviews it; then each dispositions the full findings corpus independently and they settle the edits jointly (owner, September 29). The Astra critique lane is a fresh reviewer, not the planning partner.

## Inputs and independence

Keep the owner's original messages and corrections apart from your interpretation, and do not smuggle a preferred technical answer into the shared brief. Each brief names by exact path the approved plain plan, the repository source to ground in, the selected skill rules with their paths and the required output: for a feature, the component table, `shared.md` and every slice; for an amendment, one complete amendment plus the existing table, `shared.md`, affected and caller slices, earlier amendments and the applied fix commits as settled context. Never send secrets or environment values.

For adjudication the brief carries the approved plain plan, the complete detailed plan, every terminal finding and the recorded owner decisions. Each partner writes its own dispositions before seeing the other's; a dead lane supplies nothing.

When the host is Fable or Astra, it writes its own draft or dispositions to a private file first and passes it as `--host-draft`, which the helper seals and never shows the partner unasked. A Codex host on another model starts separate Fable and Astra runs from the same neutral inputs and never labels its own work as either model's.

## Bounded calls

`.claude/scripts/planning-peer.py` runs the model named by `--partner fable|astra` at high effort, read-only with no connectors, for `--phase detail|adjudication`, hashing its inputs and stopping at 900 seconds. A failed or timed-out call is a failure, never an answer from partial output. Use a fresh run directory under `.feature/planning-<id>/` per partner and phase; the briefs and host drafts sit beside it as its sealed inputs. No call writes plan files.

```bash
python3 .claude/scripts/planning-peer.py start .feature/planning-<id>/detail-astra --repo "$PWD" --owner-plan .feature/plan-owner.md --brief .feature/planning-<id>/detail-brief.md --host-draft .feature/planning-<id>/detail-fable.md --partner astra --phase detail
python3 .claude/scripts/planning-peer.py wait .feature/planning-<id>/detail-astra --seconds 30
python3 .claude/scripts/planning-peer.py result .feature/planning-<id>/detail-astra
```

An Astra host passes its own draft with `--partner fable`. In amend mode `--owner-plan` is `.feature/amend-<N>-<R>-owner.md`. Adjudication uses `--phase adjudication` and new run directories; never reuse detail sessions.

## Settling

Compare the component cut and file ownership first, then seams, numbers and caps, then slices or steps. Check paths and contracts against source and costs against `docs/references/cogs.md`. You may settle a documented technical point from source; a change to approved product behavior goes to the owner at the named stop. After critique both partners must explicitly agree on every disposition and edit; silence or a timeout is not agreement, and an unresolved point stays open with its evidence.

`reply` resumes the exact partner session for one specific question, with a message file holding `Question:`, `Evidence:` and `Resolution sought:` and only the relevant quote from the other answer. Continue only while new evidence or a real disagreement needs it.
