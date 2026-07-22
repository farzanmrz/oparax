#!/usr/bin/env bash
# PostToolUse(Edit|Write) — format-on-write. Applies Biome's SAFE pass (formatting,
# import sorting, auto-fixable lint) to the file that was just written, so no code
# in this repo is ever unformatted for longer than one tool call.
#
# Why it exists: this pass is a pure function, so it has no business being an agent
# task. Lifting it out of feature-lint also keeps the QC diff free of formatting
# churn — /code-review's finders read real changes only.
#
# The safe/unsafe line is Biome's own: `--write` applies safe fixes ONLY; unsafe
# fixes (e.g. react/useExhaustiveDependencies) need `--unsafe`, which is never
# passed here. Those stay with feature-lint, which risk-tiers them and flags each
# one for human review.
#
# Deliberately SILENT and always exit 0: a residual finding surfaced mid-build
# would pull an implementer off its task, and feature-lint catches it at QC anyway.
# (PostToolUse cannot block a tool call regardless — the tool has already run.)
set -uo pipefail

# The hook contract is JSON on stdin. `tool_input.file_path` is the field for both
# Edit and Write. NOTE: there is no $CLAUDE_FILE_PATHS env var — do not reach for one.
path="$(jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[ -n "$path" ] || exit 0

# Cheap pre-filter. Biome would no-op on other extensions anyway, but the whole cost
# here is process spawn (~75ms), so not spawning at all on a .md/.css write is the
# only optimization that matters.
case "$path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json) ;;
  *) exit 0 ;;
esac

biome="${CLAUDE_PROJECT_DIR:-.}/node_modules/.bin/biome"
[ -x "$biome" ] || exit 0

# Call the binary directly — `pnpm exec biome` costs ~0.70s vs ~0.075s, and all of
# that difference is pnpm's own node startup, paid on every single file write.
#
# Passing the path blindly is safe: biome.json's `files.includes` exclusions beat
# explicitly-passed paths, so the vendored kits (components/ui, components/ai-elements)
# stay byte-identical to upstream even if an agent edits one. Verified: an excluded
# path reports "Checked 0 files".
#
# Never add --unsafe here. Never use the Biome daemon (`biome start`) to shave the
# spawn cost — a persistent indexer is what made the old TypeScript-LSP setup slow.
"$biome" check --write --no-errors-on-unmatched "$path" >/dev/null 2>&1

exit 0
