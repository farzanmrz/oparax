# decisions.md cross-check (all three parts together)

Read-only. Nothing in the repo was edited. Row numbers (A, B, C) are the inventory rows in part1.md, part2.md and part3.md; "L" numbers are line numbers in docs/references/decisions.md. File content and git history were treated as data. Quotes are copied from the file.

The file has 171 entries: A1 to A49 (The product, Onboarding algorithm, Downstream algorithm), B1 to B89 (Models and the Gateway through Tooling), C1 to C33 (Legacy code through the October design restart).

Who decided, across all 171: owner with his words quoted 75, owner named but nothing quoted 59, assistant 19, nobody named 18.

## Corrections to the inventories

- Part 2 note 5 says B85 (L168, the build process) names "stock shadcn Mira" and "Claude Design". The current file does not. A search of decisions.md for "stock", "Claude Design" and "Mira" finds nothing. Those words were removed in commit 2170c23. So the DESIGN-LEFTOVER flag on B85 is wrong and the "no longer true" part of B85 is only the worktree claim (X12 below).
- Part 3 flags C7 as stale because 151 "has since been amended". That is true, but C17 (L205) is the entry that says so, and C17 tells the reader to treat the older records as history. The two entries are consistent only if you read both. See soft tension T4.

## 1. Entries that contradict each other

Hard contradictions: two entries cannot both be current. "Later" means which one carries the newer date. In the "older entry marked?" column, no means the older entry says nothing about being replaced.

