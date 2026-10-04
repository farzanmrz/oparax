# Engineering instructions

Read this file in full before planning, changing product code or executing any stage. It is mandatory; AGENTS.md keeps the core security rules and the invoked stage skill supplies its execution contract.

## Engineering principles

Owner, September 23: Planning applies to plans; Building and Hygiene to builds. Critique and QC cite these names.

Planning:

- **Compare before choosing.** Name two or three real approaches and why one wins.
- **Model the domain first.** Settle data shapes and contracts before screens; impossible states cannot be stored.
- **Redesign over bolt-on.** Tell the owner when redesign makes the addition simpler.
- **Name the proof.** Each step names build and typecheck evidence and an acceptance journey.

Building:

- **Laziness.** Reuse helpers; add no single-caller abstraction or unrequested option.
- **Subtract first.** Delete code, flags and files made dead by the change.
- **Low reader load.** New files stay around 400 lines; split on a real seam. Existing large files are not a rewrite mandate.
- **Check at the door.** Schema-check external X data, fetched pages, model output and requests; a cast is no check.
- **Honest types.** No `as any`; `as unknown as` only fits validated data to loose database JSON.
- **Safe to repeat.** Retry or duplicate writes use a claim or unique key.
- **Root causes.** Fix the cause, never hide it with retries, sleeps or special cases.

Hygiene, against beta:

- **Comments say why, never what.** Preserve server-only headers and migration RLS-shape comments.
- **No slop.** Add no unnecessary catches, null checks, debug output or unrelated style changes.
- **No slop words.** Use no em dashes, filler openers or hype in copy, docs or commits.

## Code conventions

- **Ownership first:** prove per-user ownership using the RLS-scoped client before privileged work; then use admin for deny-all tables. Never trust raw caller ids. Sensitive trust logic lives in server-only modules outside `"use server"` files, whose exports are callable endpoints.
- Mutations return `{ ok: true }` or `{ ok: false, error }`; business failures are values. Revalidate on the server. Slow/billable background work uses Next's `after()` to return the response promptly.
- Server components are the default. Client components receive the smallest props needed for interaction. Compose existing `components/ui` primitives with classes; do not add a single-surface component there or hand-edit vendored primitives.
- Tailwind v4 uses `app/globals.css` tokens and `desk:` at 700px, never `md:`. No CSS modules/new stylesheets or inline styles where utilities suffice; arbitrary values are allowed.
- Each marketing/demo surface has one typed module for all fixed copy, examples and counts. Illustrative counts are fixed text, not runtime product calculations.
- Depicted controls use real primitives with native `disabled`; override disabled dimming locally for approved contrast. Tab illustrations are presentational and unfocusable. Import no stateful product components; preserve accessible narrative without blanket `aria-hidden` or `inert`.
- Generated server images use committed fonts, license files and marks in the Node runtime with renderer-compatible colors; no request-time third-party fetch. Brand marks use committed SVG path data with verified source URL/license. No runtime logo dependency, drawn approximation or letter stand-in; report unverified marks.
- PostHog initializes once in `instrumentation-client.ts`. One past-tense `snake_case` event per meaningful intent; plans record fixed property vocabularies. Demo compositions use `ph-no-autocapture`. Capture never blocks navigation; failures are contained. Reduce auth URLs to origin/path. Owner allows product text in replay; passwords stay masked.
- Root layout owns default metadata and `metadataBase`; pages override only genuine differences. Preview images use the file-based route convention.
- Every prompt identifies untrusted text as data. User-supplied URL fetches use the SSRF-hardened helper; handles/return paths use their single validation modules. Auth errors never reveal whether an email exists.
- pnpm only. App commands are in `package.json`: build, start, lint, lint:write and format; `pnpm exec tsc --noEmit` typechecks. The owner starts dev inside the flow unless the host override applies. Never commit environment values. Use `rg` for text/paths/identifiers and `ast-grep` for structural syntax searches; inspect imports/aliases/dynamic uses before claiming completeness. Format touched files and review the diff after structural rewrites.

## Execution and proof

- Stages do not run or attach to product servers or inspect runtime. Use repo source and third-party public types or shipped docs, never built or minified internals. Runtime questions become build-time checks and owner journeys.
- QC screenshot exception (owner, September 23): off-screen free-port screenshots at prescribed widths and themes, no clicks, sign-in or paid calls; stop the server, review images with reference-led-design and accessibility. Feature discussion, amend mode included, may research public references and render standalone previews per skill; a change of look is rendered, screenshotted and judged there before owner approval. This does not extend to critique, adjudication, build or ship. Never attach personal browser profiles.
- **Host override:** direct owner in-chat runtime requests override the stage server restriction immediately, in the same session, between or after stages too. No new session or rule change is needed. Owner-requested login is pre-authorized. Codex and Claude browsers stay in the background; never front a tab or pane or open on his display.
- Proof is build, boot and usable access: build, typecheck and a named owner journey. No comprehensive suites, benchmarks, multi-case harnesses or deployment checks unless ordered. Pushing ends the job; source checks do not establish successful external delivery.
- One shared Supabase project: apply and mirror migrations during build. Signature retirement's window until ship is accepted; never re-ask for preview DB or timing approval. No dedicated test account is configured. Removing the old mailbox does not establish deletion of its Auth user record.
- Labs and harnesses run independent calls concurrently, only true dependencies serially; record concurrency in the header (owner, September 26). This authorizes no new lab.
- One writer: no worktrees, no parallel builds, one product writer in the feature checkout.
- No new hidden folders unless the owner names one; existing `.claude/`, `.codex/`, `.agents/`, `.feature/` and `.github/` are exceptions. Write no scratch or evidence documents unless the owner asks.
