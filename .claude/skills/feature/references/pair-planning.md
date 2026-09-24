# Fable and Codex planning protocol

Read this once when /feature or /amend starts. Both use the same planning collaboration; /amend scopes it to an addition on the existing issue and branch. QC has its own review flow.

## Roles and independence

- **One conversation:** The host talks to the owner, loads skill bundles, writes files, and launches the peer. The default pair is Fable and Astra (`gpt-6-astra`), high effort, throughout both /feature and /amend. Fable hosts in Claude Code; Astra hosts in Codex. Record `pair-model: astra` in the working directory and pass `--pair-model astra` on every start, including after compaction. An initial `Astra` token remains accepted but is redundant. Only an explicit owner request for Sol changes routine pairs to `gpt-6-sol`; detail and substantial redesign always use Astra. With that override, record `pair-model: sol` and use Sol as the Codex host for routine phases. Critique models are independent of this selection. Never label one model as another. If the required model is unavailable, report that failure rather than silently substituting it.
- **Independent first:** Before starting a pair, the host writes its own complete answer to a private draft. The peer gets the original owner input and shared assignment, never the host draft. Neither reads the other's answer until `exchange` succeeds. Do not open raw output, answers, other sessions or private drafts to get around this boundary. This is a cooperative workflow boundary, not an operating-system security boundary.
- **Product approval:** The plain-language plan locks the user experience, owner choices, and real constraints. Keep implementation choices open unless the owner explicitly decided them, so the detailed planners can independently design the solution.
- **Shared facts:** Both get the same owner request, approved decisions, supplied design, relevant source references, applicable skill guidance and task. Keep the original owner input in its own file, copied directly from actual owner messages, not an assistant summary. Preserve references, uncertainties and corrections. Put any dictation interpretation outside the original quote. When a reply depends on a question, include that question separately, clearly labeled as assistant context, not an owner decision. Label assistant proposals as proposals. Do not put the host's preferred solution, private draft, or private critique into an independent brief. An approved user experience is a shared requirement, not contamination.
- **Fresh phases, continuing exchanges:** Scope, visual review, plain-plan checking, detailed planning and adjudication start fresh peer sessions with separate run directories. Exchanges inside a phase resume that phase's exact session ID. Earlier discussion deliberately informs approved requirements, but never copy another phase's private drafts or debate into a new independent brief. The host retains its conversation; independence means authoring before seeing the peer's answer, not pretending it forgot the owner discussion. Do not include speculative implementation ideas or either planner's private drafts in a fresh detail brief. In adjudication, share the combined detailed plan and recorded decisions, not either partner's proposed dispositions.
- **Equal authority:** The host is the scribe, not the deciding vote. Both can challenge omissions and technical choices. Agree on evidence and recorded owner decisions. Never claim agreement from silence, a timeout, or an ambiguous reply. A real product tradeoff goes to the owner; unresolved technical claims stay explicitly unresolved until supported, not disguised as approved build steps.

## Shared inputs

The host chooses its normal tools to understand the references, without a required browser, screenshot or visual-probe stage. Give the peer the original owner input and detailed reference observations, keeping interpretation and recommendations separate. The peer may research the original links itself and challenge the observations or assumptions. Do not pass a preferred answer disguised as a neutral assignment. A later owner correction must reach the peer before the affected recommendation is presented as joint. Batch ordinary answers into the next useful exchange instead of calling a model after every sentence.

Keep a fresh directory `.feature/pair-<unique-id>/` for each feature or amendment, never reuse a previous planning run's directory. Keep an `owner-input.md` containing the original owner messages and corrections. Create a separate brief and host draft for each phase outside that phase's run directory. The runner snapshots and hashes the owner input, brief, host draft and supplied images before launching. Include these parts in each brief:

- **Owner input:** Supply the separate unedited record with `--owner-input`. The helper snapshots and passes it ahead of the assignment, including for detail and adjudication. Do not replace it with the brief.
- **Approved decisions:** Only choices the owner actually made, including scope and design source.
- **Open questions:** Unresolved choices, with no favored answer smuggled in.
- **Shared references:** Exact relevant source paths, the same detailed-plan format where applicable, and applicable skill rules with their source paths. Copy supplied artifacts or name them explicitly. Do not send secrets or environment files.
- **Assignment:** What this phase must produce, its scope, and the same constraints used by the host.

Load bundles once in the host as step 3 prescribes. Pass the rules that actually constrain the feature to the peer with source attribution, including Claude-only guidance if applicable. The peer can consult available equivalent skills or the named source documents. Skill availability differences must not silently give the planners different requirements.

## Commands and state

Use the same helper in either application. For a Claude Code host:

```bash
python3 .claude/scripts/feature-pair.py start .feature/pair-<id>/scope-01 --repo "$PWD" --owner-input .feature/pair-<id>/owner-input.md --brief .feature/pair-<id>/scope-brief.md --host-draft .feature/pair-<id>/scope-fable.md --host fable --phase scope --pair-model astra
```

