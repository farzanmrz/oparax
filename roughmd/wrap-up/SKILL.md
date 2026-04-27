---
name: wrap-up
description: End-of-session wrap-up. Commits code, updates userjourney.md, NOTES.md, and conditionally CLAUDE.md. Use when the user says "let's wrap up", "end of session", or invokes /wrap-up.
argument-hint: ""
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
model: claude-sonnet-4-6
---

# Wrap Up

Four steps. Do them in order.

---

## Step 1: Git commit & push

Run `git status`. If there are changes:
- `git add -A`
- `git commit` with a concise one-line summary of session work
- `git push`

---

## Step 2: Update userjourney.md

Read `.claude/reference/userjourney.md`. Rewrite the file completely.

The file has two sections only — **Recent work** and **What's next**:

- **Recent work** — 4–5 bullets, one per major area. Project-level only (e.g. "Built workflow form", "Switched to OpenAI JS SDK"). No dates, no session IDs, no file-level detail. Roll off old items when adding new ones — keep the list to 5 max.
- **What's next** — one sentence: the single most immediate next step.

Use `Write` to overwrite the whole file.

---

## Step 3: Update NOTES.md

Read `NOTES.md`.
- Add any low-priority bugs or ideas raised this session that were NOT acted on.
- Remove items that were resolved this session.
- If nothing changed, skip editing.

---

## Step 4: Update CLAUDE.md (conditional)

Only run this step if any of the following are true:
- Tech stack changed (packages added/removed)
- Project layout changed (new files/directories)
- New rules or conventions established

If triggered: read `CLAUDE.md`, edit only what's stale, keep under 150 lines.

If not triggered: skip.

---

## Step 5: Final summary

```
Wrap-up complete:
- Git: [committed + pushed / nothing to commit]
- userjourney.md: updated
- NOTES.md: [added X / removed X / no changes]
- CLAUDE.md: [updated / skipped]
```
