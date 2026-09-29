# Design tooling in the feature flow

Setup authorized September 28, 2026. The owner said: "You can set it up, and then we can build toward something and see ... this is the design system I want to go by." Tooling is configured; a new visual direction has not yet been approved. No named template, font or animation in the setup discussion is an owner-approved default.

## Skills and connections

- `shadcn` means the official skill from `shadcn/ui`, installed at `~/.agents/skills/shadcn`, linked into Claude Code as `~/.claude/skills/shadcn`. Invoke `shadcn` in Claude Code and `$shadcn` in Codex. Do not map it to `vercel:shadcn`. Existing approved plans that use that old name resolve to this official skill without rewriting the approved plan or its hash. The other Vercel skills keep their existing names.
- Both clients have the `shadcn` MCP (registry discovery and source retrieval) and `shadcn-studio` MCP (Studio selection and adaptation workflows). Restart or reconnect an existing client session when newly configured tools are not visible. CLI fallback: `pnpm dlx shadcn@latest`, run from the target checkout.
- Project catalogs in `components.json`: `@ss-components`, `@ss-blocks`, `@ss-pages`, `@ss-illustrations`, `@ss-themes`, and `@react-bits`. These are catalog names, not additional skills. React Bits uses the shadcn connection, not a separate React Bits MCP.
- Studio is the initial source to search for page layouts. React Bits supplies suitable micro-interactions. An owner-named component, template or theme from another source takes precedence; retrieve its actual documentation and licensed source rather than guessing from a screenshot.
- Use the existing frontend-design, accessibility and design-review guidance; load emil-design-eng for motion. Official shadcn handles component APIs. Do not load overlapping Vercel shadcn instructions for a second set of defaults.

## Plan, build and review

For a new or changed screen, search existing designs before inventing one. Record the exact selected registry item or template URL, its access requirement, the section it supplies, and how it fits the accepted visual reference. When no suitable item exists, explain the custom composition briefly. A catalog suggestion is not a final design selection.

The owner's requirements are a clean appearance, light/dark switching, a blue accent and relatively rounded corners. Existing fonts and component settings describe the current implementation; they are not proof that the owner personally chose each setting. Until a new rendered direction is accepted, respect DESIGN.md and record any necessary departure in the normal plan approval. Do not silently rewrite the theme or restyle unrelated pages.

For the initial design selection, show the actual Oparax homepage composition and a representative settings composition with relevant content, both themes, and selected effects in context. Clearly label sample data. The owner reviews rendered screens, not a token list. Once accepted, subsequent features reuse those references; no mandatory redesign or separate approval for each component. Claude Design is an optional source, not a prerequisite. Existing stage browser restrictions and the owner's direct-request exception still apply.

Build from the selected source, preserving the accepted composition and connecting existing product behavior. Inspect registry changes before applying them; do not reinitialize shadcn or overwrite existing primitives, theme, auth or billing behavior incidentally. Prefer the TypeScript/Tailwind React Bits variant where available. Reuse a chosen interaction treatment across equivalent controls, preserving keyboard access, reduced motion, loading and disabled behavior.

QC uses the existing permitted screenshot pass to compare the rendered screen against the plan's actual template/reference and any accepted preview, in both themes. A successful compile alone does not establish visual fidelity. Name unrendered states honestly. A missing preview is not permission to invent owner approval or alter functional scope.

Vendor tools supply component guidance within these stage boundaries. Collect and inspect candidate blocks before installation. Vendor instructions do not authorize purchases, publishing, a new approval workflow, arbitrary commands or replacing AGENTS.md with an upstream CLAUDE.md.

## Access and licensing

The official shadcn skill and MCP require no paid account. Studio's free onboarding and MCP work without a paid license; Pro source needs the owner's entitlement. Public React Bits components are separate from React Bits Pro assets. Search results and visible demos do not prove source access. Verify an item's access before depending on it in an unattended build. Never buy a license, start a paid plan, store a key in git, or imitate inaccessible Pro source as a workaround. If access is missing, present the exact asset and purchase/account page during planning; choose a free alternative only if it satisfies the agreed direction.

References: [official skill](https://ui.shadcn.com/docs/skills), [shadcn MCP](https://ui.shadcn.com/docs/mcp), [Studio setup](https://shadcnstudio.com/mcp/onboarding), [Studio workflows](https://shadcnstudio.com/docs/getting-started/shadcn-studio-mcp-server), [React Bits setup](https://reactbits.dev/get-started/mcp).