The required `--phase` and recorded `--pair-model` select the peer. The helper defaults to Astra and accepts any capitalization of the pair-model flag. The table below is the default for both commands; an explicit Sol override changes only scope, plain, design-review and adjudication. It never changes the critique lanes:

| Phase | Claude Code host | Peer model | Effort |
| --- | --- | --- | --- |
| `scope` | Fable | `gpt-6-astra` | high |
| `plain` | Fable | `gpt-6-astra` | high |
| `design-review` (optional) | Fable | `gpt-6-astra` | high |
| `detail` | Fable | `gpt-6-astra` | high |
| `adjudication` | Fable | `gpt-6-astra` | high |
| `redesign` (exception only) | Fable | `gpt-6-astra` | high |

For the detail round use the same `start` command with the detail paths and `--host fable --phase detail`; its cross-review and combined-plan verification remain in that Astra session. For scope, plain and adjudication, use their matching phase names. The helper records the phase and selected model in progress output. Replies keep the recorded peer and exact session ID; there is no model change on resume and no fallback model.

For a Codex host, use the selected partner as `--host` for routine phases and `--host astra` for detail or an exceptional redesign. With the default routing the host remains Astra throughout either command. The peer is `claude-fable-5`, high effort. The host's actual model must match its label; the helper rejects incompatible host/phase combinations. Host model selection is controlled by the application, not the helper. Existing saved runs retain their original peer and exact model on resume; start a fresh phase to adopt the new routing. The default hard deadline is 900 seconds per call. The first call returns immediately, after starting a detached worker. `STARTING` confirms the worker was dispatched, not that the model has answered.

```bash
python3 .claude/scripts/feature-pair.py wait .feature/pair-<id>/scope-01 --seconds 30
python3 .claude/scripts/feature-pair.py status .feature/pair-<id>/scope-01
```

- **STARTING or RUNNING:** Continue independent work or another bounded wait. Give concise progress updates while waiting. Do not end the feature turn merely because a model is working.
- **READY:** A successful CLI exit, completed answer, valid JSON payload and session ID have been verified. Now open the exchange.
- **FAILED, TIMED_OUT or CANCELLED:** Do not proceed as though both participated. Report the concrete state. Fix a mechanical launch problem and retry once in a new directory with the same sealed inputs. Never overwrite the failed attempt or wait forever. If that retry fails, stop with the blocker and retain the work for recovery.
- **ERROR:** The requested operation was refused, for example because a run already exists, inputs changed, or a reply was sent before the exchange opened. Correct the operation; this is not a model verdict.

```bash
python3 .claude/scripts/feature-pair.py exchange .feature/pair-<id>/scope-01
```

This prints both saved answers and records that the exchange is open. It is refused until the peer answer is complete. Do not read `.feature/pair-<id>/.../raw-*.json`; the runner alone extracts answers. Failure diagnostics may read the named stderr/worker log, not partial model prose as a substitute answer.

For visual input, add repeatable `--image /absolute/path/render.png` arguments to `start` or `reply`. The helper snapshots and hashes the images and attaches them to both initial and resumed Codex calls; a Fable peer reads the explicitly named files using Read. Images are optional for researching inspiration references, but REQUIRED for `design-review`: Codex must see the actual generated design. A revised design must be passed back with its updated images. Descriptions, source files and preview links supplement those images, never replace them.

The CLI peer remains `read-only`. Do not run browser capability probes or add a browser requirement to the feature. The host handles reference research using its ordinary available tools and passes substantive details automatically. Include what the reference contains and does, how capability is presented, layout, hierarchy, visual character and interaction when known, plus uncertainties and source links. Keep factual descriptions separate from inferred intent and from the host's own solution. For inspiration research, pass available images or artifacts when useful without making capture a prerequisite. Generated-design review follows the required image handoff above. The peer can ask for missing details in a bounded exchange; the owner does not shuttle files or configure browser tooling.

Write the host's response to the peer's objections and its objections to the peer's answer into a message file, then:

```bash
python3 .claude/scripts/feature-pair.py reply .feature/pair-<id>/scope-01 --message .feature/pair-<id>/scope-response.md
python3 .claude/scripts/feature-pair.py wait .feature/pair-<id>/scope-01 --seconds 30
python3 .claude/scripts/feature-pair.py exchange .feature/pair-<id>/scope-01
```

The first reply automatically includes the sealed host draft, so the peer now sees both. Subsequent replies use the same explicit session ID. No `--last`, `--continue`, automatic fresh-session fallback or guessed IDs. While a reply runs, the run cannot accept another reply. Inputs and completed answers are immutable; corrections go into a new message. Recovery after host compaction starts with `status` on the recorded run, never a duplicate `start`.

## Exchange and convergence

Use one cross-review round, then one verification of the proposed combined result. A third follow-up is available only to settle a specific remaining objection; the helper refuses further turns. A new screen comes from the owner's Claude Design export, per feature step 1.1. This is a maximum, never a quota to fill.

