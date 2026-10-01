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

The host, actual Opus and actual Grok reached final agreement on the completed corrections. Build and run-plan now use one canonical feature checkout and one operating-system writer lease, also used by kickoff and ship. Component branches and worktrees are not created automatically. Independent research and reviews remain concurrent. Integration fixes continue into a same-checkout build and another independent review within the existing limit. Unknown dirty work is preserved, old run files are historical, and only a pass for the exact reviewed commit is accepted. Standalone QC routes product corrections through the leased build. Production remains PR-only.

Seven focused offline methods passed, plus a targeted kickoff-lease check. These used fake providers and disposable Git repositories, not real product stages, paid model builds, migrations or deployment. Native source review and actual Opus/Grok final inspection found no remaining material objection. All 27 selected skill folders matched their source copies. AGENTS.md is 8,949 UTF-8 bytes and characters with an explicit 9,000 ceiling, all fourteen named principles and mandatory references. Evidence: `scratch/tooling-sync-2026-09-30/flow-execution-result.md`, the two test logs and `council-final/`.

Commit `f1da394` with the tooling changes was pushed to origin/ft/151. Cleanup removed 18 obsolete local development branches, remote ft/149 and 16 ordinary worktrees. All useful committed work was already represented on 151; no old product code needed merging. A verified local Git bundle, local unpushed archive tags, dirty patches and unique scratch artifacts preserve recovery. Secret backup copies remain outside the repo with restricted permissions. Nothing private or paid vendor source was pushed.

Final local and remote branch names are beta, ft/151 and main. Main remains protected pending the owner's clarification; PR150 is unchanged. Two checkouts remain: the active repository on ft/151 and the old managed beta checkout at `/Users/farzanm4/.codex/worktrees/design-tooling/oparax`. The Codex archive tool refused the latter because a pinned task or workspace protects it. Do not bypass that protection. Use the active ft/151 checkout for this work; beta was not advanced by this task. Cleanup evidence is `scratch/tooling-sync-2026-09-30/cleanup-result.log` and the recovery manifest beside it.

Planning retains the September 29 sequence: owner discussion and plain plan, independent Fable/Astra detailed drafts, reconciliation, fixed critique and joint adjudication. Feature/amend has eight reviewers; QC has nine, retaining Sol 6.1 and Astra. Standalone council retains its own roster. No quota gating, reset credits, timed model switch or roster reduction is introduced by this cleanup.

## Next

The font comparison remains live on localhost:3000. The owner chooses heading and body typography before further Pro exploration. Then prepare four complete directions with actual Pro blocks, shadcn controls and the liked palette, each with landing and the Direct/Clustered feed. The page-design council uses Opus, Grok and Kimi with selected relevant skills, component source and rendered evidence. Carry an accepted result into the existing 151 product scope. Preserve the earlier product acceptance work; it is not completed by this tooling audit. Do not restart the old failed run records or launch another QC merely because this housekeeping finished.
