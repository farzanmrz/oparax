# Customer discovery

This directory is Oparax's customer-discovery record, reduced to what was learned. It is the canonical record, published in this repository at the owner's explicit decision; nothing here quotes a conversation unless the quote itself is the finding.

## 2. Files

- **`people.tsv`:** The one ledger, one row per person contacted.
- **`reshad.md`:** Findings from Reshad Rahman, the single real user, summarized by epoch.
- **`findings.md`:** Key findings from everyone else who engaged.

## 3. Ledger schema

Columns: `cohort`, `name`, `x_handle`, `email`, `type`, `beat`, `stage`, `note`.

`stage` records the furthest thing that actually happened, never a judgment:

| Stage | Meaning |
| --- | --- |
| `contacted` | We reached out, nothing came back (note says `no contact path` where none existed) |
| `replied` | At least one reply |
| `conversed` | A real multi-message exchange |
| `demoed` | Saw a personalized demo |
| `activated` | Set up a working desk themselves |

`note` holds one short terminal fact where known (why it ended). Blank otherwise.

## 4. Aggregate outreach results

| Measure | Reporters (cold) | Creators (cold) | Total |
| --- | --- | --- | --- |
| Contacted | 178 | 23 | 202 (incl. Reshad, warm) |
| Replied or beyond | 4 (~2%) | 11 (~48%) | 16 |
| Conversed or beyond | 3 | 7 | 11 |
| Demoed | 0 | 2 | 3 (incl. Reshad) |
| Activated | 0 | 0 | 1 (Reshad, family) |
| Returned unprompted | 0 | 0 | 0 |
| Paid anything | 0 | 0 | 0 |

The two headline signals: reporters barely reply and mostly do not have the problem; creators reply readily but read inbound as sponsorship, and zero of 23 activated.

## 5. Maintenance

Update `stage`/`note` when something actually happens, update the table above when the ledger changes, and add new learning to `reshad.md` or `findings.md` as one-line findings, not transcripts.