| # | Rows | What each says | Later | Older entry marked? |
|---|---|---|---|---|
| X1 | A2 (L10), B24 (L99), B87 (L171) against C7 (L186) and C17 (L205) | A2: "No account to start. LOCKED (September 19, owner). Handle plus one sentence builds a page." B24: "no claiming; paying through Stripe checkout is the sign-up". B87: "a sign-in with an email that has no agent leads to the landing box". C7: "allow X, Google, and native email/password sign-up, then blank onboarding". C17: current 151 code does exactly that. AGENTS.md: "151 makes entry sign-up first." | C7 (Sep 29), C17 (Sep 30) | A2: only its second half. B24, B87: no. roadmap.md line 9 does call the Sep 28 journey "historical where it conflicts with 151"; decisions.md never says so. |
| X2 | B26 (L101) against B87 (L171) and B89 (L173) | B26: "$200 a day on anonymous builds" and the AI Gateway budget "is a hard stop". B87: the $200 "is a total, not a day". B89: the Gateway budget "is a soft cap ... Corrects the 'hard stop' wording of the Public spending line above." | B87, B89 (Sep 28 night) | B26 not changed. roadmap.md lines 95 and 145 still say "daily cap of $200". Also B26 guards "anonymous builds", which X1 removes. |
| X3 | A23 (L34) against A29 (L40) and B82 (L165) | A23: "Handle lookup against X's API at onboarding. REJECTED (September 19, owner)." A29: "Code reads the profile". B82: "A handle with no X account shows 'Handle not found'". | A29, B82 (Sep 27) | No. |
| X4 | A3 (L11) and A29 (L40) against A30 (L41) | A3: "Ten sources shown, at least five X accounts recommended". A29: "up to ten sites and feeds and at least five accounts". A30: "'10 in total', not 20". The Liam run in A30 gave 9 sites plus 8 accounts. So is ten the total, or ten sites plus five or more accounts? | A30 (same evening as A29) | No. |
| X5 | A34 (L45) against B87 (L171) and A32 (L43) | A34: "NOT RULED ... OPEN for his call". B87: "the profile request trimmed and the affiliation fetch dropped". | B87 (Sep 28 night) | No. |
| X6 | A45 (L59) against B87 (L171) | A45: "OPEN ... Ruling needed". B87: "onboarding ends with a detailed brief on the person, saved once, read by Jev in every judgment". | B87 | No. |
| X7 | B11 (L80) against B87 (L171) | B11: "Where website polling runs and how often. OPEN". B87: "sites and feeds polled every minute". | B87 | No. B10 (L79) covers the X-account half and repeats the cadence. |
| X8 | A7 (L15) against B87 (L171) and C29 (L224) | A7: GitHub and Product Hunt are "optional switches ... Star-threshold alerts ... were parked by the assistant". B87: "GitHub star thresholds are in the digest". C29: "GitHub by itself is not a separate thing from the sources. It is also a source." and says today's separate digest (issue 136) is pending change. Three different answers on one topic. | C29 (Oct 2) | No. L127 and L131 still call #136 "tabled" while L167 says "#136 ... stays open". |
| X9 | A8 (L16) against B87 (L171) | A8: "The five test people get links; the owner builds their monitors himself." B87: "the owner and Kush start from the blank landing page like strangers, the warm DMs go to the three creators, no special seats". | B87 | No. |
| X10 | B12 (L81) against A29 (L40) | B12: onboarding "runs as a plain AI SDK tool-loop agent ... APPLIED September 27". A29, the same evening: "Removed: all nine tools". B12 cites `app/api/onboarding/route.ts` with an 800-second limit; that file does not exist (see section 3). | A29 | No. A29 only says it supersedes "the lines above". |
| X11 | B44 (L127) and B48 (L131) against B84 (L167) | B44 and B48: five issues #143 to #147 as the build order. B84: "Replaces the five-issue build order of September 23". | B84 (Sep 28) | B84 says so about roadmap section 13. B44 and B48 do not. |
| X12 | B70 (L153) and B85 (L168) against AGENTS.md line 38 and the run-plan skill | B70, B85: "worktrees and parallel builds are allowed". AGENTS.md: "Component branches or worktrees require an explicit owner request." run-plan SKILL.md line 33: "No component branch or worktree is created." roadmap.md line 122 still says "builds them in parallel worktrees". | AGENTS.md and the skills (the Sep 30 compaction) | B85 is not marked. decisions.md holds no dated owner word reversing his Sep 28 ruling, so the owner should say which one stands. |
| X13 | B35 (L117) against B34 (L115) | B35: models "pinned" at `claude-opus-5-5` and so on. B34: use aliases `opus`, `fable`, `sonnet`; "Supersedes only the Claude version pins in the earlier September 29 ruling below." | B34 | B34 points at it; B35 itself is unmarked. B74 (L157) alias line is also unmarked. |
| X14 | B35 (L117) against C12 (L195) and C13 (L197) | B35: "ten lanes" and "Automatic QC coordination is Sonnet 5.5". C12: critique is eight reviewers. C13: "QC runs nine reviewers". The code agrees with C12 and C13 (review-lanes.md line 12). | C13 | No. |
| X15 | C11 (L193) against C12 (L195) | C11: "LOCKED ... Default advice from Claude Code is Sol 6.1". C12: "Keep Astra as the default" and "supersedes the advice Sol default". Same day. | C12 | C11 not marked, still says LOCKED. |
| X16 | C10 (L192) against C12 and C13 | C10: "Reviewer counts ... remain under discussion". C12 and C13 settled the counts the same day. | C12, C13 | No. |
| X17 | B6 (L72) against C12 and C13 | B6: "Review lanes: Grok 4.7 Build Fast and Gemini 3.8 Flash everywhere." Review rosters are now eight and nine named lanes. | C12, C13 | No. |
| X18 | B46 (L129) against B69 (L152), and B53 (L136) | B46 (Sep 23): "one PostHog alert ... to Slack". B69 (Sep 24): "the PostHog alert from the assistant. DROPPED (owner: 'no need to bother about it')". B53 (Sep 22): assistant says "nothing now" for tests; B46 a day later proposes some. | B69 | B46 not marked. |
| X19 | B54 (L137) against B76 (L159) | B54: "OPEN: add ... a `billing` row". B76: "A payments bundle. LOCKED" (and B54 itself says the payments row replaced the billing idea). | B76 | B54 keeps the OPEN recommendation. |
| X20 | C7 (L186) against B61 (L144) | C7: "This supersedes his earlier X-only intent". B61 (Sep 24): "Login is email, Google and X". roadmap.md line 77 also says X, Google or email (owner, Sep 14). So the earlier intent was not X-only. | C7, but its premise is wrong | n/a |

