#!/usr/bin/env bash
# Council self-test — prove every lane end-to-end BEFORE trusting a round.
#
# Why this exists, and why `preflight.sh` is not enough: preflight asks each CLI
# to echo "ok". That is a liveness check, and liveness is exactly what kept
# lying. Every real failure this flow has had was downstream of liveness — a
# broken stdout/stderr split, a schema the provider rejected with HTTP 400, a
# tmux picker that selected the wrong model, a wrapper that wrote its result
# where nobody read it. All of those pass an echo test and then return nothing
# on a real brief, and a lane that returns nothing is indistinguishable from a
# lane that found nothing. That is the silent failure.
#
# So this drives each family through the REAL path — run.sh -> the real wrapper
# -> the real schema -> the real .out.json — on a brief that forces an actual
# file read. A lane passes only when a schema-valid payload with at least one
# item comes back. Anything else is a loud, named failure.
#
# Usage:  selftest.sh [family ...]      (default: codex grok agy)
# Exit 0 only if every tested family passed.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${CLAUDE_PROJECT_DIR:-$(cd "$HERE/../../.." && pwd)}"
SCRATCH="$REPO/.feature/selftest"
SCHEMA="$HERE/../qc-findings-schema.json"
FAMILIES=("$@"); [ ${#FAMILIES[@]} -eq 0 ] && FAMILIES=(codex grok agy)

mkdir -p "$SCRATCH"
printf '*\n' > "$REPO/.feature/.gitignore" 2>/dev/null || true

# The brief. Small enough to be cheap, real enough to exercise what breaks:
# it cannot be answered without opening a file, and it must come back through
# the schema. A model that hallucinates instead of reading fails the assertion
# below, which is the point.
BRIEF=$(cat <<'EOF'
Self-test brief. Do exactly this and nothing more.

Open the file AGENTS.md at the root of this repository and read its first
heading line. Then return ONE finding whose fields are:

  file     = "AGENTS.md"
  line     = 1
  severity = "low"
  summary  = the exact text of that first heading line, including the leading "# "
  scenario = "council self-test — no action required"

Return ONLY the schema JSON object with that single finding in `findings`.
Do not review anything. Do not add findings. Do not explain.
EOF
)

pass=0; fail=0
printf '%-7s %-8s %-9s %s\n' FAMILY VERDICT ELAPSED DETAIL
for fam in "${FAMILIES[@]}"; do
  label="selftest-$fam"
  printf '%s\n' "$BRIEF" > "$SCRATCH/$label.in.txt"
  rm -f "$SCRATCH/$label.out.json"
  start=$SECONDS
  CLAUDE_PROJECT_DIR="$REPO" COUNCIL_SCRATCH="$SCRATCH" COUNCIL_SCHEMA="$SCHEMA" \
    COUNCIL_DEPTH=simple COUNCIL_MODEL="${COUNCIL_MODEL:-}" \
    bash "$HERE/run.sh" "$fam" "$label" >"$SCRATCH/$label.log" 2>&1
  rc=$?; el=$((SECONDS-start)); out="$SCRATCH/$label.out.json"

  if [ $rc -ne 0 ]; then
    detail="wrapper exit $rc — $(tail -n1 "$SCRATCH/$label.log" 2>/dev/null | cut -c1-70)"
  elif [ ! -s "$out" ]; then
    detail="exit 0 but NO output file — the silent-failure shape; check $out"
  elif ! jq -e '.findings | type == "array"' "$out" >/dev/null 2>&1; then
    detail="output is not schema-shaped (no findings array)"
  elif [ "$(jq -r '.findings | length' "$out")" -eq 0 ]; then
    detail="schema-valid but EMPTY — lane ran and returned nothing"
  elif ! jq -e '.findings[0].summary | test("Oparax")' "$out" >/dev/null 2>&1; then
    detail="returned a finding but did not read the file (summary: $(jq -r '.findings[0].summary // "?"' "$out" | cut -c1-40))"
  else
    detail="read the file and returned through the schema"
    printf '%-7s %-8s %-9s %s\n' "$fam" PASS "${el}s" "$detail"; pass=$((pass+1)); continue
  fi
  printf '%-7s %-8s %-9s %s\n' "$fam" FAIL "${el}s" "$detail"; fail=$((fail+1))
done

echo
echo "passed $pass / $((pass+fail))   artifacts in $SCRATCH"
[ $fail -eq 0 ] || { echo "A FAILING LANE IS NOT A CLEAN PASS. Fix it or record it as FAILED in the round." >&2; exit 1; }
