# Design tooling in the feature flow

For any visual decision follow the global `reference-led-design` skill and the owner's dated design rulings in `docs/references/decisions.md`. This file covers catalogs, access and API conflicts only.

## Roles and loading

Keep existing skills, catalogs and tools. Load guidance by job:

- Official `shadcn` at `~/.agents/skills/shadcn` owns primitive/control APIs and composition. Resolve old `vercel:shadcn` references here without changing approved plan hashes. Use built-in variants first; project-approved local color/type overrides, including full-contrast disabled illustrations, remain valid. Keep primitive source stock. Choose within authorized catalogs without another registry question.
- `react-bits-pro` supplies structural, visual and motion blocks. Inspect actual source/exports and harmonize with the host page. Vendor defaults are starting points. Studio and other catalogs stay optional.
- Both global `ai-elements` and `vercel:ai-elements` apply conditionally to genuine AI interaction. Neither mandates adoption for every model-generated string, Geist typography, or a chat layout for a feed. Select a plain-text or markdown renderer from the validated content contract, not the author of the text. Choose one message/scroll family per surface from working public APIs. A monitoring feed does not imply chat.
- `reference-led-design` is the only design-taste guidance: hierarchy, composition, color, depth and motion, judged on rendered screenshots against the reference board and the owner's rejected renders. The owner retired the generic design skills on October 2, 2026. CRO/copywriting guide conversion and truthful copy, without invented metrics.
- Accessibility checks source and supplied renders, without telemetry or report uploads. Untested keyboard/runtime behavior is an owner acceptance step. Stage runtime limits still apply; no automatic Lighthouse.

The owner's verbatim words and `reference-led-design` win on aesthetics, composition and scope; official API guidance governs correct component use. Vendor instructions do not authorize purchases, theme changes, publishing or extra Agent Kit installations.

## Resolving actual skill conflicts

These project instructions override conflicting examples and aesthetic mandates in the installed skills. Preserve the vendor files and existing capabilities; select guidance by purpose rather than loading every recipe at once.

- **AI Elements APIs:** the two installed skills contain incompatible Message/Tool examples. Verify the selected component's public source/types and exact-version documentation. Do not mix Message(message)/MessageMarkdown with Message(from)/MessageResponse merely to satisfy both skills. Choose one working scroll/message family; a pictured X DM needs no live chat stack. Do not follow blanket overwrite, forced shadcn reinitialization, base migration or latest-dependency repair instructions.
- **Existing setup:** preserve the current theme provider, Tailwind v4 tokens and public package exports. Generic data-theme/Tailwind v3/CSS-module/deep-import examples authorize no configuration replacement. A Server Component may compose an imported component marked use-client; keep client boundaries small. React supports serializable Date/Map/Set values, so do not report them as inherently invalid from the Next skill's JSON-only example. The project's simpler validated contracts remain preferred.
- **Accessibility facts:** ordinary text needs 4.5:1 contrast. The 3:1 large-text exception starts at 18pt regular or 14pt bold, approximately 24px or 18.67px, not the installed accessibility skill's 18px/14px. Keep useful focus and native keyboard behavior. See [W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [React client boundaries/serializable props](https://react.dev/reference/rsc/use-client) for the corrected factual examples.
- **Copy and review:** CRO templates authorize neither invented proof nor removing the shared navigation. Apply each skill's relevant rubric, then use the stage's required review schema and plain owner-facing language, not competing vendor report formats. No telemetry, report upload or experimental spend follows from reading a skill.

## Source access

`components.json` configures `@ss-components`, `@ss-blocks`, `@ss-pages`, `@ss-illustrations`, `@ss-themes`, `@react-bits`, `@reactbits-starter` and `@reactbits-pro`. Catalogs are not skills. Claude/Codex retain shadcn and Studio MCP; React Bits uses shadcn. CLI fallback is `pnpm dlx shadcn@latest` in the target checkout. The local official shadcn skill now requests a packageManager-aware context probe instead of automatically executing npx; its current Cursor copy matches, and historical snapshots remain immutable. Inspect changes; preserve behavior and use TypeScript/Tailwind.

Pro covers components, marketing/App UI blocks and Agent Kit; Ultimate templates are separate. Use verified entitlement without repeated key-entry/checks. Keep the secret in ignored .env.local with Authorization environment interpolation, never output it or put it in a URL. Arbitrary shells/CLIs do not load .env.local automatically; the retrieving process must receive the variable. Reconnect a stale MCP process when needed.

September 30 setup recorded fresh CLI/MCP retrieval of hero-1 and list-1; the older host MCP reported missing env. The owner says lanes were manually checked and work. Offline checks confirm 27 selected folders/copies, not a live model probe. Evidence: scratch/reactbits-pro-setup/status.md and skill-distribution-verification.json.

Council lanes inspect supplied licensed source, images and provenance within read-only permissions, without MCP retrieval/install. Ordinary CLIs retain capabilities. Selected files load on demand; a council snapshot grants no slash commands or plugin access. CRO/copywriting are outside the selected 27, so supply relevant guidance when a review needs it.
