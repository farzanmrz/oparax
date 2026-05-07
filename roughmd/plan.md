# Overview

The product path to stabilize first:

1. Sign in.
2. Create a workflow.
3. Define what to monitor.
4. Add or skip X accounts.
5. Run a scan.
6. Review clean knowledge items.
7. Generate draft tweets.
8. Save the workflow.
9. Land on the saved workflow detail page.
10. Review saved workflows and future scan runs.

## Priority Guide

- **P0:** core flow breaks, gets stuck, shows stale state, or prevents workflow
  creation/saving.
- **P1:** scan output works but cannot yet be trusted or used comfortably.
- **P2:** auth, dashboard, and normal app UX polish.
- **P3:** product expansion after the MVP loop is dependable.
- **Maintenance:** current branch cleanup only.
- **Backlog:** experiments and tooling that are useful later.

# Tasks

## Parallel Codex Completed

1. Login, Forgot Password and Sign Up pages

- Beautified UI generally
- Added hover, click actions to buttons and URLs
- Streamlined font weight/sizes for text elements of header, button text, form label, URL and normal text elements
- Introduced Show/Hide password button for viewing password easily
- Standardized length of main card to show full image
- Implemented field validation for email format, password etc. shows error help text when format mismatches
- Assigned loader for URL redirection since it wasnt clear if URL is working

## P0 - Core Flow Reliability

Goal: create workflow -> scan -> draft -> save -> detail page works without
stale data or stuck UI.

### P0.1 Remove stale create-page defaults ✅

- Fresh local and production sessions should not show prefilled FC Barca/static
  data unless a template system intentionally adds it.
- Measure: open the create workflow page in a clean browser and confirm the form
  starts blank or with generic placeholders only.

### P0.2 Reorder create workflow setup

- Use this order:
  1. Workflow name.
  2. Scan frequency.
  3. Monitoring description.
  4. X accounts to monitor.
  5. Drafting instructions.
  6. Example tweets.
  7. Scan results / knowledge bank.
  8. Draft previews.
  9. Save workflow.
- Measure: the page reads like one setup flow from top to bottom.

### P0.3 Validate and suggest X accounts

- As the user types an X/Twitter handle, cross-check whether the account exists.
- Show partial-match suggestions so users can find the right account without
  knowing the exact handle.
- If possible, suggest accounts that match the user's monitoring goal.
- Keep the first version practical: exact-handle validation and partial matches
  come before goal-based account discovery.
- Measure: users can add valid accounts confidently and get useful feedback for
  typos, stale handles, or ambiguous account names.

### P0.4 Make examples normal text-entry fields

- Example tweets should feel like normal editable text boxes.
- Add/remove controls should be obvious.
- Validation should be clear but not visually heavy.
- Measure: add, edit, remove, and validate examples without confusion.

### P0.5 Replace model-name product copy

- Change user-facing scan copy from "Grok is searching..." to Oparax-branded
  language.
- Measure: normal users see Oparax doing the work, not implementation details.

### P0.6 Clear stale scan/draft state on new scan

- When a new scan starts, clear:
  - old scan results,
  - selected knowledge items,
  - generated drafts,
  - old scan/draft errors.
- Measure: adjusted prompts never display previous scan results as if they
  belong to the current scan.

### P0.7 Fix save workflow flow

- Save button shows progress.
- Save button prevents double-submit.
- Successful save creates workflow + trigger records.
- Local drafting state migrates to the saved workflow scope.
- Successful save navigates to the workflow detail page.
- Failed save shows a useful error and re-enables the button.
- Measure: create -> scan -> draft -> save consistently lands on
  `/dashboard/workflows/:id` and never remains stuck on saving.

### P0.8 Run one full manual QA pass

- Test sign in -> dashboard -> create workflow -> scan -> select item ->
  generate draft -> save -> detail page.
- Measure: one clean local run, then one clean preview/production run.

## P1 - Scan Quality And Trust

Goal: scan results are relevant, broad enough, and easy to turn into drafts.

### P1.1 Verify structured scan output

- Confirm new scan results are structured JSON, not free-form markdown that
  requires regex citation parsing.
- Desired structure: generated timestamp, knowledge item/headline IDs, title,
  concise context, evidence points, primary tweet ID or URL, supporting tweet
  IDs or URLs, source handles, and supporting source URLs when useful.
