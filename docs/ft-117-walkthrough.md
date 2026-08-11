# The feature flow, and how #117 would run through it

Three parts: the flow in general, what #117 actually asks for, then the session-by-session simulation.

## Part 1 — the flow in general

One slice = one issue, one `ft/<N>` branch, one squash commit on `beta`. The design rule behind every boundary: **stages split where the required participant changes.** Fable judges (gate, judge); Codex authors and labors (spec, build, qc, fix); you gate product and walk the result. Every phase ends with a copyable handoff command telling you the next app, model, and skill — models are recommendations in the handoff text, never enforced by guards.

| Phase | Command | App and model | What it produces | What you do |
|---|---|---|---|---|
| 1 Plan | `/ft-plan` | Claude Code, **Opus 4.8** | stub issue: bullets, journeys, Decided, Notes dossier | converse, then say yes to the stub |
| 2 Spec | `/ft-spec N` | Codex, **gpt-5.6-sol high** | `.feature/spec-N.md` + grok critique (background) | trigger it, walk away |
| 3 Gate | `/ft-gate N` | Claude Code, **Fable 5 if the spec has UNSURE flags, else Opus 4.8** | approved decisions on the issue, `ft/N` branch cut | answer the product questions in plain language, approve the walkthrough |
| 4 Build | `/ft-build N` | Codex, **gpt-5.6-sol high** | implemented, self-verified branch (incl. its own screenshots) | trigger it, walk away |
| 5 QC | `/ft-qc` | Codex, **gpt-5.6-sol high** | `.feature/qc-r1-findings.md` (review + grok lane + journey browse + DB evidence) | trigger it, walk away |
| 6 Judge | `/ft-judge N` | Claude Code, **Fable 5 high** | adjudication, gap hunt, `.feature/qc-r1-briefs.md` | answer any decision-shaped findings it asks you live |
| 7 Fix | `/ft-fix N` | Codex, **gpt-5.6-sol high** | fixes applied, gates green, ONE issue comment `## QC round 1: done` | trigger it, walk away |
| 8 Walkthrough | — | you, on `localhost:3000` | your verdict | click through the spec's walkthrough; anything wrong = tell any session (patch round via `/ft-fix`) |
| 9 Ship | `/ft-ship N` | either app | squash on `beta`, promote to `main` | say ship; later check production and close the issue yourself |

Where your attention is actually required: phases 1, 3, 6, 8, and the final production check. Phases 2, 4, 5, 7 are fire-and-forget Codex sessions. If you ever lose track of where a slice stands, `/ft <N>` in Claude Code detects the position from the branch, the `.feature/` files, and the one marker, and hands you the next command.

Two more rules that matter day-to-day:

- **Scope:** anything an agent notices mid-flight that is not the slice stays off the branch. Anything YOU report during the walkthrough is never scope creep and lands before ship.
- **QC rounds:** round 2 only happens if the walkthrough or a patch round surfaces enough to warrant re-collection. The old 4-5-round loop is structurally gone because judging (Fable) and collecting (Codex) are separated, and fix executes briefs instead of re-deciding.

## Part 2 — what #117 actually is