1. **Cross-review:** The host reads the peer's independent draft, writes its objections, and asks the peer to review the host's sealed draft and respond. Preserve both originals. Do not attach a supposedly settled combined candidate to this first cross-review: hear the peer's objections before declaring the resolution. Do not maintain two revised plans.
2. **Combined proposal:** After the peer replies, the host writes one candidate result and a short decision record: each material disagreement, the chosen resolution, its evidence/reason, and any unresolved owner choice. Send the exact candidate text and decision record to the peer. Ask it to confirm the resolution is faithfully represented or identify a specific remaining objection. The host must also check it; writing it is not approval.
3. **Close:** A candidate both explicitly support becomes the result of this phase. If an objection remains, use the final follow-up to resolve it and check the corrected candidate. If it remains unresolved, tell the owner the practical consequence and recommended next decision; do not force consensus. Never present unapproved behavior as locked. Trivial wording changes do not need another exchange.

For initial scope discussion, the candidate can be a few questions and options rather than a full plan. For the plain-plan check it is the owner document in the invoking skill's format. For detail it is that skill's detailed plan or amendment and the decision record. For adjudication it is the dispositions and proposed edits, not another fresh implementation plan.

## Placement in /feature and /amend

The step numbers and document paths in the list below are feature's. For amend, use the mapping and document formats at the end of this section.

- **Step 1, scope (Fable + selected partner):** Before presenting the first suggested approach, save the owner's request, write the host's own brief assessment (missing questions, useful options, proposed slice), and run `scope-01`. Exchange only after the two assessments exist. Then discuss with the owner in the existing short product-language format. Do not ask the owner twice or relay an entire model debate. A factual clarification can be asked before the pair if needed to understand the request at all. A materially changed request gets a new scope round; ordinary answers do not trigger a call after every sentence.
- **Steps 2 and 3, plain plan (Fable + selected partner):** Draft the five-section plan and load the selected bundles. Before step 4 approval, start `plain-01` with the shared requirements and skill constraints, not the host's draft. The peer independently proposes the owner plan. Exchange, produce one combined plain plan, and then ask the owner to approve that exact document. This catches differences in product thinking while changes are still cheap.
- **Step 5, detail (Fable + Astra):** After owner approval, start `detail-01` with the approved plain plan and the required technical format in the brief. The host seals its own complete detailed plan first. The peer independently produces its complete plan. Exchange and verify one combined plan before writing `.feature/plan-draft.md`. The old two drafts remain as working evidence only; build consumes the combined file. Changes to approved user behavior need an owner decision before being treated as requirements.
- **Step 6, adjudication (Fable + selected partner):** Run the critique lanes specified in feature step 6: Sol, Astra, Gemini Pro, Gemini Flash, Grok, Kimi K3, GLM 5.2 and Muse Spark, plus the Claude Opus lane when Claude Code hosts. Each is a fresh review session; the Astra reviewer does not resume the planning session. Terra participates only in QC. Planning partner selection never changes these five reviewers. As findings arrive, the host can prepare its own dispositions privately. After all lanes are terminal, seal those dispositions and start `adjudication-01` with the same complete findings corpus, plan and owner decisions. The peer independently accepts or drops each finding, with reasons, without seeing the host's dispositions. Exchange and verify the joint dispositions plus intended edits before changing either plan. Retain the existing evidence standard and conditional fresh outside-eye review for newly composed mechanisms. That outside-eye check must run after the pair has settled its proposed edits, before applying them. It does not change the selected partner.

- **Substantial redesign exception:** Start a fresh redesign pair only when a verified critique overturns a central approach or contract in the agreed detailed plan and a replacement must be designed. Ordinary corrections, wording, accepted findings and disagreements already settled by source evidence stay with the current adjudication pair. Record the specific finding and why it requires redesign, then start a new `redesign-01` round with `--phase redesign --reason "<specific design change>"`. Fable and Astra independently propose and reconcile that replacement; keep the scope to the affected design. Send the result back to the selected adjudication pair to finish the dispositions. Changes to approved product behavior still require the owner's decision. Never add a redundant final Astra audit on top of this flow.

Step 7 remains the owner's final approval checkpoint. Steps 8 and 9 create the issue and branch only after final approval, then the host launches the selected build through the separate build-handoff procedure. The planning peer never dispatches build, QC, amend or ship. Build model selection defaults to Sol High and is independent of the planning pair. A design-generation yes or visual approval does not approve issue creation. The `.feature/` working records remain local and are cleaned with the existing feature working files at finalize.

For /amend, map the same phases to its steps: scope in step 2, plain in step 3 after bundle loading and before owner approval, detail in step 4 after approval, then the same lane critique and paired adjudication. Both receive the existing plan, earlier amendments and applied fixes as settled context, and independently design only the requested addition. Use amend's two-part owner document and detailed amendment format. Write the combined result to `.feature/amend-<N>-<R>.md`; do not replace the base plan. Amend retains its existing issue/branch, final presentation and manual build handoff. The feature-only issue-creation and automatic build handoff above do not apply to amend.
