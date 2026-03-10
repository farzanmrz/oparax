# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` is the main app (Next.js App Router + TypeScript).
- Route handlers and pages live in `frontend/app/` (for example, `app/dashboard/workflows/new/`).
- Shared UI components are in `frontend/components/` and `frontend/components/ui/`.
- Domain logic and integrations (Supabase, validation, prompts) live in `frontend/lib/`.
- Tests are in `frontend/__tests__/` (grouped by domain like `auth/` and `workflows/`).
- Static assets live in `frontend/public/`.
- `scripts/enforce-pnpm.cjs` enforces PNPM usage; `backend/` is currently a placeholder.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies (root delegates to `frontend/`).
- `pnpm install:frontend`: reinstall only `frontend/` dependencies.
- `pnpm dev`: run local dev server at `http://localhost:3000`.
- `pnpm build`: create production build.
- `pnpm start`: run built app.
- `pnpm lint`: run ESLint (Next.js core-web-vitals + TypeScript rules).
- `pnpm test`: run Vitest once.
- `pnpm test:watch`: run Vitest in watch mode.
- `uv sync`: install Python dependencies for root-level Python utilities.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`) with `@/*` import aliases.
- Follow existing file-local style; most app code uses 2-space indentation and no semicolons.
- Use descriptive kebab-case file names for components/utilities (for example, `workflow-card.tsx`).
- Keep Next.js conventions: `page.tsx`, `layout.tsx`, `route.ts`, and colocated `actions.ts` when needed.
- Run `pnpm lint` before opening a PR.

## Testing Guidelines
- Frameworks: Vitest + Testing Library (`jsdom`, `@testing-library/jest-dom`).
- Test files should match `__tests__/**/*.test.{ts,tsx}`.
- Add/adjust tests alongside behavior changes, especially for server actions, auth flows, and validation.
- No enforced coverage threshold is configured; maintain practical coverage for changed paths.

## Commit & Pull Request Guidelines
- Do not commit directly to `main`; use feature branches (for Codex work: `codex-ft/<issue>-<slug>` when based on `ft/<issue>-...`).
- Recent history favors concise, imperative subjects, often with prefixes like `feat:`, `fix:`, `docs:`, `refactor:`.
- Keep commits atomic; subject line should be capitalized, no period, and <= 50 chars.
- PRs should stay single-purpose and include: **Why**, **What changed**, **How to test**, **Risks**, **Links**.
- Link issues and include evidence (test output, screenshots, or logs) when relevant.

## Security & Configuration Tips
- Never commit secrets. Keep credentials in root `.env` and `frontend/.env.local` (both ignored).
- Treat Supabase service credentials as server-only; expose only publishable keys to the frontend.

## Skill Routing (Codex + Claude)
- Treat skills in this section as default operating policy for this repository.
- Do not wait for the user to name a skill if the task clearly matches one of these routes.
- State the selected skill set briefly at the start of substantial tasks.
- Prefer the smallest relevant set; avoid stacking overlapping skills unless needed.

### Core Skill Set (Always Installed for This Repo)
- `nextjs-app-router-patterns`
- `nextjs16-skills`
- `nextjs-supabase-auth`
- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `tailwind-design-system`
- `frontend-design`
- `web-design-guidelines`
- `supabase-postgres-best-practices`
- `frontend-responsive-design-standards`
- `find-skills`

### Route Skills by Task Type
- Auth, session, login/signup, forgot/reset password, route guards, recovery links:
  `nextjs-supabase-auth` + `nextjs16-skills` + `nextjs-app-router-patterns`
- Supabase schema, SQL, indexes, query performance, RLS and database architecture:
  `supabase-postgres-best-practices` (plus `nextjs-supabase-auth` when auth-coupled)
- New UI surfaces, visual redesign, layout polish, design direction:
  `frontend-design` + `tailwind-design-system`
- UI quality gate, accessibility pass, UX consistency audit:
  `web-design-guidelines` (+ `frontend-responsive-design-standards` for responsive bugs)
- Responsive/mobile defects and breakpoint regressions:
  `frontend-responsive-design-standards`
- React/Next performance optimization and refactors:
  `vercel-react-best-practices` + `vercel-composition-patterns`
- Skill discovery or uncertain fit for a new domain:
  `find-skills` first, then install/apply only what is relevant.

### Conflict Rules
- Do not combine multiple "creative direction" skills in one pass; use `frontend-design` as default creative driver.
- Use `web-design-guidelines` as a reviewer/auditor after implementation, not as the primary design generator.
- Keep architecture and styling passes separate when possible:
  auth/data correctness first, then visual polish, then performance.
