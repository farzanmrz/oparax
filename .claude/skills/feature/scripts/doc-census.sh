#!/usr/bin/env bash
# Instruction-corpus census — the input to feature-docs' subtractive pass.
# Prints per-file bytes, longest paragraph, mean paragraph, and every paragraph
# over the 120-word ceiling, then the corpus total. Read-only; never edits.
#
# Usage: doc-census.sh [--list]      (--list also prints each offending opening line)
set -uo pipefail
REPO="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)}"
cd "$REPO" || exit 1
LIST=0; [ "${1:-}" = "--list" ] && LIST=1

python3 - "$LIST" <<'PY'
import glob, re, os, sys
LIST = sys.argv[1] == "1"
CEIL = 120

def paras(p):
    """Prose units. A list ITEM is its own unit — a block of five short bullets is
    not a wall of text, and flagging it as one sends the subtractive pass chasing
    false positives, which is worse than no census at all."""
    t = open(p, encoding="utf-8").read()
    b = re.sub(r'^---\n.*?\n---\n', '', t, flags=re.S)   # frontmatter is not prose
    b = re.sub(r'```.*?```', '', b, flags=re.S)          # nor are code blocks
    out = []
    for blk in re.split(r'\n\s*\n', b):
        blk = blk.strip()
        if not blk or blk.lstrip().startswith(('|', '#')):   # nor tables or headings
            continue
        if re.match(r'^\s*([-*+]|\d+\.)\s', blk):
            # split the block at each top-level list marker
            items = re.split(r'\n(?=\s{0,3}(?:[-*+]|\d+\.)\s)', blk)
            out.extend(i.strip() for i in items if i.strip())
        else:
            out.append(blk)
    return out

files = sorted(glob.glob('.claude/skills/*/SKILL.md')) + ['AGENTS.md']
tot = over = 0
offenders = []
print(f"{'FILE':<34}{'BYTES':>7}{'max/w':>7}{'mean':>6}{'>120w':>7}")
for p in files:
    if not os.path.exists(p):
        continue
    ws = [len(x.split()) for x in paras(p)] or [0]
    b = os.path.getsize(p); n = sum(1 for w in ws if w > CEIL)
    tot += b; over += n
    # Known limitation: an indented continuation paragraph that follows a nested
    # list can merge with its neighbours and over-count. Treat the list as a
    # ranked guide, not a gate — always eyeball the block before cutting it.
    for x in paras(p):
        if len(x.split()) > CEIL:
            offenders.append((len(x.split()), p, ' '.join(x.split())[:88]))
    name = p.replace('.claude/skills/', '').replace('/SKILL.md', '')
    print(f"{name:<34}{b:>7}{max(ws):>7}{sum(ws)//len(ws):>6}{n:>7}")

print(f"\nCORPUS {tot} B    paragraphs over {CEIL} words: {over}")
print(f"3% of AGENTS.md = {int(os.path.getsize('AGENTS.md')*0.03)} B — the round's minimum cut")
if LIST and offenders:
    print("\n--- every paragraph over the ceiling, longest first ---")
    for w, p, s in sorted(offenders, reverse=True):
        print(f"{w:>4}w  {p}\n      {s}…")
PY
