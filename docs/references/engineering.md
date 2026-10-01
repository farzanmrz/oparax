# Engineering instructions

Read this file in full before planning, changing product code or executing any stage. These detailed conventions moved from AGENTS.md on September 30 so the always-loaded instructions fit every participating client. They remain mandatory; AGENTS.md retains all named principles and core security gates. The previous full instructions are preserved in state-history-2026-09-30.md. The invoked stage skill supplies its execution contract.

The 14 named engineering principles remain in AGENTS.md under Engineering principles, their owner-locked location. Read and apply them alongside the detailed conventions below. Critique and QC cite those names.

## Code conventions

- **Ownership first:** prove per-user ownership using the RLS-scoped client before privileged work; then use admin for deny-all tables. Never trust raw caller ids. Sensitive trust logic lives in server-only modules outside `"use server"` files, whose exports are callable endpoints.
- Mutations return `{ ok: true }` or `{ ok: false, error }`; business failures are values. Revalidate on the server. Slow/billable background work uses Next's `after()` to return the response promptly.
- Server components are the default. Client components receive the smallest props needed for interaction. Compose existing `components/ui` primitives with classes; do not add a single-surface component there or hand-edit vendored primitives.
- Tailwind v4 uses `app/globals.css` tokens and `desk:` at 700px, never `md:`. No CSS modules/new stylesheets or inline styles where utilities suffice; arbitrary values are allowed. Follow `DESIGN.md` roles and approved typography; distinguish the selected target from runtime migration status.
- Each marketing/demo surface has one typed module for all fixed copy, examples and counts. Illustrative counts are fixed text, not runtime product calculations.
- Depicted controls use real primitives with native `disabled`; override disabled dimming locally for approved contrast. Tab illustrations are presentational and unfocusable. Import no stateful product components; preserve accessible narrative without blanket `aria-hidden` or `inert`.
- Generated server images use committed fonts, license files and marks in the Node runtime with renderer-compatible colors; no request-time third-party fetch. Brand marks use committed SVG path data with verified source URL/license. No runtime logo dependency, drawn approximation or letter stand-in; report unverified marks.
- PostHog initializes once in `instrumentation-client.ts`. One past-tense `snake_case` event per meaningful intent; plans record fixed property vocabularies. Demo compositions use `ph-no-autocapture`. Capture never blocks navigation; failures are contained. Reduce auth URLs to origin/path. Owner allows product text in replay; passwords stay masked.
- Root layout owns default metadata and `metadataBase`; pages override only genuine differences. Preview images use the file-based route convention.
- Every prompt identifies untrusted text as data. User-supplied URL fetches use the SSRF-hardened helper; handles/return paths use their single validation modules. Auth errors never reveal whether an email exists.
- pnpm only. App commands are in `package.json`: build, start, lint, lint:write and format; `pnpm exec tsc --noEmit` typechecks. The owner starts dev inside the flow unless the host override applies. Never commit environment values. Use `rg` for text/paths/identifiers and `ast-grep` for structural syntax searches; inspect imports/aliases/dynamic uses before claiming completeness. Format touched files and review the diff after structural rewrites.

## Execution and proof

- Stages do not run or attach to product servers or inspect runtime. Use repo source and third-party public types or shipped docs, never built or minified internals. Runtime questions become build-time checks and owner journeys.
- QC 4a exception (owner, September 23): off-screen free-port screenshots at prescribed widths and themes, no clicks, sign-in or paid calls; stop the server, review images with design-review and accessibility. Feature/amend discussion and design review may research public references and standalone previews per skill. This does not extend to critique, adjudication, build or ship. Never attach personal browser profiles.
- **Host override:** direct owner in-chat runtime requests override the stage server restriction immediately, in the same session, between or after stages too. No new session or rule change is needed. Owner-requested login is pre-authorized. Codex and Claude browsers stay in the background; never front a tab or pane or open on his display.
- Proof is build, boot and usable access: build, typecheck and a named owner journey. No comprehensive suites, benchmarks, multi-case harnesses or deployment checks unless ordered. Pushing ends the job; source checks do not establish successful external delivery.
- One shared Supabase project: apply and mirror migrations during build. Signature retirement's window until ship is accepted; never re-ask for preview DB or timing approval. No dedicated test account is configured. Removing the old mailbox does not establish deletion of its Auth user record.
- Labs and harnesses run independent calls concurrently, only true dependencies serially; record concurrency in the header (owner, September 26). This authorizes no new lab or worktree.
- Edit surgically. No new hidden folders unless owner names one. Existing `.claude/`, `.codex/`, `.agents/`, `.feature/`, `.github/` are exceptions. Evidence uses visible, plainly named, git-ignored `scratch/` subfolders.
