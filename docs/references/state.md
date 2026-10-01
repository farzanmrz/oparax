# Where things stand

Updated September 30, 2026. Read this first in a new host session and after compaction. Earlier handoffs and instructions are preserved verbatim in [state-history-2026-09-30.md](state-history-2026-09-30.md) as non-operative history. Costs come from [cogs.md](cogs.md), rulings from [decisions.md](decisions.md), accounts from [setup.md](../setup.md), and source structure from [repo.md](repo.md).

## Current product

Feature 149 built the monitoring product and was squashed into beta. Feature 151 changes entry to sign-up first. Current code offers X, Google and native email/password registration, then blank onboarding, preparation and the per-handle feed. The feed, story links, settings, billing, alerts, digests and Contact implementation exist. Contact saves messages and attempts delivery when SMTP is configured; this is not a fresh live delivery check.

The 151 signup-first build reached step 31 of 31 (`9b04ace`). Four round-two integration fixes followed (`0842630`, `809fe7c`, `83c149a`, `de21cb4`). There is no clean post-fix QC result or owner acceptance established by this audit. Old statements that the 151 component stopped before implementation or that only onboarding exists are historical. This tooling task requests neither a new QC stage nor a production deployment.

## Current design task

The owner liked the latest free compositions and purchased React Bits Pro. Current runtime source loads Hanken Grotesk and the navy/blue light and dark palette. The separate D1 preview retains its liked navy/blue palette and existing layout. Four sans-serif heading/body comparisons have been rendered; font selection remains pending. Do not turn a comparison into a font ruling or reset production fonts during tooling cleanup.

Review at `http://localhost:3000/?d=1&view=feed&type=source`. The typography selector offers Source Sans 3 throughout, Manrope headings with Source Sans 3 body, Nunito Sans headings with Source Sans 3 body, and Open Sans throughout. URL values are `type=source`, `manrope`, `nunito` and `open`; selection persists across all four directions and landing/feed modes. Render and interaction evidence is in `scratch/design-recovery/typography-comparison/verification.md`. This is the isolated comparison, not the functional product server.

The agreed sequence is: rendered font comparisons, then the tooling audit with actual external Opus and Grok, then owner font choice, then four complete Pro directions, then owner design acceptance, then implementation in the existing 151 product. Each Pro direction includes a landing page and a feed with both Direct and Clustered modes. Direct/Clustered belongs beside the feed heading. Keep earlier annotations, screenshots and local preferences as supporting evidence. This initial exploration adds no mandatory design stop to unrelated feature stages.

The full brief and historical evidence are in [design-toolkit-proof.md](design-toolkit-proof.md); latest task authorization is `scratch/tooling-sync-2026-09-30/request.md`. Tooling council advice does not select a font or approve a page. The full page-design council follows font choice and owner readiness. The owner needs agents to discover and compose real components, show a small number of complete renders, retain feedback and carry accepted designs into the existing product.

## Toolkit and evidence

Use shadcn controls, React Bits Pro structural, visual and motion components, and AI Elements where AI interaction needs it. Pro registry Authorization Bearer interpolation is configured; the license remains only in git-ignored environment files. Arbitrary shells and CLIs do not load `.env.local` automatically, and a running MCP may predate the key. Fresh shadcn CLI and MCP retrieval passed for Pro items. Canonical Pro and narrowly wrapped Developer Tool skills were exposed additively to the participating clients and selected review snapshots. Preserve existing active tools and reviewer rosters.

Claude Code and Codex hosts retrieve and install. Restricted council lanes remain read-only and receive selected guidance, source and rendered evidence. Ordinary external clients retain their existing capabilities. Supplied source does not establish independent live catalog access. The owner reports all lanes manually checked and working. Automated checks establish distribution hashes, configuration parsing and no-provider command previews, not that every live lane was re-run by this audit. Evidence and limits are in `scratch/reactbits-pro-setup/status.md`, `lane-audit.md` beside it, and the current tooling audit records.

DESIGN.md is the contract; current runtime files describe implementation. Claude Design synchronization is manual on request and has not been verified by this audit. `design-system/` remains the historical September 24 export and must not be reapplied to production.

## Flow and branch status

All completed repository work in this task targets `ft/151`. Preserve beta and production main. The owner's request to consolidate obsolete development branches and worktrees authorizes cleanup only after unique commits, dirty work and ignored evidence/assets are preserved. Do not blindly merge obsolete product components or force-push. Production main deletion remains unapproved.

The host, Opus and Grok agreed on one active feature branch, with isolated component branches and worktrees only when the owner explicitly requests them. Unattended continuation and useful concurrent research remain available. Implementation verification and branch consolidation are in progress; their final results must be recorded here before the task is reported complete. The final inventory belongs in the current tooling audit evidence, not in the old handoff's Git bullet.

Planning retains the September 29 sequence: owner discussion and plain plan, independent Fable/Astra detailed drafts, reconciliation, fixed critique and joint adjudication. Feature/amend has eight reviewers; QC has nine, retaining Sol 6.1 and Astra. Standalone council retains its own roster. No quota gating, reset credits, timed model switch or roster reduction is introduced by this cleanup.

## Next

Finish the authorized tooling corrections, verification and safe Git consolidation, then commit and push the completed work on 151. Report the actual final branch inventory, tool access, verification limits and pending font choice in chat. The owner chooses the font before further Pro exploration. Preserve the earlier product acceptance work; do not claim it completed from source or tooling checks.