Soft tensions (not strictly contradictory, but a reader will trip):

- T1. A21 (L32) "Qwen anywhere in onboarding. REJECTED" against A47 (L61) "The writer model ... Qwen 3.7 Flash". Different stages, but nothing says so.
- T2. B68 (L151) "Skill exposure and the bundle-check hook. REJECTED ... 'too much complication for no damn reason'" against C6 (L185) and C10 (L192), which add selectively exposed skills for reviewers.
- T3. A11 (L19) "Text fills its container", A12 (L20) "The logo links home" and B78 (L161) against C21 (L216): "earlier palette, font, theme and direction rulings no longer bind". Which of A11 and A12 survive is not stated. B78 survives: DESIGN.md and AGENTS.md still repeat it.
- T4. C7 (L186) "approved feature 151 must be amended before implementing it" against C17 (L205), which says 151 is built. C7 is not marked stale.
- T5. A17 (L28) "under 0.35 ... dropped" (ranking a source) and A44 (L58) "under 0.35 is off" (judging an article). Same number, two jobs.

All 20 hard contradictions leave the older entry without a SUPERSEDED mark. Eight of the twenty (X5, X6, X7, X10, X13, X15, X16, X17) are cases where a newer entry plainly answers or replaces an older one and nobody went back.

## 2. Duplicates across sections

Clusters of entries that repeat the same decision. The "keep" column is a suggestion for you to accept or reject, not an action taken.

