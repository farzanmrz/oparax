# Component research: React Bits Pro, AI Elements, AI SDK generative UI

Read-only research, October 1, 2026. Facts below come from the TSX itself (read this pass), not from catalog descriptions.

## 0. Facts that change how anything is adopted

1. React Bits Pro blocks are full demo screens, not components. Each is one `export default function` with no props, hard-coded sample data, its own `cx()` and `useScrollFade()` copies, and a `min-h-[560px]` or `100vh` root. "Using" one means lifting its structure and replacing the data arrays. Only `features-4` takes props. Free React Bits parts (`circles`, `center-flow`, `ThoughtLine`, `StatusMark`) are the exception and do take props.
2. Pro blocks color with literal `neutral-*` classes plus `dark:` variants, and read `--rb-radius`, `--rb-r-lg`, `--rb-accent` with built-in fallbacks. The `app-ui-theme` registry dependency (a `registry:style` with no files) sets only those variables and "changes nothing on its own". It does not approve a theme. Mapping to DESIGN.md tokens is a manual pass.
3. AI Elements are props-driven shadcn-style components using theme tokens (`text-primary`, muted, etc.), so they fit the Mira setup without recoloring. Their dependencies: `lucide-react`, `collapsible`, `badge`, `hover-card`; plus `motion` (shimmer), `streamdown` (reasoning, message), `ai` (tool, confirmation, types), `carousel` (inline-citation only), `@radix-ui/react-use-controllable-state`. Site `components/ui` already has collapsible, badge, card, hover-card, sheet, sidebar, skeleton, scroll-area, tabs; it has no `carousel` and no `progress`.
4. Where sources live:
   - Catalog sources: `/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/pro-exploration/catalog/src/tsx/<name>.tsx` (63 files before; I added about 72 this pass, fetched read-only with the license, key never printed or written). Every Pro item named below is now there.
   - Installed blocks: `/Users/farzanm4/Desktop/repos/oparax/scratch/design-recovery/site/components/blocks/` has only agent-activity-2, app-shell-4/5, hero-10/21/22/24, how-it-works-6/8/9, list-8, monitoring-4, notifications-1/4, pricing-6/10/13/15 (no comparison-* block is installed).
   - Free React Bits and owner-adapted parts: `site/components/react-bits/` (ThoughtLine, StatusMark, MagicBento, Stack, ScrollStack, AccordionGallery, d4-source-flow, ...).
   - AI Elements: on disk are `inline-citation.tsx` and `sources.tsx` in the catalog tsx folder. The rest were read from `https://registry.ai-sdk.dev/<name>.json` (not saved).

## 1. Item inventory (what each renders, from source)

Paths are relative to `catalog/src/tsx/`. Deps beyond React: M = motion, L = lucide-react.

### Agent, tool and plan surfaces (React Bits Pro)

| Item | Renders | Deps |
|---|---|---|
| agent-activity-1 | Live feed of run steps: done rows with fixed seconds, one running row with a ticking timer, queued rows below, a Stop control, scroll-fade edges. | L |
| agent-activity-2 (installed) | Collapsible run timeline with nested sub-steps and duration bars, status "Succeeded" header. | M, L |
| agent-activity-3 | Compact status rail: current action, step progress, stop and "Run again". | L |
| agent-activity-6 | Parallel worker lanes with queue depth. | M |
| agent-activity-7 | Run detail: attempts, trigger, inputs, outputs, error surface, "Retry run", "Cancel retry", file chips. | L |
| agent-plan-1 | Vertical progress rail of plan steps. Each step: title, one-line detail, target chip, estimate, state dot (done, running, paused, queued, skipped), Run/Stop control. | L |
| agent-plan-3 | Plan tree with nested subtasks, dependency links, blocked state. | L |
| agent-plan-4 | Plan vs actual duration bars per step with drift. | none |
| agent-plan-6 | Plan summary card: est. time, est. cost, breakdown, "Edit plan", "Run plan". | L |
| tool-calls-1 | Collapsible tool-call cards: name, Arguments, formatted JSON result, timing. | M, L |
| tool-calls-2 | Tool call list with per-row status (streaming, running, awaiting, approved, done, failed, stopped, skipped) and a per-row retry button. | L |
| tool-calls-4 | Web-search result card: query header, "Done, N results", ranked rows (index, title, source, domain, snippet, relevance 0 to 100), scroll fade. | L |
| agent-approval-1 | Inline approval prompt with a plain-language impact line and a destructive confirm. | M, L |
| agent-approval-2 | Approval dialog with a diff-like before/after and Allow once / Always allow / Deny. | M, L |
| agent-approval-4 | Permission request card: who asks, what for, itemised "Scopes requested", "Expires in", Approve. | M, L |
| agent-approval-5 | Cost-gated approval: "Projected spend for this run", runtime, model usage, Approve. | M, L |
| ai-chat-1 | Assistant thread: "Thought for N s" disclosure, live tool call, streaming answer, Sources, composer. | M, L |
| ai-chat-3 | Compact assistant panel: "How can I help?" empty state, suggested prompts, docked composer, "Jump to latest". | M, L |
| ai-chat-5 | Chat with inline "Needs approval" card gating destructive steps. | M, L |
| ai-chat-7 | Chat with pinned context sources and per-message citations mapping an answer to evidence. | M, L |
| monitoring-9 | Live run queue grouped by state with progress rings and an attention filter. | L |
| list-10 | Runbook checklist with live progress and scroll-faded steps. | L |

