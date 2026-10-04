# decisions.md audit, part 3 (line 175 to end of file)

Scope: the sections "Legacy code" (lines 175 to 186), "September 29 workflow simplification" (188 to 198), "September 30 tooling realignment" (201 to 210) and "October 1 to 2 design system restart" (212 to 228) of docs/references/decisions.md. Read-only audit. 33 entries, numbered C1 to C33. Entries in the file above line 175 are other parts' work, so a few flags point at them by line number.

Reading the "Decided by" column: "owner (quoted)" means the entry carries his words in quotation marks. "owner (no quote)" means the entry says owner but quotes nothing, so the claim cannot be checked from the file itself. "assistant" means the entry is the assistant's own record or recommendation.

| # | Title | Status as written | Date | Decided by | What it means in plain words | Flag |
|---|---|---|---|---|---|---|
| C1 | Issue #131, August monitoring pivot branch | RETIRED | September | owner (no quote) | An old August attempt at the monitoring product was never merged; it is kept only as an archive tag and its five database tables are gone. | STALE |
| C2 | Voice, drafting and posting code | LOCKED as dead | Sept 18 to 22 | owner (no quote) | The old drafting and posting product is dead; the entry also holds a 22 September size audit of how much old code there was. | STALE |
| C3 | Clear the ground, completion | SHIPPED | Sept 24 | assistant | Records that the legacy code and 69,993 old database rows were deleted on 24 September, and that an earlier "all tables empty" claim was an assistant error. | STALE; TOO-DETAILED |
| C4 | Design tooling before a rendered choice | AUTHORIZED | Sept 28 | owner (quoted) | He allowed the design tool setup (shadcn skill, Studio, React Bits catalog) so you could "build toward something"; it was a one-time permission, not a purchase. | STALE; DESIGN-LEFTOVER |
| C5 | Design guidance for external CLIs is additive only | LOCKED | Sept 29 | owner (quoted) | When adding design guidance for other agents' command-line tools, never turn off anything they already have; only add. | |
| C6 | Reviewer additions remain read-only | AUTHORIZED | Sept 29 | owner (no quote) | Review agents may be given extra skills and research tools, but they stay read-only and get selected guidance, not whole plugin catalogs. | |
| C7 | New-account entry choices | REQUESTED | Sept 29 | owner (no quote) | He asked for sign-up with X, Google or email and password, then blank onboarding, then the feed; it says feature 151 must be amended first, which has since happened (see C17). | STALE |
| C8 | Fable plans; Astra drafts the detail once | SUPERSEDED | Sept 29 | owner (no quote) | An earlier 29 September planning arrangement that the next entry (C9) replaced; kept only as history. | STALE |
| C9 | Detailed planning pair and joint adjudication | LOCKED | Sept 29 | owner (no quote) | After he approves a plain plan, Fable and Astra each draft the detail, reconcile, then both answer the outside reviewers' findings together. | TOO-DETAILED |
| C10 | Reviewer skill coverage includes the product stack | LOCKED | Sept 29 | owner (no quote) | Reviewers should be able to load skills for AI Gateway, AI SDK, AI Elements and Supabase when relevant, still read-only; reviewer counts were left "under discussion". | TOO-DETAILED |
| C11 | Advice council keeps other providers and one outside voice | LOCKED | Sept 29 | owner (quoted) | The default advice panel drops Fable and Astra and uses Sol 6.1 (from Claude Code) or Opus (from Codex) plus Gemini, Grok, Kimi, GLM and Muse. | SUPERSEDED-UNMARKED; CONTRADICTS #12 |
| C12 | Retain Astra in advice and feature/amend | LOCKED | Sept 29 | owner (quoted) | He put Astra back as the advice default and in feature and amend critique, listing the exact reviewer rosters for each stage. | TOO-DETAILED |
| C13 | QC retains Astra alongside Sol | LOCKED | Sept 29 | owner (quoted) | Automatic quality checking uses nine named reviewers, Astra added back next to Sol. | TOO-DETAILED |
| C14 | Visual annotation interpretation in project instructions | LOCKED | Sept 30 | owner (quoted) | When he sends dictated visual comments, agents read them as intent and treat selectors and screenshots as evidence; this lives as a short rule in the project AGENTS.md, not a hook or global file. | |
| C15 | React Bits Pro access and toolkit | AUTHORIZED | Sept 30 | owner (no quote) | Pro was bought; its license key is pulled into ignored env files and its skill exposed to agents, alongside shadcn and AI Elements. | AGENT-ADDED?; TOO-DETAILED |
| C16 | Lane checks and evidence | OWNER-REPORTED | Sept 30 | owner (no quote) | He says he manually checked every review lane and all work; automated checks are recorded as separate evidence. This is a status report, not a decision. | AGENT-ADDED? |
| C17 | Signup-first source status | RECORDED | Sept 30 | assistant | A status note: feature 151 code supports X, Google and email sign-up with 31 steps built, and no clean QC or owner acceptance is established. Status belongs in state.md, not here. | AGENT-ADDED?; STALE |
| C18 | Focused records and Git cleanup | AUTHORIZED | Sept 30 | owner (no quote) | One-time permission to compact the instruction files, fix conflicting records, push 151 and prune obsolete branches (no main deletion, no force-push). | AGENT-ADDED?; STALE |
| C19 | Compact operating instructions | (none; dated entry) | Sept 30 | owner (no quote) | AGENTS.md must stay under 9,000 characters and bytes, with detail pushed into reference files. | AGENT-ADDED?; TOO-DETAILED |
| C20 | Retained branches | CONFIRMED | Sept 30 | owner (no quote) | Keep only beta, main and ft/151; other branches are removed after preserving them (verified: the repo now has exactly those three). | AGENT-ADDED? |
| C21 | Old theming guidance removed; reference-led-design is the method | LOCKED | Oct 2 | owner (quoted) | All old palette, font and theme guidance is deleted; visual work follows the reference-led-design skill and his own words, and older design rulings no longer bind. | |
| C22 | Three feed directions accepted, none chosen | OPEN | Oct 2 | owner (quoted) | Window, Newsroom and Deck all work in dark and light; he cannot yet pick one. | |
| C23 | Functional color is allowed | LOCKED | Oct 1 to 2 | owner (quoted) | Color is fine when it carries meaning (green healthy, amber warning, red failure), not as decoration. | |
| C24 | The feed carries the design; the landing follows | LOCKED | Oct 1 | owner (no quote) | Visual themes are worked out on the feed page, and the landing page is derived from that. | |
| C25 | Reading without clicking, balanced by subtraction | LOCKED | Oct 2 | owner (quoted) | Every page shows its content without clicking or scrolling, and the feed shows several stories at once, but the way to get there is removing things, not adding them. | |
| C26 | Theme exploration only when he asks | LOCKED | Oct 2 | owner (no quote) | If he dislikes the theme or accent, the agent asks before starting a separate color exploration, and never explores by default once a theme is fixed. | AGENT-ADDED? |
| C27 | References only from platforms he names | LOCKED | Oct 2 | owner (quoted) | Design inspiration may come only from products he has named (Linear, Supabase, Vercel, Ramp, Stripe, X, Facebook, Perplexity Discover, Feedly). | |
| C28 | A report is one input from one unique source | LOCKED | Oct 2 | owner (quoted) | "Report" means one input from one source (tweet, article, repository); cards name the kind and never show two different counts side by side. | |
| C29 | All sources are equal inputs | LOCKED | Oct 2 | owner (quoted) | GitHub and Product Hunt are ordinary sources like X, RSS and websites, which conflicts with the earlier plan of separate daily digests. | CONTRADICTS earlier digest entries (line 15, and line 171 on star thresholds in the digest) |
| C30 | Status tiles for glanceable state | LOCKED | Oct 2 | owner (quoted) | He picked "number 3" of the council's options for small tiles showing state at a glance; the options themselves are not in this file. | |
| C31 | Images when balanced | LOCKED | Oct 2 | owner (quoted) | A story card can show an image when one exists, and cards with and without images must look right together. | |
| C32 | Google News feeds by recommendation and user approval | LOCKED | Oct 2 | owner (quoted) | The agent may suggest a Google News feed, but the person must approve adding it. | |
| C33 | Articles rewritten into credited cards | LOCKED | Oct 2 | owner (quoted) | Articles are rewritten into cards in our own wording while still crediting the original writer. | |

