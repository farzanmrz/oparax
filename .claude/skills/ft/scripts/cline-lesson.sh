#!/usr/bin/env bash
# Appends one bounded lesson line for cline lanes to read next time. Inline,
# synchronous, zero-dispatch: the caller (ft-find phase 5, ft-spec
# phase 6) already holds the adjudication verdict when it calls this — see
# .cline/lessons.md's own header for what qualifies as a lesson and why the
# file is capped instead of growing forever.
#
# Usage: cline-lesson.sh "<one-line lesson, plain text>"
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../../../.." && pwd)"
FILE="$REPO/.cline/lessons.md"
CAP="${CLINE_LESSON_CAP:-8}"
MARK='<!-- LESSONS (most recent last) -->'

LINE="${1:?usage: cline-lesson.sh "<one-line lesson>"}"
LINE="$(printf '%s' "$LINE" | tr '\n' ' ')"   # a lesson is always one line

[ -f "$FILE" ] || { echo "cline-lesson.sh: $FILE missing — not creating it silently" >&2; exit 1; }
grep -qF "$MARK" "$FILE" || { echo "cline-lesson.sh: marker line missing from $FILE" >&2; exit 1; }

STAMP="$(date -u +%Y-%m-%d 2>/dev/null || echo unknown-date)"
awk -v mark="$MARK" -v newline="- ${STAMP}: ${LINE}" -v cap="$CAP" '
  found { entries[++n] = $0; next }
  { header = header $0 "\n" }
  $0 == mark { found = 1 }
  END {
    printf "%s", header
    entries[++n] = newline
    start = (n > cap) ? n - cap + 1 : 1
    for (i = start; i <= n; i++) if (entries[i] != "") print entries[i]
  }
' "$FILE" > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
echo "cline-lesson.sh: appended (now $(grep -c '^- ' "$FILE" 2>/dev/null || echo 0) / $CAP lessons)"
