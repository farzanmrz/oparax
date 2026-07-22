#!/usr/bin/env bash
# Emits one line per plan-relevant "stack" skill:  <skill-id><TAB><one-line description>
#
# plan-synth's Stage 0 runs this and SELECTS from the output — it is the live skill
# inventory the planner fans lenses out over. Design notes:
#   - Version-agnostic: each plugin's newest cached version is resolved with `sort -V`,
#     so a plugin update is picked up with zero edits here.
#   - Scope = the stack (vercel + supabase + railway plugins) + the repo's own build
#     skills (scraping/ingestion, ai-elements, verify), MINUS the feature-* process
#     skills (they drive the flow; they are not planning inputs).
#   - Self-updating: a new skill in any of these roots appears automatically. That is the
#     whole point — the old six-boolean scope schema could only ever see a fixed menu.
#
# Contract: prints `id\tdescription`. Never fails the caller — a missing root is skipped.
set -uo pipefail

CACHE="$HOME/.claude/plugins/cache"
REPO="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# newest <plugin-root> -> newest version dir (trailing slash), empty if none
newest() { ls -d "$1"/*/ 2>/dev/null | sort -V | tail -n1; }

# one_desc <SKILL.md> -> the description value, folding a `>-`/`|` block's first line in
one_desc() {
  awk '
    /^description:/ {
      sub(/^description:[[:space:]]*/, "")
      if ($0 == ">-" || $0 == ">" || $0 == "|" || $0 == "|-" || $0 == "") { grab=1; next }
      print; exit
    }
    grab { sub(/^[[:space:]]+/, ""); print; exit }
  ' "$1"
}

emit() { # emit <skills-dir> <id-prefix>
  local dir="$1" prefix="$2" f name desc
  [ -d "$dir" ] || return 0
  for f in "$dir"/*/SKILL.md; do
    [ -f "$f" ] || continue
    name=$(awk -F': *' '/^name:/{print $2; exit}' "$f")
    [ -n "$name" ] || name=$(basename "$(dirname "$f")")
    desc=$(one_desc "$f")
    printf '%s%s\t%s\n' "$prefix" "$name" "$desc"
  done
}

# --- stack plugins (id prefix = the Skill-tool invocation namespace) ---
emit "$(newest "$CACHE/vercel/vercel-plugin")skills"          "vercel:"
emit "$(newest "$CACHE/claude-plugins-official/supabase")skills" "supabase:"
emit "$(newest "$CACHE/claude-plugins-official/railway")skills"  "railway:"

# --- repo build skills (bare ids), excluding the feature-* process skills ---
for d in "$REPO"/.claude/skills/*/; do
  [ -f "$d/SKILL.md" ] || continue
  b=$(basename "$d")
  case "$b" in feature*) continue ;; esac
  name=$(awk -F': *' '/^name:/{print $2; exit}' "$d/SKILL.md")
  [ -n "$name" ] || name="$b"
  printf '%s\t%s\n' "$name" "$(one_desc "$d/SKILL.md")"
done

# --- curated cross-cutting design lenses (not in the stack plugin caches) ---
# frontend-design ships in a marketplace whose other skills (docx/pdf/xlsx/…) are not
# plan lenses, so it is named explicitly rather than blanket-enumerated. Its newest
# marketplace copy is read for the live description.
fd=$(find "$HOME/.claude/plugins/marketplaces" -maxdepth 6 -type f -path '*frontend-design/SKILL.md' 2>/dev/null | head -n1)
if [ -n "$fd" ]; then
  printf 'frontend-design\t%s\n' "$(one_desc "$fd")"
fi
# web-design-guidelines is invocable but exposes no on-disk SKILL.md to enumerate, so it
# carries a fixed description. Update this line if the skill's remit changes.
printf 'web-design-guidelines\t%s\n' "Web Interface Guidelines review — accessibility, focus management, semantics, interaction/loading/empty states, and contrast for any UI surface."

exit 0
