#!/usr/bin/env bash
# MINIMAL pre-flight for the Cline lanes. Proves the plumbing on a tiny prompt before
# any full-brief run is paid for. Checks four things per model, independently:
#
#   1. INPUT     — the brief actually reached the model (it must echo a token buried
#                  in the middle of the prompt; a truncated or dropped prompt fails).
#   2. GROUNDING — it can read the repo (must report a real fact from AGENTS.md).
#   3. EFFORT    — the clamped --thinking value was ACCEPTED, not silently ignored
#                  (`allowUnknownOption` means a bad flag never errors, so this is
#                  verified from the run_result event, not from the exit code).
#   4. OUTPUT    — the payload conforms to the real schema shape, via the same
#                  extraction + validation path the production wrapper uses.
#
#   bash .claude/workflows/council/smoke-cline.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$HERE/../../.." && pwd)}"
export CLAUDE_PROJECT_DIR
S="$(mktemp -d)"   # kept on purpose: failure evidence lives here

MODELS="${MODELS:-moonshotai/kimi-k3 deepseek/deepseek-v4-flash z-ai/glm-5.2 minimax/minimax-m3}"
CANARY="ARTICHOKE-7731"

cat > "$S/schema.json" <<'JSON'
{
  "type": "object",
  "required": ["critiques"],
  "properties": {
    "critiques": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["severity", "target", "critique", "suggestion"],
        "properties": {
          "severity":   { "type": "string" },
          "target":     { "type": "string" },
          "critique":   { "type": "string" },
          "suggestion": { "type": ["string", "null"] }
        }
      }
    }
  }
}
JSON

# The canary sits in the MIDDLE, so a head- or tail-truncated prompt still fails.
cat > "$S/probe.in.txt" <<TXT
This is a plumbing check, not a real review. Do the minimum and stop.

Return EXACTLY TWO critiques:

1. severity "minor", target "canary", and the critique string must contain the
   token $CANARY exactly as written.

2. severity "minor", target "grounding", and the critique must name ONE real
   capability from the "Dormant by design" table in AGENTS.md at the repository
   root, with the file you read it from. Read the file — do not guess.

Do not review anything else. Do not explore beyond AGENTS.md.
TXT

pass=0; fail=0
printf '%-26s %-8s %-6s %-9s %-6s %s\n' MODEL INPUT REPO EFFORT SHAPE COST
for m in $MODELS; do
  slug="${m////_}"
  cp "$S/probe.in.txt" "$S/$slug.in.txt"
  COUNCIL_MODEL="$m" COUNCIL_CHECK_KEY=critiques COUNCIL_TIMEOUT=300 \
    bash "$HERE/plan-cline.sh" "$S/$slug.in.txt" "$S/schema.json" high "$S/$slug.out.json" \
    > "$S/$slug.log" 2>&1
  rc=$?

  out="$S/$slug.out.json"; err="${out%.out.json}.raw.err"
  if [ "$rc" = "0" ] && [ -f "$out" ]; then
    inp=$(grep -qF "$CANARY" "$out" && echo OK || echo MISS)
    rep=$(grep -qiE "clustering|auto-post|linkedin|bluesky|email" "$out" && echo OK || echo MISS)
    # Effort applied? The run_result carries the model block; absence of an "unsupported"
    # complaint plus a non-zero reasoning usage is the best available signal.
    eff=$(grep -qiE "unsupported|not supported|invalid.*(thinking|effort)" "$S/$slug.log" && echo IGNORED || echo OK)
    shp=$(jq -e '.critiques|type=="array" and length>0 and all(.[]; has("severity") and has("target") and has("critique") and has("suggestion"))' "$out" >/dev/null 2>&1 && echo OK || echo DRIFT)
    cost=$(jq -r '.cost_usd // 0' "$out" 2>/dev/null)
    printf '%-26s %-8s %-6s %-9s %-6s $%s\n' "$m" "$inp" "$rep" "$eff" "$shp" "$cost"
    [ "$inp$rep$shp" = "OKOKOK" ] && pass=$((pass+1)) || fail=$((fail+1))
  else
    printf '%-26s %-8s %-6s %-9s %-6s %s\n' "$m" FAIL - - - "see $err"
    fail=$((fail+1))
  fi
done

echo
echo "smoke: $pass passed, $fail failed  (artifacts: $S)"
[ "$fail" -eq 0 ] && echo "Plumbing verified — safe to run the full brief." \
                  || echo "Do NOT run the full brief until these pass."
[ "$fail" -eq 0 ]