### App shell, lists, notifications, onboarding, empty, paywall

| Item | Renders | Deps |
|---|---|---|
| app-shell-1 | Sidebar with collapsible nav groups, breadcrumb header, overview metrics and records. | L |
| app-shell-3 | Global top bar with search and account over a sidebar that collapses to an icon rail. | L |
| app-shell-4 (installed) | Three columns: nav, main, toggleable context panel (calendar panel in demo, "Hide schedule"). | M, L |
| app-shell-5 (installed) | Master-detail triage: icon rail "Mailboxes", filterable and sortable conversation list, reading pane, "Back to conversations" on mobile. | L |
| app-shell-8 | Adaptive frame: mobile tab bar, then icon rail, then full sidebar. | L |
| app-sidebar-1 | Collapsible sidebar: grouped sections, badges, user menu, "Collapse sidebar". | L |
| app-sidebar-7 | Sidebar + app header + breadcrumbs + content region composed as one shell. | L |
| notifications-1 (installed) | Notification center grouped by day, unread filter, per-row read toggle, dismiss. | M, L |
| notifications-3 | Delivery preferences matrix (in-app, email, push), quiet hours, save bar. | M, L |
| notifications-5 | Banner set: info, warning, error with details, success, usage-limit, "Restore all". | M, L |
| list-8 (installed) | Inbox rows with archive, snooze, collapsing row with undo ("Message archived"). | L |
| monitoring-4 (installed) | Alert inbox: All / Firing / Pending / Resolved tabs, sparklines, silence. | L |
| onboarding-1 | Split screen: profile form on the left, live "Directory preview" on the right. | L |
| onboarding-2 | Six-step vertical stepper, labelled rail, real form per step. | L |
| onboarding-3 | "Get set up" checklist, live progress bar, per-task action button. | L |
| onboarding-4 | Use-case picker tiles plus segmented control, "Step 2 of 4". | L |
| onboarding-6 | "Your workspace is ready": list of what was configured, two next actions. | L |
| onboarding-7 | Horizontal top stepper over one form with live URL slug preview. | L |
| empty-state-1 | First-run state with a ghosted preview of the future table and three starting paths. | L |
| empty-state-2 | No results: echoed query, removable filter chips, suggested searches. | L |
| empty-state-3 | "All caught up": day summary, "Last refreshed a moment ago", optional next actions. | L |
| empty-state-4 | "Could not load": request details, trace id, last success, retry. | L |
| paywall-2 | Feature-gate dialog listing what the upgrade unlocks, "Not now". | L |
| paywall-3 | Plan comparison with monthly/yearly switch and a marked Current plan. | L |
| paywall-4 | Usage-cap notice with per-quota meters, top-up or upgrade. | L |
| paywall-5 | "Trial ended": read-only mode explanation, list of what is kept, card-on-file line, one-click Reactivate. | L |

### Auth, marketing

