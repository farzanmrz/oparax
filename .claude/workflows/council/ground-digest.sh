#!/usr/bin/env bash
# Council grounding: emit ONE deterministic text digest of the repo, sourced from a SINGLE tree.
# Usage: ground-digest.sh <repo>
# WHY THIS EXISTS: the council's Claude subagents inherit the harness session cwd, while the CLI
# members are pointed at <repo>. If both "read the repo" freely, they can read DIFFERENT trees
# (the branch-split bug: Claude on the built branch, CLIs on the unbuilt worktree). This script is
# the fix: the ONLY thing that reads app code is `find`/`cat` here, on the ONE tree passed in.
# Its stdout becomes the shared ground truth handed to every agent in every config — so grounding
# is single-source and byte-identical across the A/B/C bake-off. Read-only; never mutates <repo>.
set -uo pipefail
REPO="${1:?usage: ground-digest.sh <repo>}"
cd "$REPO" 2>/dev/null || { echo "GROUND_DIGEST_FAILED: no such repo $REPO" >&2; exit 1; }

sec() { printf '\n===== %s =====\n' "$1"; }
# cat a file with a bounded head so one huge file can't dominate the digest
head_file() { # <path> <maxlines>
  local p="$1" n="${2:-160}"
  [ -f "$p" ] || { printf '%s\n' "(absent: $p)"; return; }
  printf '%s\n' "----- $p (first $n lines) -----"
  sed -n "1,${n}p" "$p"
  local total; total="$(wc -l < "$p" | tr -d ' ')"
  [ "$total" -gt "$n" ] && printf '%s\n' "... ($((total - n)) more lines)"
}

printf 'REPO GROUND DIGEST — single-source, read-only\nrepo: %s\n' "$REPO"

sec "GIT (recent history + branch)"
git rev-parse --abbrev-ref HEAD 2>/dev/null
git log --oneline -10 2>/dev/null

sec "DIRECTORY MAP (app / components / lib — files only)"
# names only, no contents; bounded depth so it stays a map not a dump
find app components lib -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.sql' -o -name '*.md' \) 2>/dev/null \
  | sort | head -400

sec "AGENTS.md (canonical instructions — FULL)"
head_file AGENTS.md 100000

sec "docs/decisions.md (canonical decision record + BUILD ORDER — FULL)"
head_file docs/decisions.md 100000

sec ".claude/rules (path-scoped guards)"
for f in .claude/rules/*.md; do [ -f "$f" ] && head_file "$f" 400; done

sec "KEY INTERFACES (heads — for grounding interfaces, not full reads)"
for f in \
  lib/agents.ts \
  lib/format.ts \
  lib/x/link-state.ts \
  lib/x/actions.ts \
  lib/supabase/admin.ts \
  lib/supabase/database.types.ts \
  app/agents/page.tsx \
  app/agents/layout.tsx \
  app/agents/new/page.tsx \
  app/agents/settings/page.tsx \
  app/api/ingest/route.ts \
  lib/agent/draft-pipeline.ts \
  lib/notify/compose.ts ; do
  head_file "$f" 140
done

sec "EXISTING desk [id] surface (what L8 must extend — file names)"
find app/agents -type f 2>/dev/null | sort

printf '\n===== END DIGEST =====\n'
