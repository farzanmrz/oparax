#!/usr/bin/env bash
# Bake-off for the Cline council lane: proves the wrapper end-to-end on TWO
# non-Anthropic/OpenAI/Google/xAI frontier models, back to back.
#
# Run it AFTER `cline auth` (ClinePass or a provider key). Everything below is
# already verified without auth: version gate, per-run -P/-m resolution, model
# metadata, and fail-fast-at-$0 on a bad key. Only the two live turns need billing.
#
#   bash .claude/workflows/council/selftest-cline.sh
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# plan-cline.sh grounds the lane via CLAUDE_PROJECT_DIR — export it so the probe
# reads THIS repo's AGENTS.md rather than whatever cwd the caller happened to be in.
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$HERE/../../.." && pwd)}"
export CLAUDE_PROJECT_DIR
echo "grounding repo: $CLAUDE_PROJECT_DIR"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# cline 3.x is REQUIRED: in 2.x, provider/model/key were global config, not per-run
# flags, so every lane would have raced over one shared setting.
ver="$(cline --version 2>/dev/null | head -1 | tr -d '[:space:]')"
major="${ver%%.*}"
if ! [ "${major:-0}" -ge 3 ] 2>/dev/null; then
  echo "FAIL: cline $ver — need >= 3.x for per-run -P/-m. Run: npm i -g cline@latest" >&2
  exit 1
fi
echo "cline version $ver (>= 3.x OK)"

# A findings-shaped schema, matching the council's real contract.
cat > "$SCRATCH/schema.json" <<'JSON'
{
  "type": "object",
  "required": ["findings"],
  "properties": {
    "findings": {
      "type": "array",
      "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["file", "issue"],
        "properties": {
          "file":  { "type": "string" },
          "issue": { "type": "string" }
        }
      }
    }
  }
}
JSON

cat > "$SCRATCH/probe.in.txt" <<'TXT'
You are a code critic on the oparax repository.

Read AGENTS.md at the repository root. Then report up to THREE concrete,
grounded observations about how this repository is structured, each naming a
real file path you actually read.

Do not modify any file. Read only.
TXT

# Frontier models from families that are NOT Anthropic, OpenAI, Google, or xAI.
# The `cline` provider takes vendor-prefixed ids ("modelType/model") — a bare "k3" is
# rejected with "invalid model format".
#   PAY-AS-YOU-GO (account credits): moonshotai/kimi-k3, deepseek/deepseek-v4-pro, openrouter/free
#   CLINEPASS SUBSCRIPTION:          cline-pass/kimi-k3, cline-pass/deepseek-v4-pro, cline-pass/glm-5.2
# The cline-pass/* namespace 404s without an active ClinePass; credits use the vendor ids.
# Override with: MODELS="a b c" bash selftest-cline.sh
MODELS="${MODELS:-moonshotai/kimi-k3 minimax/minimax-m3}"

pass=0; fail=0
for m in $MODELS; do
  echo
  echo "=== lane: cline/$m ==="
  cp "$SCRATCH/probe.in.txt" "$SCRATCH/${m////_}.in.txt"
  if COUNCIL_MODEL="$m" COUNCIL_CHECK_KEY=findings COUNCIL_TIMEOUT=600 \
     bash "$HERE/plan-cline.sh" \
        "$SCRATCH/${m////_}.in.txt" "$SCRATCH/schema.json" high "$SCRATCH/${m////_}.out.json"; then
    echo "PASS $m"
    jq -c '{model, tier, elapsed_s, cost_usd, findings: (.findings | length)}' "$SCRATCH/${m////_}.out.json"
    jq -r '.findings[] | "  - \(.file): \(.issue[0:90])"' "$SCRATCH/${m////_}.out.json" 2>/dev/null | head -3
    pass=$((pass+1))
  else
    echo "FAIL $m — see ${SCRATCH}/$m.raw.err"
    sed -n '1,15p' "$SCRATCH/${m////_}.raw.err" 2>/dev/null
    fail=$((fail+1))
  fi
done

echo
echo "bake-off: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