| Item | Renders | Deps |
|---|---|---|
| auth-5 | Centered magic-link card: email field, "Send magic link", swaps to "Check your inbox" with resend cooldown (`Resend link in Ns`), Google and GitHub fallbacks, "Create an account" link. | M, L |
| auth-6 | Six-digit OTP screen with auto-advance and resend countdown. | M, L |
| authentication-1 | Centered sign-in card: password reveal, Caps Lock hint, keep-me-signed-in, three-up provider row, "Create one". | L |
| authentication-5 | Magic-link confirmation with delivery summary (Sent to, Expires, Requested from), resend countdown, back to form. | L |
| authentication-7 | Sign-up card with segmented strength meter and live requirement list. | L |
| hero-10 (installed) | Centered text over three stacked cards. | M, L |
| hero-15 | Centered serif italic headline, announcement pill, CTA, chat-style input bar. | M, L |
| hero-18 | Command-palette hero: key chips, scoped "Top results", reduced-motion-gated shimmer. | M, L |
| hero-20 | Centered statement, logo row, bordered metric strip. | M, L |
| hero-21 / 22 / 24 (installed) | GLSL aurora / MeshGradient / NeuroNoise shader heroes. | M, L plus `three` (21) or `@paper-design/shaders-react` (22, 24) |
| how-it-works-4 | Three-column Today / Day 5 / Day 30 pills, dotted connector, three checklist cards (a grid). | M, L |
| how-it-works-6 (installed) | Scroll-driven vertical timeline: line fills with scroll, nodes scale and pulse when reached, alternating left/right cards that use an image. | M, L |
| how-it-works-8 (installed) | Horizontal three steps with a drawing connector line; each step has a small UI vignette (linked sources list, field mapping, sync progress with stats). | M, L |
| how-it-works-9 (installed) | Vertical tablist of four steps with sliding indicator; right panel swaps vignettes (commits, gates, notes, promote). | M, L |
| pricing-15 (installed) | Quiet comparison table: featured tier, monthly/yearly switch, mobile plan tabs, Included / Not included rows. | M, L |
| pricing-7 / pricing-8 | Comparison table with toggle and expandable rows / four-column compare table with expandable section rows. | M, L |
| comparison-5 | Cost-at-scale table, savings deepen through a heat ramp, stacked cards on mobile. | M, L |
| comparison-8 | Grouped capability matrix with tri-state chips (Included, Partial, Not available), tinted featured column, sticky label rail. | M, L |
| circles (free) | Rotating orbital rings of images; props for rows, radius, rotation, fade. | none |
| center-flow (free) | Center node with outer nodes joined by animated flowing segments; takes `nodeItems`, `centerContent`. | `next-themes` |
| stats-14 | Telemetry stat cards with sparklines and delta chips. | M, L |

There is no `steps`, `progress`, `roadmap`, `stepper` or `timeline` item beyond onboarding-2/7 (steppers), how-it-works-4/6 (timelines) and agent-plan-1 (rail).

### AI Elements (registry.ai-sdk.dev)

| Item | Renders | Deps |
|---|---|---|
| Sources (on disk) | Collapsible whose trigger text is literally "Used {count} sources" with a chevron; content is a column of `Source` anchors (book icon + title). `Source` accepts `children`, so a quote can be placed under each. | collapsible, L |
| InlineCitation (on disk) | Text span plus a hostname badge ("example.com +2") that opens a hover card carrying a carousel of sources (title, url, description). Hover, not parenthesized. | badge, hover-card, carousel, L |
| ChainOfThought | Collapsible header, steps with `status` complete / active / pending, search-result badges, images. | badge, collapsible, L |
| Reasoning | "Thought for N seconds" collapsible, auto-opens while streaming, closes 1s after; markdown body via streamdown. | collapsible, shimmer, streamdown |
| Task | Collapsible title with `TaskItem` lines and `TaskItemFile` chips ("Found project files", "Scanning 52 files"). | collapsible, L |
| Tool | Header with tool name and a status badge (input-streaming Pending, input-available Running, approval Awaiting/Responded, output-available Completed, output-error Error, Denied); body shows input JSON and output or error text. | `ai`, badge, collapsible, code-block |
| Plan | Card with title, description, collapsible content, footer; `isStreaming` turns title and description into Shimmer. | card, collapsible, shimmer |
| Queue | Sections (collapsible) of items with status indicator, content, optional description, actions, file and image attachments; used for messages and todos (completed vs pending). | collapsible, scroll-area |
| Confirmation | Alert that renders request, accepted or rejected content based on the tool part's approval state, with action buttons. | `ai`, alert |
| Artifact | Titled panel with header, actions, close, scrollable content. | tooltip |
| Shimmer | Motion text shimmer (`duration`), any element type. | motion |
| Loader | Small spinner svg. | none |
| Suggestion | Horizontal scroll row of prompt chips. | scroll-area |
| Message / Conversation / PromptInput | Chat message with branches and actions; auto-scroll thread; composer. | `ai`, streamdown |
| Context | Hover card with token usage and cost breakdown. | `ai`, tokenlens |
| Checkpoint, WebPreview, Canvas/Node/Edge | Conversation divider; iframe preview; React Flow graph. Not relevant here. | |

Owner-adapted free parts already installed (not Pro): `ThoughtLine` (shimmering label with steps that settles to a "done" label and timer), `StatusMark` (pending / running / done / failed mark, optional determinate progress arc), `d4-source-flow` (custom source choreography).