## Counts

Entries: 33.

Decided by: owner (quoted) 17 (C4, C5, C11, C12, C13, C14, C21, C22, C23, C25, C27, C28, C29, C30, C31, C32, C33); owner (no quote) 14 (C1, C2, C6, C7, C8, C9, C10, C15, C16, C18, C19, C20, C24, C26); assistant 2 (C3, C17); unclear 0.

Flags (a row can carry two): blank 14; STALE 8; TOO-DETAILED 7; AGENT-ADDED? 7; CONTRADICTS 2 (C11, C29); SUPERSEDED-UNMARKED 1 (C11); DESIGN-LEFTOVER 1 (C4); DUPLICATE 0. 19 rows carry at least one flag.

## Notes beyond the flags

- C14 restates what is already in the project AGENTS.md "Visual feedback" section, so the entry could shrink to one line pointing there (not flagged DUPLICATE because the duplicate is outside decisions.md).
- C11 and C12 disagree on the advice default (Sol versus Astra) and C11 is not marked superseded. C12 does say it replaces the "advice Sol default", so the pair resolves to C12, but C11 stays in the file with LOCKED on it. The older "Tooling" section (line 117, outside this part) still says council runs ten lanes plus Muse and QC coordination is Sonnet medium; C12 and C13 say eight and nine, so those lines conflict with this part and carry no SUPERSEDED mark.
- C10 ends with "reviewer counts ... remain under discussion", which C12 and C13 settled the same day.
- C21 says earlier palette, font, theme and direction rulings no longer bind. Those older rulings (for example lines 19 and 20, "Text fills its container" and "The logo links home", and line 161 on the design system changing only on his word) still sit above in the file without any mark; they are DESIGN-LEFTOVER candidates for the other parts' reviewers.
- C16, C17, C18 and C20 are status reports or one-time permissions, not durable decisions; they are the entries most likely to be removable without losing anything the owner decided.
- C26 and C27 are rules about how agents behave; C27 has a quote, C26 does not.

