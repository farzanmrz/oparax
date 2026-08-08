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
# Usage:  selftest.sh [--if-changed] [family ...]      (default: codex grok agy cline:kimi cline:minimax)
# Exit 0 only if every tested family passed.
#
# --if-changed exits 0 immediately when nothing that could break a lane has moved
# since the last green run. A lane breaks because a WRAPPER, a config, an agent
# profile or a CLI version changed — never because a day passed — so re-probing on
# every QC round spends three model calls to re-derive an answer that cannot have
# changed. The flow uses --if-changed; run it bare to force a probe.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${CLAUDE_PROJECT_DIR:-$(cd "$HERE/../../.." && pwd)}"
SCRATCH="$REPO/.feature/selftest"
SCHEMA="$HERE/../qc-findings-schema.json"
IF_CHANGED=0
if [ "${1:-}" = "--if-changed" ]; then IF_CHANGED=1; shift; fi
FAMILIES=("$@"); [ ${#FAMILIES[@]} -eq 0 ] && FAMILIES=(codex grok agy cline:kimi cline:minimax)

# The inputs that can actually break a lane. Stamp lives in .git/ — per-clone,
# never committed, and survives ship.sh sweeping .feature/.
STAMP="$(git -C "$REPO" rev-parse --git-dir 2>/dev/null || echo .git)/council-selftest-green"
fingerprint() {
  {
    cat "$HERE"/*.sh "$HERE"/../qc-findings-schema.json 2>/dev/null
    cat "$REPO/.grok/agents/oparax-critic.md" 2>/dev/null
    cat "$REPO/.agents/agents/oparax-critic.md" 2>/dev/null
    cat "$REPO/.codex/agents/"*.toml 2>/dev/null
    # cline --version was missing here while cline was already a default-tested family
    # (#112 finding, codex lane): a CLI upgrade could break its flags or NDJSON envelope
    # and --if-changed would still skip, treating unverified lanes as green.
    grok --version 2>/dev/null; codex --version 2>/dev/null; agy --version 2>/dev/null
    cline --version 2>/dev/null
    printf '%s' "${FAMILIES[*]}"
  } | shasum -a 256 | cut -d" " -f1
}
FP="$(fingerprint)"
if [ "$IF_CHANGED" = "1" ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP" 2>/dev/null)" = "$FP" ]; then
  echo "council selftest: skipped — wrappers, profiles and CLI versions unchanged since the last green run."
  echo "                  force a probe with: bash .claude/workflows/council/selftest.sh"
  exit 0
fi

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

# Per-family cheap dial. agy's "tier" IS its model slug (the CLI fuses model and
# effort), so its cheap dial is a flash slug, not an effort word.
cheap_model() { case "$1" in codex) echo "gpt-5.6-luna" ;; cline:kimi) echo "moonshotai/kimi-k3" ;; cline:minimax) echo "minimax/minimax-m3" ;; *) echo "" ;; esac; }
cheap_tier()  { case "$1" in agy) echo "gemini-3.6-flash-high" ;; grok|codex) echo "low" ;; cline:*) echo "high" ;; esac; }

pass=0; fail=0
printf '%-7s %-8s %-9s %s\n' FAMILY VERDICT ELAPSED DETAIL
for fam in "${FAMILIES[@]}"; do
  family="${fam%%:*}"
  label="selftest-${fam//:/-}"
  printf '%s\n' "$BRIEF" > "$SCRATCH/$label.in.txt"
  rm -f "$SCRATCH/$label.out.json"
  start=$SECONDS
  # CHEAPEST MODEL, LOWEST EFFORT, EVERY FAMILY. This proves the HARNESS — the
  # wrapper's flags, the schema binding, the output path, the parse — none of
  # which depend on model quality. Running it at review tier cost 15 minutes a
  # pass and proved nothing extra. Override per family only to debug.
  CLAUDE_PROJECT_DIR="$REPO" COUNCIL_SCRATCH="$SCRATCH" COUNCIL_SCHEMA="$SCHEMA" \
    COUNCIL_DEPTH=simple \
    COUNCIL_MODEL="${COUNCIL_MODEL:-$(cheap_model "$fam")}" \
    COUNCIL_TIER="${COUNCIL_TIER:-$(cheap_tier "$fam")}" \
    bash "$HERE/run.sh" "$family" "$label" >"$SCRATCH/$label.log" 2>&1
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

# ---- CONCURRENCY ARM: the one shape the loop above cannot reach ----------------------
#
# Everything above runs SEQUENTIALLY (`for fam in ...`), and a find round launches every
# lane AT ONCE. That gap is not academic: QC round 4 (#112 finding #19) lost the kimi lane
# to a 2423s hang at 0% CPU with zero bytes written, while its sibling minimax lane
# completed normally in the same window — and this self-test had reported 5/5 PASS twenty
# minutes earlier, because it had never run two cline lanes at the same time. Round 1 lost
# the glm lane identically. Concurrent cline invocations contend on one shared hub daemon
# (127.0.0.1:25463) and cline exposes no per-run port, so the contention cannot be designed
# out here — but it MUST be visible before a paid round rather than after it.
#
# Skipped unless at least two cline lanes are actually in FAMILIES: nothing to contend.
CLINE_FAMS=(); for f in "${FAMILIES[@]}"; do case "$f" in cline:*) CLINE_FAMS+=("$f") ;; esac; done
if [ ${#CLINE_FAMS[@]} -ge 2 ] && [ $fail -eq 0 ]; then
  echo
  echo "concurrency arm: launching ${#CLINE_FAMS[@]} cline lanes AT ONCE (the shape a find round uses)"
  cpids=(); clabels=()
  for fam in "${CLINE_FAMS[@]}"; do
    label="selftest-conc-${fam//:/-}"
    printf '%s\n' "$BRIEF" > "$SCRATCH/$label.in.txt"
    rm -f "$SCRATCH/$label.out.json"
    CLAUDE_PROJECT_DIR="$REPO" COUNCIL_SCRATCH="$SCRATCH" COUNCIL_SCHEMA="$SCHEMA" \
      COUNCIL_DEPTH=simple \
      COUNCIL_MODEL="$(cheap_model "$fam")" \
      COUNCIL_TIER="$(cheap_tier "$fam")" \
      bash "$HERE/run.sh" cline "$label" >"$SCRATCH/$label.log" 2>&1 &
    cpids+=($!); clabels+=("$label:$fam")
  done
  cstart=$SECONDS
  for i in "${!cpids[@]}"; do
    wait "${cpids[$i]}"; crc=$?
    label="${clabels[$i]%%:*}"; fam="${clabels[$i]##*:}"
    out="$SCRATCH/$label.out.json"
    if [ $crc -ne 0 ]; then
      cdetail="wrapper exit $crc — $(tail -n1 "$SCRATCH/$label.log" 2>/dev/null | cut -c1-90)"
    elif ! jq -e '.findings | type == "array"' "$out" >/dev/null 2>&1; then
      cdetail="ran concurrently but returned no schema-shaped findings array"
    else
      printf '%-14s %-8s %-9s %s\n' "$fam" PASS "$((SECONDS-cstart))s" "survived a concurrent launch"
      pass=$((pass+1)); continue
    fi
    printf '%-14s %-8s %-9s %s\n' "$fam" FAIL "$((SECONDS-cstart))s" "$cdetail"
    fail=$((fail+1))
  done
fi

echo
echo "passed $pass / $((pass+fail))   artifacts in $SCRATCH"
if [ $fail -eq 0 ]; then
  printf '%s' "$FP" > "$STAMP"
  echo "stamped green — --if-changed will skip until a wrapper, profile or CLI version moves."
  exit 0
fi
echo "A FAILING LANE IS NOT A CLEAN PASS. Fix it or record it as FAILED in the round." >&2
exit 1