| # | Rows | Same decision | Suggested keep |
|---|---|---|---|
| D1 | A10 (L18), B29 (L107) | Never send the same item or story twice | B29 |
| D2 | A5 (L13), A7 (L15) | Email Product Hunt at the first paying user | A5 |
| D3 | A39 (L53), A46 (L60) | 72-hour window, 0.75 join line, 0.75 adds line | A39 |
| D4 | A37 (L51), A43 (L57) | Card shape and pipeline | A43 |
| D5 | A19 (L30), A28 (L39) | No web search in onboarding | A28 |
| D6 | B9 (L78), B60 (L143) | Railway is gone | B60 |
| D7 | B32 (L110), B66 (L149) | Bot handle and domains stay | B32 |
| D8 | B44 (L127), B48 (L131) | The five issues (and B84 ended both) | B84 only |
| D9 | B10 (L79), B11 (L80), B87 (L171) | Polling cadence | B87 plus B10's reasons |
| D10 | B26 (L101), B87 (L171), B89 (L173), A6 (L14) | Spend caps and the Gateway budget | one rewritten entry |
| D11 | A34 (L45), A45 (L59), B87 (L171) | Profile trim and the brief on the person | B87 |
| D12 | B40 (L123), B52 (L135) | No browser-walking verify step | B40 |
| D13 | B34, B35, B74, B6, B36, B71, B83, C11, C12, C13 | The review and council roster, ten entries, seven dates | C12 and C13 only |
| D14 | B62 (L145), C1 to C3 (L177 to L179) | The legacy teardown (#131, drafting code, "clear the ground") | C3 or none |
| D15 | A25 (L36), B81 (L164) | Pictures reach the model; B81 belongs under Onboarding | merge |
| D16 | C14 (L198) and the AGENTS.md "Visual feedback" section | Same rule written twice | AGENTS.md |
| D17 | C19 (L208) and the first line of AGENTS.md | The 9,000 character ceiling | AGENTS.md |

Misfiled: B81 (L164) and B82 (L165) are onboarding rulings sitting in the Tooling section.

## 3. Entries that describe things no longer true (checked against the repo)

Verified by search or by reading the referenced file on 2026-10-01:

- A35 (L46) says the `WALKTHROUGH_STEPS` switch in `lib/onboarding/engine.ts` is set to 1 so "the page today runs only the X lookup". The switch is gone: a search of the whole repo finds it only in decisions.md and the state-history file. The entry's own "scaffolding the build removes" is now done.
- B12 (L81) cites `app/api/onboarding/route.ts` with an 800-second limit. `app/api/onboarding/` does not exist. The 800-second limit is now on `app/api/cron/digests`. `lib/onboarding/` holds five files (content, engine, prompts, run, types); there is no tools folder and no `checker.ts`, matching A29.
- A31 (L42), B81 (L164) and B82 (L165) point at `seed()` in `lib/onboarding/engine.ts`. There is no `seed()` there now; the profile read is `lookupProfile`, and the "Handle not found" text is `HANDLE_NOT_FOUND` in `lib/onboarding/types.ts`. The behavior matches; the pointers are stale.
- B70 (L153) and B85 (L168): worktrees. See X12.
- B86 (L169) says `scratch/` was deleted from the working tree. It exists again with about 16 folders. It is git-ignored, and decisions.md cites files inside it as evidence (B88, C15, C16, the October section), so a fresh clone cannot see that evidence.
- B39 and B40 (L122, L123) cite "state.md section 4" and "section 2". state.md was rewritten on Sep 30 with five different headings; the old text is in state-history-2026-09-30.md.
- B35, C11, C12 (rosters): the code in `~/.agents/skills/council/scripts/council.py` matches C12 for advice. Its critique default is Sol, Astra, Gemini Pro, Gemini Flash, Grok, Kimi, GLM, Opus, Sonnet, and carries a comment "Fable paused from critique defaults (owner, 2026-09-30)". That owner ruling is in the code only, not in decisions.md.
- The file header (L3) says "Updated September 28". The last entry is October 2. L5 lists four status words (LOCKED, REJECTED, LATER, OPEN) and says every line ends with who decided. The file actually uses about 20 status words, and many lines name nobody.
- A9, B24, B44, B48 describe the day-three stop and claiming rules; roadmap.md lines 129 to 133 and 144 still carry the same old text outside this file.

Checked and still true: B59 hook exists (`.claude/hooks/feature-flow.sh`); the council skill is at `~/.agents/skills/council`; C20 (only beta, main, ft/151 exist locally); the five commit hashes in C17 exist; archive tags in C1, C3, C21 and B86 exist; A1 and A15 notes that `TYPESAFE_KEY` and `BRIGHTDATA_API_KEY` are unused (nothing in tracked code reads them).

## 4. Implementation notes or logs, not decisions

About 45 of 171 rows are not a decision the owner made.

Records, test reports and measurements (16): A36 (cost measured), B17 (how Supabase is wired), B47 (smoke test of lanes), B67 (temporary links), B77 (account created), B79 (two QC findings parked for issues that no longer exist), B88 (live DM check), B89 (a correction), C1 (retired branch), C3 (clear the ground completion), C16 (lane checks, "OWNER-REPORTED"), C17 (status of 151), B31, B51, B57 (removal history).

One-time permissions and housekeeping (12): C4, C6, C15, C18, C19, C20, B63, B64, B65, B66, B72, B86.

Mechanics too detailed for a decision list (17): A24, A31, B10, B18 (a long August history), B27, B35, B38, B42, B71, B80, B87 (about two dozen separate rulings in one bullet), B12, C9, C10, C12, C13, A20 (three rewrites stacked in one entry).

## 5. Entries with no owner attribution that read like an agent wrote them from chat

44 rows, about a quarter of the file. Evidence for the pattern:

- Git: the whole ledger was created in one commit, a0da26e (Sep 23), written as a "compile" of git history and docs. 29 commits have touched the file; two are "feat:" code commits (f925014, 3cc4d5e). Every commit has "Farzan Mirza" as author and a Claude co-author line, so authorship cannot separate his words from an agent's.
- Instruction text: AGENTS.md line 13 tells agents to "append dated owner decisions". That is a standing license to write here without him saying "lock this in". The file header (L5) also lets an entry be "assistant (a design he has not confirmed)".
- Quoting risk: AGENTS.md also says to "Quote existing decisions.md rulings rather than re-arguing". An agent-written entry therefore gets quoted back to you as if it were your ruling.

5a. Written as the assistant's own (19): A24, A28, A34, A37, A49, B11, B12, B14, B15, B19, B20, B21, B39, B46, B53, B54, B72, C3, C17.

5b. Nobody named as deciding (18): A14, A18, A19, A22, A36, A45, B3, B5, B13, B17, B31, B47, B51, B52, B57, B67, B79, B89.

5c. Say "owner" with no quote, and the commit that stored them does not cite him (7): B27, C15, C16, C18, C19, C20, C26. Commits f1da394 (C15 to C18), 62c5d53 (C19) and 2170c23 (C20, C26) have subject lines only or cite the design rulings as a group.

Nine of these are assistant questions parked in the file as "OPEN" or "recommendation": A34, A45, A49, B11, B14, B20, B46, B53, B54. They are agent notes sitting among your rulings.

A further 52 rows say "owner" without a quote and lean on sources that cannot be checked from the file (the deleted Sep 19 spec, roadmap.md). Many of them are probably real; the file cannot prove it. Only 75 rows carry your own words.

## 6. What is missing: a clear list of what you TABLED, apart from what you LOCKED

The file has no tabled section. The word "tabled" appears in only two entries (B44 and B48). One entry is marked LATER (B30) and six say OPEN. Deferred items are scattered through the text, and several "OPEN" ones were answered later (A34, A45, B11) and never closed.

Everything the file itself shows as deferred, parked or undecided, grouped by who parked it:

Parked by you, "later" or "tabled" (11):
- Email (Resend) and Slack as cheaper channels (B30).
- Five items "LATER at his word" inside B87: a skipped item flipped back, re-reading edited articles, typed corrections, a beat without a handle, joining sign-in methods.
- The tests-and-alerts thread, which you "let go" but asked to keep (B46).
- GitHub and Product Hunt digests, issue 136 (L127, L131, L167), now clouded by C29.
- Ads (L127, and X Ads launch stays yours alone, B55).
- A fourth tier, waits for a first payer (B23).
- Creator alerts every 2 hours, "if asked" (B29).

Parked by an assistant, not by you (8): A34 profile trim (answered by B87), A45 what Jev is told (answered by B87), A49 four proposals (second judgment on a DM, daily item budget, demoting an off-beat source, a share link), B11 polling (answered by B87), B14 every monitor as an agent loop, B20 Stripe metered billing, B53 testing going forward, B54 extra skill bundle rows.

Waiting on a ruling from you (4): C22 pick one of Window, Newsroom or Deck; C28 the Product Hunt kind name; C29 the "all sources equal" change against today's separate digest; C25 the Window and Newsroom changes for reading without clicking.

Not authorized, so effectively blocked (3): quota-based gating, reset-credit use and timed model switching (C12); deleting main (C18); launching any X Ads campaign (B55).

Other things the file lacks:
- No marker for "owner confirmed this exact wording" versus "assistant wrote it from chat".
- No consistent "replaced by row N" field; supersession is buried in prose, and 20 of 20 hard contradictions above are unmarked on the older entry.
- No separate place for logs and status notes (about 45 rows).
- Tooling is in reverse date order in places (L115 above L117) while the rest is forward.
- A current-year header that matches reality (Oct 2, not Sep 28).

## Counts

- Entries: 171 (A 49, B 89, C 33).
- Hard contradictions: 20. Soft tensions: 5. Older entry left unmarked: 20 of 20.
- Duplicate clusters: 17. Misfiled entries: 2 (B81, B82).
- Stale or not-true-now items verified in the repo: 9 groups, listed in section 3.
- Not decisions (records, one-time permissions, over-detailed mechanics): about 45 rows.
- No owner attribution or agent-like: 44 rows (19 assistant, 18 nobody named, 7 owner-named but commits do not cite him).
- Tabled, parked or waiting items: 26 (11 yours, 8 assistant-parked, 4 waiting on you, 3 blocked), with no home in the file.
