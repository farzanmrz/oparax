# CoffeeSpace outreach automation — handoff brief (from the ~ session, 2026-06-12)

Purpose of this doc: a fresh Claude Code chat inside oparax-chirp picks up a months-deep effort with zero prior context. Read the four source files below, then run the project's **idea-refine** skill on the open design question (§5) BEFORE building anything.

## 1. What this is

Farzan sends automated cofounder invites on the CoffeeSpace Android app (phone CPH2573, mirrored via scrcpy, driven from Claude Code). Pipeline per profile: extract text via accessibility dumps → classify → draft a templated invite → type → send. It works today and has sent 8 real invites this session-cycle; the goal now is to package it as a project-scoped skill + subagent in THIS repo's `.claude/` so any fresh chat can run it repeatably and much faster.

## 2. Source files (read in this order)

1. `/Users/farzanm4/coffeespace-invite-flow.md` — the PROVEN MCP-based flow (8 sends validated). Defines the app's a11y structure, field map, send steps, hard rules. Treat its §2/§5/§6 device facts as ground truth; its §1/§3/§4 (tiering, message grammar, info bank) are SUPERSEDED by decisions in §4 below.
2. `/Users/farzanm4/coffeespace-cli-test-report.md` — empirical evaluation of the `claude-in-mobile` CLI (installed, v3.12.0) against the live app. THE key document: per-command verdicts, tested production mapping (6 Bash calls/profile vs ~45-50 MCP calls), bans, risks. The brief that produced it is at `/Users/farzanm4/coffeespace-cli-test-brief.md` (optional read).
3. `/Users/farzanm4/.claude/plans/atomic-stirring-mitten.md` — last written plan. NOTE: drafted BEFORE the test report; its architecture and file-content outlines (template text, info bank, orchestrator duties) remain the working baseline, but its protocol syntax is superseded by the report's tested mapping, and its architecture must be re-validated via idea-refine (§5).

## 3. Current state

- Batch: 8 of 20 invites sent (all via MCP path, model fable, avg ~272s/profile). 12 remain. App invite counter was ~41 left.
- Phone state drifts: the pending profile changed between sessions with no interaction (Divya → Charles). NEVER assume which profile is on screen; always re-extract the name from a fresh top dump.
- Coffee balance 0 → all sends are regular Invites. Coffee/S-tier logic is DROPPED anyway (see §4).
- `claude-in-mobile` CLI at `/opt/homebrew/bin/claude-in-mobile`; scrcpy + adb via homebrew. The `mobile` MCP server also exists (user-scoped) — now fallback only.

## 4. Decisions already locked with Farzan (do not relitigate in idea-refine)

