# The downstream algorithm: from a new item to a story card

The algorithm is built; its specification is now the code in `lib/collect/` (polling and items), `lib/feed/` (fit, grouping, adds, writing and checks) and `lib/alerts/` (delivery). The full September 27 write-up with its R-numbered rules is in git history. The owner's rulings stay here verbatim; the R and section numbers point into that write-up. What he later reversed is in [references/decisions.md](references/decisions.md).

## Rulings of September 28 (owner)

- Alerts: one DM per clustered story, ever, carrying the story's link on the site; later reports improve the card and never DM again. Hobby and Creator once a day (Creator every 2 hours later if asked); Wire a mini digest every 15 minutes when there is news, or nothing. No instant alerts. This replaces R21's alert on a changed card and the daily digest of section 10.
- Grouping is in this build ("that stays. Obviously, that's a part of this"), articles only at first; watched X posts join stories later. The 72-hour window (R10), the 0.75 join line (R11) and the 0.75 adds line (R14) are the assistant's defaults, recorded as such, not tuned by him.
- The fit line is 0.5 on, 0.35 off, and the unsure band counts as off (R7, R8; his one yes on the reconciliation, first agreed September 26).
- The writer is Qwen 3.7 Flash with Jev doing the checks (section 7; first said September 26). Fact checking stays as R18 ("Jev can be a pretty good check"): support and attribution per fact, one repair pass.
- Day zero is each source's 10 newest items from the last 2 days (R25; first said September 26).
- Watched X accounts are polled from a Vercel cron, every minute for Wire and every five minutes otherwise, with replies and reposts excluded so they are never billed; the Activity API serves only the bot's incoming DMs. Their posts enter this pipeline as items in a later step.