- If the app stores URLs for embedding, derive/normalize tweet IDs from those
  URLs for dedupe and future data use.
- Keep legacy markdown parsing only for old stored scan runs if needed.
- Measure: new scan rendering does not depend on parsing `[[N]](url)` citations.

### P1.2 Tighten relevance filtering

- Prompt should separate direct news from adjacent/fan activity.
- Example: an SRK fan-club celebration should not appear unless the user asked
  for fan/community activity.
- Remove Barca-specific assumptions and make the prompt general.
- Measure: test football, SRK/Bollywood, and broad entertainment prompts.

### P1.3 Determine tweet/result limits vs filtering behavior

- Reproduce the specific comparison:
  - broad prompt: "I want all Bollywood news",
  - narrower prompt: "I want scandalous news about Bollywood celebrities",
  - observed issue: a Kiara Advani tweet appeared in the narrower scan but not
    the broader scan.
- Determine whether the app/model has a limit on how many tweets or knowledge
  items it retrieves, clusters, returns, stores, or displays.
- Identify whether the cause is retrieval, prompt filtering, result limits, UI
  display limits, date filtering, post-processing, schema/output caps, or the
  internal x_search strategy Grok chose.
- Distinguish between "number of raw tweets retrieved" and "number of knowledge
  items shown"; the UI may show fewer clustered angles than raw sources.
- Decide whether the product should show more raw tweets, more clustered
  knowledge items, or clearer "top results" language when broad prompts produce
  too much material.
- Measure: write a short cause/fix note before changing behavior.

### P1.4 Audit x_search internal date filtering

- Treat `x_search` as the public server-side tool, but remember that it can
  internally perform user search, keyword search, semantic search, and thread
  fetch.
- Use xAI tool-call observability to inspect the internal function names and
  arguments, especially:
  - `x_user_search`,
  - `x_keyword_search`,
  - `x_semantic_search`,
  - `x_thread_fetch`.
- Verify whether `from_date` / `to_date` on the parent `x_search` tool are
  honored by each internal strategy. The current concern is that keyword search
  may behave like latest-mode retrieval while semantic search honors date bounds
  more reliably.
- Add safeguards if needed:
  - stronger prompt instructions,
  - explicit freshness requirements in the structured output schema/prompt,
  - model-side filtering before returning knowledge items,
  - app-side post-processing if tweet timestamps are available.
- Measure: stale posts outside the intended scan window do not survive into the
  knowledge bank, regardless of which internal x_search strategy found them.

### P1.5 Improve scan-result UI

- Reduce redundant citation/source noise.
- Do not show raw tweet URLs next to embedded tweets unless needed.
- Remove source-link blocks that duplicate embedded tweet sources.
- Make title and context less repetitive.
- Preferred item shape: title, concise context, evidence, primary embedded tweet,
  supporting tweets only when useful.
- Measure: each knowledge item is scannable in a few seconds.

### P1.6 Fix tweet embed size and time clarity

- React tweet embeds should not overwhelm the page.
- Tweet times should be understandable relative to the user's local timezone.
- Measure: embeds look proportional on desktop/mobile and time labels are clear.

### P1.7 Add basic scan progress

- Show a useful progress state while scanning.
- Keep this separate from later reasoning/tool-event streaming.
- Measure: users know work is happening even when scans take time.

### P1.8 Evaluate broader search inputs

- Test whether web search improves general news aggregation.
- Test whether a more general scan strategy is needed for non-account-specific
  prompts.
- Compare X-only scanning with X + web search for broad news prompts, since xAI
  positions web search plus X search as a useful pairing for news and social
  monitoring.
- Keep Grok 4.2 / multi-agent scanning as an experiment until current scan
  behavior is understood.
- Measure: decide whether web search belongs in the default path, fallback path,
  or backlog.

## P2 - Auth, Dashboard, And App UX

Goal: access and saved-workflow management feel clear and dependable.

### P2.1 Stop stale email prefill

- Login/signup should not show an old personal email unless browser autofill is
  intentionally doing it.
- Measure: fresh session behavior is clean.

### P2.2 Add password visibility controls

- Add reveal/hide controls to login, signup if applicable, and reset password
  fields.
- Measure: every password-entry flow supports inspection.

### P2.3 Fix forgot-password end to end