## 2. AI SDK generative UI pattern (the building stage)

Source: ai-sdk.dev generative-user-interfaces and chatbot-tool-usage docs.

- The model calls typed tools. In AI SDK 5 and later a tool call arrives as a message part with `type: "tool-<toolName>"` (for example `tool-scoreSources`), not a generic tool-invocation part.
- Each part has a `state`: `input-streaming` (arguments still arriving, `input` partial), `input-available` (arguments complete, tool executing), `output-available` (`output` set), `output-error` (`errorText` set). Approval flows add approval-requested, approval-responded and `output-denied`.
- The client maps `message.parts` to components with a switch on `part.type`, then on `part.state`. This is "generative UI": tool result data goes into a React component.
- Mapping for Oparax stages (names are proposals): `tool-lookupProfile`, `tool-readPosts`, `tool-scoreSources`, `tool-chooseSources`, `tool-writeBrief`. `input-streaming` shows a Shimmer line with the partial input (handle, source being considered). `input-available` shows the running row (StatusMark running). `output-available` swaps in the result component. `output-error` shows the failed row with `errorText` and a retry. Output must be schema-checked at the door per AGENTS.md.
- The AI Elements `Tool` component is built for exactly these four states (it takes the part's `state` and `type`), so the generic fallback for any stage is `Tool` with a custom body.

## 3. Recommendations per screen region

Building runs as one container (a vertical rail of five stages) whose per-stage body is swapped by tool part state. Container first choice: agent-plan-1 rail anatomy. Fallback: AI Elements ChainOfThought.

| Region | First choice | Fallback | Reason (from source) |
|---|---|---|---|
| Onboarding setup (one sentence plus X handle) | ai-chat-3 empty state and docked composer, using AI Elements PromptInput and Suggestion chips | onboarding-1 split screen (one form, live preview pane) | ai-chat-3 renders a single docked input with suggested prompts, which is the one-sentence ask; onboarding-1's right pane can preview the monitor being described. |
| Building container (all stages) | agent-plan-1 vertical rail (title, one-line detail, target chip, state dot, done/running/queued) | AI Elements ChainOfThought (complete/active/pending steps) | The rail already has per-step state and a detail line where "what the agent judged" goes; ChainOfThought is the props-driven stock version. |
| Stage 1 profile lookup | AI Elements Task ("Found @handle" with TaskItem lines for name, bio, followers) | tool-calls-1 collapsible card with result | Task collapses to a title and shows short evidence lines, matching a quick lookup. |
| Stage 2 reading posts | agent-activity-1 feed (done rows with seconds, running row, scroll fade) | AI Elements Task with counted TaskItems ("Read 40 posts") | Its row-by-row timed feed shows progress through many posts without a modal; Task is quieter if stage 2 should stay short. |
| Stage 3 scoring candidate sources (keep or reject with scores) | tool-calls-4 ranked rows (index, title, domain, snippet, relevance number), adding a Keep/Reject chip | tool-calls-2 row list (done = keep, skipped = reject, failed = unreachable) | tool-calls-4 already renders a 0 to 100 score per ranked candidate with domain and snippet; the snippet slot holds the one-line judgment. |
| Stage 4 choosing sites and X accounts with reasons | AI Elements Queue with two sections (Sites and feeds, X accounts), reason in QueueItemDescription | tool-calls-4 rows in two groups | Queue gives collapsible sections with item plus description, which is exactly name plus reason, and has a completed/pending indicator. |
| Stage 5 writing the brief | AI Elements Plan with `isStreaming` (title and description shimmer while written) | AI Elements Artifact (titled panel, scrollable content) | Plan turns its text into Shimmer while streaming, then settles into a card; Artifact is the heavier panel option. |
| Failed build | empty-state-4 (what failed, request details, trace id, last success, retry) | agent-activity-7 error surface with attempts and "Retry run"; per-stage inline failure via AI Elements Tool `output-error` | empty-state-4 is a calm full-state failure with a retry; Tool output-error covers a single stage failing without ending the run. |
| Ready summary | onboarding-6 (what was configured, two next actions) | agent-plan-6 summary card (est., breakdown, Edit plan / Run plan) | onboarding-6 lists configured items then offers two obvious actions, which fits "your monitor is ready"; plan-6 fits if the owner wants an editable summary. |
| Feed app shell and sidebar | app-shell-5 (icon rail, filterable list pane, reading pane) with app-shell-8's mobile tab bar behavior as the narrow layout | app-sidebar-7 (sidebar + header + breadcrumbs + content), or the already-installed stock shadcn Mira sidebar | The list pane holds stories and the reading pane holds a full story with its Used N sources; app-sidebar-7 is the simpler single-content shell. |
| Simple feed page (no shell) | notifications-1 (grouped by day, unread filter, per-row read toggle, dismiss) | list-8 (inbox rows with archive and undo) or monitoring-4 tabs | Day grouping and unread state are what a feed needs; list-8 adds archive with undo if stories can be dismissed. |
| Story card with Used N sources and inline citation | AI Elements Sources (trigger reads "Used N sources"), controlled open state, parenthesized citation as a small custom button that opens the collapsible and highlights the matching Source row; quote placed in Source children | AI Elements InlineCitation (hover card of source title, url, description) | Sources already produces the exact quiet "Used N sources" disclosure and lets a quote sit in each row; InlineCitation is a hostname badge on hover, needs `carousel`, and is not parenthesized. ai-chat-7 is a reference for mapping answer to evidence. |
| Empty and checking states | empty-state-3 ("All caught up", "Last refreshed a moment ago"), with a Shimmer line plus StatusMark for the checking moment | empty-state-1 (first-run ghost preview) or agent-activity-3 compact status rail | empty-state-3 states that nothing new exists and when it last checked; the shimmer and mark cover the live checking moment. |
| Alert activation | agent-approval-4 (itemised "Scopes requested", "Expires in", Approve) | notifications-3 reduced to one row (toggle, quiet hours, save bar) | Activation is a permission to message the person on X; the itemised scope list says exactly what will be sent. |
| Paywall, free week ended | paywall-5 (read-only mode, "what is kept" list, one-click reactivate; replace card-on-file line) | paywall-2 feature-gate dialog | paywall-5 matches "free week ended, your monitor is kept" with a single action; paywall-3 only if more than one paid plan exists. |
| Checkout return | onboarding-6 trimmed (success summary, two next actions) | notifications-5 success banner on the feed; empty-state-4 for cancelled or failed return | A confirmation list plus next actions ends the checkout cleanly; a banner is lighter when returning straight to the feed. |
| Auth (one block for signup and login, as is) | auth-5 | authentication-1 for sign in plus authentication-7 for sign up (two blocks) | One email-first magic-link card makes signup and login the same screen and never reveals whether an email exists; swap the Google and GitHub buttons for the providers actually configured. |
| Landing hero | hero-15 (serif headline, pill, chat-style input bar) | hero-10 (three stacked cards, installed) | The input bar mirrors the one-sentence ask; hero-10's stacked cards can hold three real story cards. hero-18 is an option if a search-like demo is wanted. |
| How It Works | how-it-works-8 (three steps, drawing connector, vignettes) with vignettes replaced by profile card, scored sources, story card | how-it-works-9 (tab switcher with panel vignettes) | Three horizontal steps with a mini UI each is closest to "say it, agent builds it, stories arrive"; how-it-works-9 fits if four steps are shown. |
| Roadmap (single composition, not a grid) | how-it-works-6 vertical scroll-progress timeline (swap its image cards for text) | agent-plan-1 rail used as shipped / building / next (strip Run controls) | One vertical line fills with scroll and nodes light up as reached, a single composition; how-it-works-4 is a three-column grid and is excluded. |
| Pricing as comparison | pricing-15 (featured tier, billing switch, Included / Not included rows, mobile plan tabs) | comparison-8 capability matrix (tri-state chips, featured column) | pricing-15 is already a quiet comparison table with a featured tier; comparison-8 suits comparing Oparax with manual alternatives instead of plan tiers. |

## 4. Risks and gaps to carry forward

- Pro blocks need lifting and recoloring: expect to delete demo chrome, replace literal neutral classes with DESIGN.md tokens, and extract the duplicated `useScrollFade` and `cx`. Several (app-shell-5, app-shell-1) are 1000 to 1600 lines, far above the 400-line new-file guidance, so use their structure and split.
- No Pro item renders "keep or reject" natively; it is a chip added to tool-calls-4 rows.
- The parenthesized citation that opens its quote is custom (controlled Collapsible plus anchor); neither Sources nor InlineCitation does it out of the box.
- `center-flow` depends on `next-themes` and `circles` is image-based; neither is a recommended pick above. Both would only decorate the landing or the building view, not carry content.
- Shader heroes (hero-21/22/24, hero-13) add `three`, `@react-three/fiber` or `@paper-design/shaders-react`; avoid unless the owner wants a shader.
- Checkout-return, alert activation and roadmap have no purpose-built block; the picks are the nearest renders.