## Git evidence (who and what added the AGENT-ADDED? entries)

All commits are authored under the owner's own git identity ("Farzan Mirza", the same name on every commit), so the author field does not show whether the owner or an agent wrote the text. The only useful signals are the commit messages and trailers. `git blame -L 175,228` plus `git log -L` give this line-to-commit map:

| Entry (line) | Commit that added it | Date | What the commit message says | Cites the owner? |
|---|---|---|---|---|
| C15 React Bits Pro (203) | f1da394 | 2026-09-30 | Subject only: "meta: align Pro guidance and simplify feature execution". No body. | No. Neither decisions.md nor an owner instruction is mentioned. |
| C16 Lane checks (204) | f1da394 | 2026-09-30 | Same commit and message as C15. | No. |
| C17 Signup-first status (205) | f1da394 | 2026-09-30 | Same commit and message as C15. | No. |
| C18 Focused records and Git cleanup (206) | f1da394 | 2026-09-30 | Same commit and message as C15. | No. |
| C14 Visual annotation (198) | f1da394 | 2026-09-30 | Same commit and message as C15. | No (but the entry itself quotes him). |
| C19 Compact operating instructions (208) | 62c5d53 | 2026-09-30 | Subject only: "docs: record verified workflow and branch consolidation". No body, no trailer. | No. |
| C20 Retained branches (210) | 2170c23 | 2026-10-01 | Body says the owner ordered design theming rules removed and that decisions.md gained "the owner's dated October 1 to 2 design rulings". It does not mention branches. | No for this entry. The commit's owner citation covers the design rulings only. |
| C26 Theme exploration (221) | 2170c23 | 2026-10-01 | Same commit; its body does cite the owner's design rulings and the evidence files, with trailer "Co-Authored-By: Claude Opus 5.5". | Partly. The commit cites "the owner's dated October 1 to 2 design rulings" as a group, with the evidence file OPEN-ITEMS.md, but the entry has no quote. |

Supporting commits for context:

- C6, C7 (lines 185, 186) and C9 to C13 (190 to 197): commit 2b93bac, 2026-09-29, "Owner-authorized edits made in the design-delivery chat", trailer "Co-Authored-By: Claude Fable 5.1". It is the one commit in this part whose message states owner authorization, and it lists the planning protocol, the eight-lane critique and nine-lane QC rosters. This matches C12 and C13 in content.
- C4 (181): commit 021fe9a, 2026-09-28, "meta: connect official shadcn and design catalogs to feature flow". No body.
- C1, C2 (177, 178): commit 3cc4d5e, 2026-09-24, the feature commit "clear the ground" (#148). C3 (179): commit b0f2430, 2026-09-24, "docs: #148 shipped ... the inventory error corrected". These were agent work recorded the same day as the deletion.
- 2170c23 also edited lines 190 to 192, 203 to 206, 210 and 216 to strip design theming text, so these entries were touched after they were first written; the removed wording is retrievable at 867c023 or the tag archive/design-theming-2026-10-02.
- `git blame` shows the section header "September 30 tooling realignment" (line 201) and the whole October section were added in 2170c23, whose message says it moved the design rulings in so "the pointers lead somewhere".

Conclusion on provenance: nothing in the commit messages for C15 to C20 shows the owner asked for those entries to be added to decisions.md. Entries C14, C19 and C20 may reflect his real statements (C14 quotes him, C20 repeats a dictated branch name) but the commits that stored them do not say so, which fits his suspicion that agents record from chat without a "lock this in" instruction.

## Checks done against the repo

- Branches present: beta, main, ft/151 (local) and origin counterparts. C20 matches reality.
- Archive tags named in C1, C3 and C21 exist (archive/ft-131-monitoring-pivot, archive/legacy-drafting, archive/design-theming-2026-10-02).
- The evidence files cited by C15, C16 and the October section exist under scratch/ (reactbits-pro-setup/lane-audit.md, design-recovery/focus-review/); scratch/tooling-sync-2026-09-30/request.md exists too.
- Not verified: the owner quotes themselves (no transcript was searched), and whether the 31-step build in C17 is committed as claimed beyond the five commit hashes named there.
