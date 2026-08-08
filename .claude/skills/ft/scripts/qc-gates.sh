#!/usr/bin/env bash
# qc-gates.sh [diff-range] — the QC deterministic gates, as ONE script so no
# session ever improvises the compound command (improvised versions have
# shipped bugs like `echo "tsc-exit:$?"` reporting head's exit, not tsc's).
#
# Gates (hard, exit 1 on failure): pnpm build · tsc --noEmit
# Report-only (never fails the script): residual Biome findings on the
# range's changed files — residual lint is ft-fix/-lint's job, not a gate.
#
# Output contract: one "GATE <name>: PASS|FAIL" line per gate, failure
# excerpts only (trimmed), final "GATES: GREEN|RED". Exit 0 iff all hard
# gates passed.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

range="${1:-origin/beta...HEAD}"
fail=0

echo "GATE build: running (pnpm build typically takes 1-4 min; silence here is normal)..."
out="$(pnpm build 2>&1)"; rc=$?
if [ "$rc" -eq 0 ]; then
  echo "GATE build: PASS"
else
  fail=1; echo "GATE build: FAIL (exit $rc)"
  printf '%s\n' "$out" | grep -iE "error|failed" | head -20
fi

echo "GATE tsc: running..."
out="$(pnpm exec tsc --noEmit 2>&1)"; rc=$?
if [ "$rc" -eq 0 ]; then
  echo "GATE tsc: PASS"
else
  fail=1; echo "GATE tsc: FAIL (exit $rc)"
  printf '%s\n' "$out" | head -30
fi

# Skill mirror gate: every real skill under .claude/skills/ must be symlinked
# from .agents/skills/ so non-Claude harnesses see it — with deliberate
# exceptions on both sides (ft-spec is Claude-Code-only and unsymlinked;
# ft-build/ft-browse/ft-fix are Codex-only real files with no .claude side).
# Only directories containing SKILL.md count as skills; a scripts-only dir is
# not one. Do NOT "fix" a listed exception by symlinking it.
echo "GATE mirror: running..."
# Deliberately unsymlinked. CLAUDE_ONLY: real files under .claude/skills only.
# AGENTS_ONLY: real files under .agents/skills only — the Codex-only flow
# steps, plus the x-* Codex outreach helper skills.
CLAUDE_ONLY="ft-spec"
AGENTS_ONLY="ft-build ft-browse ft-fix x-check x-dm x-recheck x-stat"
mirror_fail=""
for d in .claude/skills/*/; do
  s="$(basename "$d")"
  [ -f "$d/SKILL.md" ] || continue
  case " $CLAUDE_ONLY " in *" $s "*) continue ;; esac
  [ -e ".agents/skills/$s" ] || mirror_fail="$mirror_fail missing-symlink:$s"
done
for d in .agents/skills/*/; do
  s="$(basename "$d")"
  [ -f "$d/SKILL.md" ] || continue
  [ -L "${d%/}" ] && continue
  case " $AGENTS_ONLY " in *" $s "*) continue ;; esac
  mirror_fail="$mirror_fail unexpected-agents-only:$s"
done
if [ -z "$mirror_fail" ]; then
  echo "GATE mirror: PASS"
else
  fail=1; echo "GATE mirror: FAIL —$mirror_fail"
fi

# Residual lint report (informational). NUL-safe file list; empty list = skip.
changed="$(git diff --name-only -z "$range" -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null | tr '\0' '\n' | sed '/^$/d')"
if [ -n "$changed" ]; then
  lint_out="$(printf '%s\n' "$changed" | tr '\n' '\0' | xargs -0 pnpm exec biome check --max-diagnostics=none --no-errors-on-unmatched 2>&1)"; lint_rc=$?
  if [ "$lint_rc" -eq 0 ]; then
    echo "LINT residual: none"
  else
    n="$(printf '%s\n' "$lint_out" | grep -cE "^::|lint/|format" || true)"
    echo "LINT residual: findings present (~$n lines; not a gate — ft-fix/-lint owns them)"
    printf '%s\n' "$lint_out" | tail -5
  fi
else
  echo "LINT residual: no matching changed files in $range"
fi

if [ "$fail" -eq 0 ]; then echo "GATES: GREEN"; else echo "GATES: RED"; fi
exit "$fail"
