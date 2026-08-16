# Customer discovery records

## 1. Purpose

The `docs/biz` directory is Oparax's private customer-discovery record. It makes the current outreach state easy to inspect while preserving raw evidence for real conversations.

## 2. Canonical ledger

`@docs/biz/people.tsv` is the sole people ledger. Every person remains in this file, including people we cannot reach or should no longer pursue. Do not create a second eliminated-people ledger.

The columns, in order, are:

| Column | Meaning |
| --- | --- |
| `cohort` | The experiment slice that first introduced the person. Leave blank only when the historical cohort is genuinely unknown. |
| `name` | The person's display name. |
| `x_handle` | The X identity, without `@` and normalized to lowercase. It is the unique key for the current X-originated cohorts. |
| `email` | The email address when known, otherwise blank. |
| `type` | `reporter` or `creator`. |
| `beat` | Reporting beat or creator subject area. |
| `status` | The current operational state or terminal outcome, from the approved list below. |

Never create two rows for the same normalized `x_handle`. Merge genuine duplicate research into one row before it reaches the canonical ledger.

When an original X-sourced person's exact historical handle cannot be verified after a bounded search, leave `x_handle` blank and use the unique email as the temporary join key. Multiple blank handles do not conflict with each other, but their emails must remain unique. Resolve the handle through new source evidence before creating or renaming a raw conversation file. This is a named evidence gap, not a substitute identity.

## 3. Cohorts

The current cohorts are:

| Cohort | Meaning |
| --- | --- |
| `reporter_initial` | The initial automated X-DM outreach to reporters. |
| `creator_initial` | The initial manual outreach to content creators. |

`cohort` describes the experiment. `type` describes the person. They happen to align for the current two cohorts, but they remain separate fields for future experiments.

## 4. Statuses

Use only these statuses:

| Status | Meaning |
| --- | --- |
| `outreach` | Send the first message. |
| `followup` | Send the next message. |
| `waiting` | We have done our part and are waiting for the person. |
| `testing` | The person is actively trying Oparax or has committed to a live test. |
| `review` | The available historical evidence does not support a confident classification yet. This is temporary. |
| `unreachable` | No usable outreach path exists. |
| `uninterested` | The person explicitly declined. |
| `misaligned` | They were receptive, but the current offer or experiment does not fit. |
| `unresponsive` | They stopped responding or repeatedly no-showed after meaningful engagement. |

The last four statuses are terminal for the current experiment. They replace a separate `closed` status and reason column.

## 5. Raw conversations

`@docs/biz/people/` holds raw conversation files. The location for a person is always `@docs/biz/people/<x_handle>.md`, using the same normalized lowercase handle stored in the ledger. There is no `file` column in the TSV.

Create a conversation file when there is a real two-way conversation, then include all available messages from every relevant surface in chronological order. A file's existence means the person engaged at least once. It does not override the TSV status. A person with a file and `status = followup` is an engaged person who needs a message from us. A person with a file and a terminal status is an engaged person we should not pursue further under this experiment.

Every message uses exactly one physical line:

```text
[timestamp | email | self] exact email body, with original line breaks written as \n
[timestamp | x | other] exact X message
[timestamp | x-img | self] detailed factual description of an X image attachment
[timestamp | x | self | reaction: 👍] exact X message that the other person reacted to
```

Use `email`, `x`, or `x-img` for the surface and `self` or `other` for the sender. Preserve wording, spelling, punctuation, emojis, and URLs in `email` and `x` entries. An `x-img` entry describes what is visibly present in one attached image, including readable text and relevant interface context, without inventing intent or invisible details. When an X message and image were sent together, preserve their displayed order and use the same timestamp. Multiple images receive separate entries in displayed order.

Record a reaction on the message it targets by appending `reaction: <emoji>` inside that message's square-bracket block. Do not create a separate reaction entry. In a one-to-one conversation, a reaction on a `self` entry came from `other`, and a reaction on an `other` entry came from `self`. Preserve multiple visible reactions in displayed order, separated by spaces.

If X only exposes a minute, keep minute precision rather than inventing seconds. If X exposes only a date for an older attachment group, record that date rather than inventing a time. When several X bubbles have the same timestamp, their order in the file is their displayed order. One email, one X bubble, or one X image is one entry, even when sent immediately after another.

Repository style prohibits the literal em dash character. When it appears in a raw message, write it as `\u2014`; readers should decode that sequence as the original character during analysis.

Omit quoted copies of older email messages because those originals already have their own entries. Other than the factual descriptions required by `x-img`, do not add summaries, status notes, product interpretations, headings, or next-action instructions to raw conversation files.

## 6. Staging evidence

`@docs/biz/staging/` contains temporary evidence and reconciliation artifacts. Staging files are not sources of truth. The coordinator validates them before merging known facts into `@docs/biz/people.tsv` and raw conversation files.

Reading Gmail or X is read-only research. It never authorizes sending a message, reaction, follow, or any other external action.