- Investigate the first-reset generic error.
- Investigate "successful reset" followed by invalid login.
- Surface useful Supabase/auth error detail.
- Measure: reset email -> set new password -> sign in works on the first clean
  attempt with a known test account.

### P2.4 Navigate after password reset

- After successful reset, route the user back to sign in or provide one clear
  next action.
- Measure: the user is not stranded after success.

### P2.5 Brand forgot-password email

- Improve the autogenerated reset email with Oparax branding and formatting.
- Measure: email no longer feels like a raw default template.

### P2.6 Replace workflow cards with a table

- Dashboard/listing page should use a table.
- Columns: name, status, frequency, handles, last scan/run, primary action.
- Measure: many workflows can be scanned quickly.

### P2.7 Define settings MVP

- Decide what settings should include first:
  - account/profile,
  - auth methods,
  - connected services,
  - default drafting preferences,
  - notifications/scheduling.
- Measure: write the settings scope before building the page.

### P2.8 Do a focused visual design pass

- Decide whether to move toward light mode.
- Keep this as one coherent UI pass after the core flow is stable.
- Measure: app has one clear visual direction, not scattered tweaks.

## P3 - Product Expansion

Goal: move from manual drafting support toward automated monitoring and posting.

### P3.1 Configure scheduled scans

- Implement the cron/scheduler path for workflow frequency.
- Measure: active workflows create scan runs automatically.

### P3.2 Plan Google sign-in and account linking

- Decide whether Google is only auth or part of a broader connected-services
  model.
- Measure: auth/linking model is written before implementation.

### P3.3 Plan X/Twitter posting

- Define OAuth, connected accounts, draft approval, and posting behavior.
- Measure: posting flow is clear before new posting UI is built.

## Maintenance - Current Cleanup Only

Goal: reduce repo planning noise without dragging old completed cleanup back
into the active plan.

### M1 Merge `ft/15-cleanup` when ready

- No detailed branch-reconciliation/replan ritual is tracked here.
- Merge the cleanup branch when the working tree and validation are acceptable.
- Measure: `ft/15-cleanup` lands cleanly, and new product work can start from a
  clean base.

## Backlog - Tooling And Experiments

These are useful, but they should not interrupt P0/P1 product work.

### B1 UI testing subagent

- Add the missing headless screenshot annotation flag.
- Prefer element-based success checks over URL waiting.
- Debug URL wait/read hangs only if element-based checks are insufficient.
- Define a dedicated subagent with access to the agent-browser skill.
- Test whether model/effort settings actually apply, or whether devtools labels
  are misleading.
- Move reusable browser flows into skill reference files if the rough version is
  worth preserving.
- Measure: one repeatable smoke test validates login/dashboard or create
  workflow without manual browser work.

### B2 xAI/Grok coding subagent

- Create a Claude Code custom agent for xAI/Grok implementation patterns.
- Give it xAI docs context and OpenAI JS SDK examples.
- Use after the current scan architecture is stable.
- Measure: future Grok changes get faster without polluting product planning.

### B3 Streaming reasoning and tool events

- Later enhancement for showing model/tool progress.
- Keep separate from basic scan progress.
- Measure: users get helpful progress without confusing implementation noise.

### B4 tool_choice and server-side tool observability

- Investigate whether `tool_choice` affects x_search/web_search or only
  client-side tools.
- Explore `tool_calls`, `server_side_tool_usage`, and any available usage-detail
  fields to see which internal x_search functions Grok actually invokes:
  `x_user_search`, `x_keyword_search`, `x_semantic_search`, and `x_thread_fetch`.
- Use this to understand retrieval quality, date-bound behavior, and result
  coverage before changing the product scan strategy.
- Measure: either use the finding to improve retrieval or drop it.

### B5 Grok 4.2 and multi-agent scanning

- Test Grok 4.2 only after current scan behavior is understood.
- Explore account-specific, web-specific, and general-search agents later.
- Measure: experiment beats the simpler path before it becomes product work.

### B6 Session-wrap subagent

- Build only if manual handoff updates remain useful and annoying.
- Measure: it improves session continuity with less effort.

## Execution Order

1. Finish **P0 Core Flow Reliability**.
2. Then do **P1 Scan Quality And Trust**.
3. Then do **P2 Auth, Dashboard, And App UX**.
4. Then start **P3 Product Expansion**.
5. Do **Maintenance** only when it reduces current confusion.
6. Pull from **Backlog** only after the product lane is stable.