- **Simplified analysis**: drop tier/prestige/hunger/S-tier/coffee/gender logic. Single 3-way classification: TECH / BIZ / SKIP (unrelated fields → tap ✗, doesn't count toward batch N).
- **Message**: single paragraph + 3-line contact block, ≤1000 chars, ASCII, no `$` `` ` `` `"` `\` `|`. Template (placeholders in brackets):

  > Hi [Name]!
  >
  > Your profile stood out to me because [one sentence: the most specific real thing they did + why it matters - genuine commonality ONLY if it exists, never forced]. I'm currently building Oparax (pre-revenue, live at oparax.ai - first tester is a reporter with 400k followers): an AI agent that replaces the manual loop for news reporters - it watches the web for their beat so they never miss breaking news, then drafts and posts to their socials in their own voice. [TECH: "I'm looking for a cofounder to build this with me and split ownership across the stack." / BIZ: "I'm looking for a cofounder to own business and customers while I own engineering."] As for me, I've spent over a decade building across the breadth of tech and going deep where it counts - happy to share more on a call. I prefer video via the calendar link below, but any channel works.
  >
  > Calendar: https://calendar.app.google/vbNz8GSweNMXFAJo9
  > Phone/WhatsApp: +1 215-498-6165 / +91 98388-85523
  > Email: farzanmrz@gmail.com / LinkedIn: farzan-mirza13

  Trim the hook sentence first if over budget. First paragraph must start with an uppercase letter (empty-field auto-cap, see report risk #2).

- **Info bank** (commonality material; full bullets in the plan file §3): Oparax pivoted from AIOS concept / AGI-OS long-term vision; gbox agent work; agent-platform tuning obsession (Claude Code/Codex skills+subagents — this pipeline itself); Drexel MS AI/ML 4.0 + Virginia Tech BS CMDA; tabular foundation-model research (4D contextual attention); Optium founding CEO/CTO (ERP SaaS, 10+ team, 14 months, <$110k); KlinikosMed clinical AI (multimodal transformer, RLHF/PPO, GKE); agentic job-applicator benchmarking AutoGen/LangChain/CrewAI/SmolAgents; 7+ yrs NLP/recsys/RL/HPC; AWS AI cert.
- **CLI-first transport** per the report's §2 mapping; MCP retained ONLY as documented fallback (esp. the Invite tap, the one untested step). Hard bans from the report: `claude-in-mobile input` for payloads (IME autocorrupt), all clipboard commands (set silently fails; paste leaks the user's real private clipboard into an outbound message), `find-and-tap` near send controls, `flow` batch (plain `&&` chains win).
- **Speed over message perfection**; target ≤90s/profile (report projects ~30-35s device time + model thinking).
- **Two-step ablation before resuming the batch** (both are real sends from the remaining 12): Run 1 = CLI + **fable** (isolates the runner switch vs the 272s fable+MCP baseline); Run 2 = CLI + **haiku** (isolates the model). Note: subagents have a model knob only — there is NO effort parameter. If Run 1 alone hits ~90s and haiku drafts dip in quality, keep fable.
- Everything lives in THIS repo's `.claude/` (project-scoped: `.claude/skills/`, `.claude/agents/`). After the build is validated, the old `/Users/farzanm4/coffeespace-invite-flow.md` gets deleted (contents folded in) and the user-level memory pointer updated.

## 5. The open question

**What is the right Claude Code configuration for this pipeline?** (skill? agent? both? multiple? where does orchestration live, where does knowledge live, what's parameterized?)

Prior thinking from the ~ session — context, not conclusions; it acknowledged its own anchoring bias toward its first architecture, so treat all of this as challengeable: it leaned toward one orchestrator skill + one custom runner agent (restricted tools, model pinned in frontmatter) + reference files (user-editable `farzan.md` template/bank; `runner-protocol.md` device mechanics). Along the way it considered and set aside: a single skill with no agent (couldn't pin a cheap model without switching the whole chat's model), an agent with no skill (orchestration knowledge had no durable home), splitting the device protocol into its own general-purpose skill now (no second use case yet), and per-spawn batch size (leaned K=1 for isolation, noting spawn overhead ~15-20% of per-profile time as the counterargument). Subagents expose a model knob only — there is no effort parameter.

## 6. Likely follow-on work (context only — Farzan directs each step after refinement; do NOT proceed into these automatically)

1. Build the files under `.claude/` per whatever config is settled, folding: report §2 tested mapping + §5 risks into the protocol knowledge; §4 template/bank above into the user-editable knowledge; orchestration (preflight incl. `current-activity` guard, `analyze-screen` overlay sanity once per run, scrcpy launch-if-absent, profile-name tracking to detect non-advancing feed, stop conditions) wherever the config puts it.
2. Preflight dry-run (no sends), then ablation Run 1 → Run 2, wall-clock timed, one real send each.
3. If green: resume the batch (10 sends remain after the 2 ablation sends) via the new skill.
4. Cleanup: delete old flow doc, update `/Users/farzanm4/.claude/projects/-Users-farzanm4/memory/` playbook pointer + MEMORY.md index to point at the repo skill (note: that memory dir belongs to the ~ project context; also seed this repo's project memory if appropriate).

## 7. Safety rails (non-negotiable, inherit into everything built)

- One physical phone → strictly sequential, never parallel runners.
- Real outbound messages to real people: pre-send verification of the typed text (ui-dump `--format xml`, check `text=`, `&#10;&#10;` separators, no backslashes) is mandatory; clipboard route banned; nothing beyond CoffeeSpace is touched on the device.
- If the screen isn't a founders-feed profile at start: STOP and ask Farzan to navigate — never explore the app autonomously.
- Swipes start at y≈2700 native (overlay row y2400-2640 and nav bar y≥2784 silently swallow gestures); 0.5-0.6s settle before dumps; typing only via `claude-in-mobile shell android --i-know-what-im-doing 'input text "..."'` (or env `CLAUDE_IN_MOBILE_ALLOW_SHELL=1`, re-set per Bash call — env does not persist across calls).