**My reading of the issue as filed:** the drafter stops always producing one standalone post and instead chooses a format per item — **repost** (source post + one-tap action, no drafted text, no drafting call billed), **commentary** (today's single post), **thread** (ordered segments, each within the character ceiling), or **skip** (off-beat, unchanged). The economics are the point: ~400 drafts/day on one desk at a ~1% acceptance rate means most drafting spend is waste, and a repost costs zero model calls and one glance to review.

**The word "thread" in this issue means OUTPUT threads** — the reporter's own multi-post chain, segment 2 replying to segment 1 via the X API. It is **not** ingest-side threads (a source account posting a chain that the extractor should read as one story before drafting). Your description of 117 ("tweet threads where one post links to another... massive shift for extractor") blends both. Flag: if you also want source-thread comprehension, that is a **separate slice** the plan session should stub — and a code-grounded scan confirms how separate it is: the ingest stream rule actively excludes replies and quote tweets at the X API (`ingest/src/rules.ts:88` appends `-is:retweet -is:quote -is:reply`), the stream never even requests `referenced_tweets`/`conversation_id`, `source_posts` has no column that could carry a post-to-post relation, the drafter receives exactly one post's translated text, and the feed UI hard-selects the first source of a story and drops the rest (`lib/agent/feed-query.ts:301`). Source-thread comprehension therefore starts at the ingest worker and the schema, not in the drafter — genuinely a different slice that shares vocabulary with #117 and nothing else. Worth settling in the plan conversation before spec.

**The pieces the issue already names (its Notes dossier is well grounded, with file:line anchors):**

- **Drafter contract:** `draftVerdictSchema` in `lib/agent/draft-write.ts` has `draft: string | null` as the whole format decision today; a repost verdict would currently be rejected as unusable. Needs a discriminated union so a verdict cannot be both a repost and carry draft text.
- **Storage:** `drafts.text` is `NOT Null`; a repost has no text. Nullable + a `format` column, not a sentinel string.
- **X API surface:** `lib/x/api.ts` only has `createTweet`. Repost needs the retweet endpoint; thread needs reply-chaining. **OAuth scope for retweet must be verified before spec commits** — a scope gap found after the drafter change strands the slice.
- **Partial-thread failure:** a thread that half-posts and re-enters is the worst failure; claim/release machinery needs an explicit decision.
- **Slack card:** the single-button card becomes per-format, colliding with #74 (rich Block Kit card) — spec must fold or sequence, not build the card twice. (#75's "thread" is Slack threading, unrelated.)
- **Feed UI:** ordered segments need a rendering template that does not exist — this is your "no template for nested posts" concern, and it is real.
- **Cost ledger:** reposts and per-segment thread posts need their own `X_POST_COST_USD` rates.

**The dependency:** the issue says the behavior-corpus stub lands first — that is **#116** ("Learn what the reporter reposts, not just what they write"). Without measured repost behavior, format triage is the model guessing, and the issue itself says a wrong format is worse than a mediocre draft. So the honest ordering is #116 through the flow first (or a deliberate descope decision).

**What actually needs readjusting:** less than you think. The body is already in the new stub shape (bullets, Today/After table, journeys, Decided, Notes). The plan session should: (a) settle the #116 ordering, (b) settle output-threads vs ingest-threads scope, (c) decide whether threads ship in this slice at all (the issue itself flags "repost first, threads later" as a defensible cut — repost is high-frequency low-risk; threads carry the partial-post failure and most new API surface), (d) add the "design in Claude Design first" owner step for the segment-rendering UI, since it is genuinely new UI with no existing template, (e) retag `OWNER-MANUAL` journeys to `OWNER`.

## Part 3 — the simulation, session by session

**Session 0 — Claude Code, Opus 4.8: `/ft-plan` (re-validate the stub).** Short conversation, not a rewrite. The four decisions above get settled with you; the stub is edited in place on #117 (and possibly a new stub filed for ingest-threads). If the verdict is "#116 first", the same session hands you `/ft-spec 116` instead and 117 waits. Exit: a copyable `/ft-spec 117` handoff.

**Session 1 — Codex, gpt-5.6-sol high: `/ft-spec 117`.** Codex grounds in the code, probes reality (the X retweet endpoint + scope question gets answered HERE, live, not assumed), consults the path-mapped skills, writes `.feature/spec-117.md` with product decisions, input space, journeys, your walkthrough script, and build steps, then fires the grok critique in the background and stops. Its exit line tells you how many UNSURE flags the decision list carries — that picks your next model.

**Session 2 — Claude Code, Fable 5 (if UNSURE flags) or Opus 4.8: `/ft-gate 117`.** This slice will almost certainly carry UNSURE flags (schema union vs `NoObjectGeneratedError` risk, thread claim semantics), so expect Fable. It judges the spec's decisions against the code and grok's critique, then presents to you in plain language only: what the reporter experiences per format, what happens for each input class, and the exact walkthrough you will later click. You push back or say yes; it composes the approved body onto #117 and cuts `ft/117`. Expect real product questions here — e.g. "when the source post is deleted before the reporter taps repost, the card says X — approve the copy?"

**Session 3 — Codex, gpt-5.6-sol high: `/ft-build 117`.** Implements the spec inline, checkpoint-commits per task, boots :3000, drives the changed paths, screenshots the new card and feed at both viewports and judges them against `DESIGN.md`, lint-sweeps its own diff, stops. You do nothing.

**Session 4 — Codex, gpt-5.6-sol high: `/ft-qc`.** Gates script, native deep review + grok lane in parallel, then drives every `QC-LIVE` journey from the approved decisions in the built-in browser with the real inputs — including the nasty ones (repost on a deleted source post, thread segment over the ceiling, desk with zero repost history). DB assertions (the repost stored no text, the format column is right) are captured via supabase-runner BEFORE any fixture teardown. Product: `.feature/qc-r1-findings.md`. Note: the two `OWNER` journeys (real repost on your timeline, real thread with real spend) are yours, later — QC never spends your money.

**Session 5 — Claude Code, Fable 5 high: `/ft-judge 117`.** Adjudicates every finding, then hunts what the lanes missed — on this slice the hunt targets are obvious: the claim/release path for partial threads, the posting authorization boundary (`post-core.ts` ownerId trust), the cost ledger. Anything decision-shaped gets asked to you live. Product: `.feature/qc-r1-briefs.md` with fix shapes.

**Session 6 — Codex, gpt-5.6-sol high: `/ft-fix 117`.** Executes the briefs, re-runs gates, re-drives any browser-failed journey, posts the single `## QC round 1: done` comment on #117.

**Session 7 — you, localhost:3000.** Walk the walkthrough from the gate. Also your two OWNER journeys if you choose to spend: tap a real repost, post a real thread. Anything wrong → tell any Codex session `/ft-fix 117` with your words (patch round; it asks once "anything else to fold in?" so batch your findings). Marker becomes `## QC round 2: done (patch)`.

**Session 8 — either app: `/ft-ship 117`.** Guard checks the done marker and that no feature-path commits landed after it, shows you the full inventory, ships via `ship.sh` (squash on beta), dispatches deploy-checker on beta.oparax.ai, promotes to main. **It does not close the issue.** You check production — this slice touches the external network (real X posting), so give the affected journey the two-minute production check — then close #117 yourself, and the finalize sweep runs on your word.

**Total owner attention:** the plan conversation, the gate screen, judge's live questions, the walkthrough, the ship word, the production check. Everything else is triggering seven commands in the right app at the right dial — each one handed to you as copy-paste text by the previous session.
