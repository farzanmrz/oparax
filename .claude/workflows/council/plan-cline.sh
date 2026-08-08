#!/usr/bin/env bash
# Council member: Cline (ClinePass open-weight models). One-shot, read-only, schema-bound.
# Usage: plan-cline.sh <prompt-file> <schema-file> <tier> <out-file>
#   tier: none|low|medium|high|xhigh  -> forwarded to --thinking (EFFORT-shaped, like codex/grok;
#         the model rides COUNCIL_MODEL, so this family is codex-shaped, NOT agy-shaped).
#
# WHY THIS WRAPPER IS LONGER THAN plan-grok.sh / plan-codex.sh
# ------------------------------------------------------------
# grok has --json-schema and codex has --output-schema: the model is CONSTRAINED and a
# lane that drifts fails closed. Cline 3.x has NO schema-constrained output — `--json`
# is only an NDJSON transcript of the conversation. GLM-5.2 advertises a
# `structured_output` capability, but the CLI does not expose it. So this lane must:
#   1. carry the schema in the PROMPT,
#   2. recover the final assistant text from the event stream,
#   3. strip markdown fences the model may add,
#   4. validate the payload key itself.
# Without step 4 a chatty lane returns prose and would read as a pass. It fails CLOSED here.
set -uo pipefail
SECONDS=0  # bash stopwatch: wall-seconds for this member (folded into OUT as .elapsed_s)
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # extract-json.py lives beside this
PF="$1"; SCHEMA="$2"; TIER="${3:-high}"; OUT="$4"
REPO="${CLAUDE_PROJECT_DIR:-$(pwd)}"
KEY="${COUNCIL_CHECK_KEY:-plan}"   # QC's find/verify stages pass "findings" / "verdict"

# Provider/model are PER-RUN flags in Cline 3.x (they were global config in 2.x — a 3.x
# upgrade is REQUIRED for this lane to work at all). Default to the ClinePass router.
PROVIDER="${COUNCIL_PROVIDER:-cline}"
# MUST be vendor-prefixed: the `cline` provider rejects a bare id outright with
# "invalid model format. Expected format: modelType/model". The old default here was
# a bare `glm-5.2`, which could never have bound. On ClinePass use `cline-pass/<model>`.
# Default is kimi-k3: measured as the only lane that both conformed to the schema AND
# discarded a candidate finding after the code refuted it.
MODEL="${COUNCIL_MODEL:-moonshotai/kimi-k3}"

# Read-only posture — THREE layers, because Cline has no `--sandbox read-only` and
# plan mode is NOT an enforced sandbox.
#
# The docs give plan mode one sentence ("cannot modify any files or execute commands")
# and justify it as *focus*, not as a guard. Where Cline really enforces something it
# says so: the subagents page names a hard tool allowlist. It does not for plan mode.
# Worse, auto-approve explicitly lists "Mode transitions (Plan to Act)" as auto-
# approvable — and this lane must pass `--auto-approve true` or it blocks forever and
# returns no JSON. So a model that decides it has planned enough can flip to Act with
# approval pre-granted, and write.
#
# Layer 1: plan mode. Free, probably helps, guarantees nothing.
MODE_FLAG=()
[ "${COUNCIL_CLINE_MODE:-plan}" = "plan" ] && MODE_FLAG=(-p)

# ---- TIER IS MODEL-SHAPED HERE, NOT FAMILY-SHAPED ----------------------------------
# run.sh documents tier as family-shaped (agy fuses model+effort; codex/grok are effort
# only). Cline is a FOURTH shape: each MODEL exposes its own reasoning ladder, read from
# the binary's model catalog. Measured on cline 3.0.51:
#   moonshotai/kimi-k3        effort  none|low|high|max   <- NO "medium"
#   z-ai/glm-5.2              effort  high|max            <- "high" is the FLOOR
#   minimax/minimax-m3        toggle  (binary, not a ladder)
#   deepseek/deepseek-v4-pro  none    (no effort axis exposed)
#   deepseek/deepseek-v4-flash  none  (standing roster lane since 2026-08-08, replacing
#                                      v4-pro whose 27-minute depth never fit the gated
#                                      round; matches the same *deepseek-v4* clamp arm)
#   openrouter/free           none
# So a single COUNCIL_TIER cannot be correct across the family, and Cline's own default
# (--thinking medium) is invalid for kimi-k3. Clamp to what the model actually accepts,
# and OMIT the flag entirely where there is no effort axis — `allowUnknownOption` means a
# bad value is silently ignored rather than erroring, so an unclamped tier would look
# like it applied while doing nothing, and any ablation over it would measure noise.
THINK_FLAG=()
case "$MODEL" in
  *kimi-k3*)      case "$TIER" in none|low|high|max) THINK_FLAG=(--thinking "$TIER") ;;
                                  *) THINK_FLAG=(--thinking high) ;; esac ;;
  *glm-5*)        case "$TIER" in high|max) THINK_FLAG=(--thinking "$TIER") ;;
                                  *) THINK_FLAG=(--thinking high) ;; esac ;;
  *minimax*)      THINK_FLAG=(--thinking high) ;;   # toggle: any value = thinking on
  *deepseek-v4*) THINK_FLAG=() ;;                  # no effort axis exposed — omit the flag
  *)              THINK_FLAG=(--thinking "$TIER") ;;
esac

# Layer 2: shell-command allowlist. Governs SHELL commands only — nothing documents it
# restricting native file-write tools — so it is not a substitute for layer 3. Keep
# allowRedirects false (its default) to close the `>` / `>>` write path. Do NOT add
# "deny":["*"]: deny rules always take precedence and would cancel the allow list.
export CLINE_COMMAND_PERMISSIONS="${CLINE_COMMAND_PERMISSIONS:-{\"allow\":[\"git log*\",\"git diff*\",\"git show*\",\"git status*\",\"rg *\",\"ls *\",\"cat *\",\"sed -n *\",\"find *\",\"wc *\",\"head *\",\"tail *\",\"grep *\"],\"allowRedirects\":false}}"

# Layer 3: DETECT writes rather than prevent them — OPT-IN isolation, default OFF.
#
# Measured: across every lane run so far (kimi-k3, deepseek-v4-pro, glm-5.2, minimax-m3,
# openrouter/free) plan mode held and NOTHING was written to the tree. The council runs
# on an ft/* branch — separate from shipped work, and any stray write is visible in
# `git status` and revertible with `git checkout`. A disposable worktree per lane costs
# real setup time and makes lanes read HEAD instead of the working tree, which is a
# behaviour change traded for a risk that has not materialised.
#
# So the default is: run against the repo, snapshot `git status` before and after, and
# FAIL the lane if the tree changed. That keeps the property that matters (a write is
# never silent) at zero cost. Set COUNCIL_CLINE_WORKTREE=1 to get real isolation when a
# lane must run while a build is in flight.
TREE_BEFORE="$(git -C "$REPO" status --porcelain --untracked-files=all 2>/dev/null)"
WORKTREE=""
if [ "${COUNCIL_CLINE_WORKTREE:-0}" = "1" ] && git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1; then
  WORKTREE="$(mktemp -d)/tree"
  if git -C "$REPO" worktree add --detach --quiet "$WORKTREE" HEAD 2>/dev/null; then
    RUN_DIR="$WORKTREE"
  else
    echo "cline lane: worktree creation failed — falling back to \$REPO (NOT isolated)" >&2
    WORKTREE=""; RUN_DIR="$REPO"
  fi
else
  RUN_DIR="$REPO"
fi
reap_worktree() {
  [ -n "$WORKTREE" ] || return 0
  git -C "$REPO" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$(dirname "$WORKTREE")" 2>/dev/null || true
}

# DO NOT add per-lane `--data-dir` / `--config`. It looks like sensible isolation and it
# BREAKS THE LANE: credentials live inside the data dir, so pointing a lane at a fresh
# temp dir leaves it unauthenticated — measured, every model returned
# "Unauthorized: ... re-authenticate your Cline account" and every smoke lane failed.
# Isolating state would require seeding the copy with secrets, which is more risk than
# the undocumented contention it guards against. Parallel lanes share ~/.cline and have
# run fine that way.
reap_state() { :; }

# Skill contamination: `.claude/skills/` is a DOCUMENTED Cline skill path, and skills are
# enabled by default when discovered. Without this the critic is advertised feature-build,
# feature-ship and verify — an orchestration flow it must not run — and could fire
# use_skill on one. Strip them from the disposable worktree, never from the real repo.
if [ -n "$WORKTREE" ]; then
  rm -rf "$WORKTREE/.claude/skills" "$WORKTREE/.agents/skills" 2>/dev/null || true
fi

# Cline's --timeout must be >= 1; it REJECTS `-t 0` ("invalid timeout") even though the
# docs call 0 the no-timeout default. The default IS no-timeout — but only when the flag
# is OMITTED. So translate 0/empty to "no flag", and pass any positive value through.
TIMEOUT_FLAG=()
case "${COUNCIL_TIMEOUT:-0}" in
  ""|0) ;;                                         # omit -> Cline's own no-timeout default
  *)    TIMEOUT_FLAG=(-t "${COUNCIL_TIMEOUT}") ;;
esac

raw_out="$(mktemp)"
raw_err="$(mktemp)"
prompt="$(mktemp)"
raw_failure="${OUT%.out.json}.raw.err"
# A restarted lane must never look complete because a previous run left a result.
rm -f "$OUT"
cleanup() { rm -f "$raw_out" "$raw_err" "$prompt"; reap_worktree; reap_state; }
trap cleanup EXIT

# Role profile, PREPENDED to the prompt rather than passed via `-s/--system`.
#
# `-s` does replace the whole template — but NOT, as an earlier version of this comment
# claimed, because the template carries tool definitions. It doesn't: 3.0.51 names tools
# in prose only and supplies them over native provider tool-calling, so `-s` would leave
# the agent able to read the repo. The real reasons are worse:
#   1. `-s` deletes the `{{CLINE_RULES}}` placeholder, the SOLE injection point for repo
#      AGENTS.md / .clinerules / ~/.agents/AGENTS.md. This profile's first line depends on
#      AGENTS.md being loaded — without it the Dormant-by-design table vanishes and the
#      critic starts filing "re-enable clustering" as a finding.
#   2. It drops the template's termination contract ("a response without tool calls is
#      the final answer"), which is the headless loop-exit condition.
# Prepending also scopes the role to ONE run: there is no per-run rules flag in the CLI,
# so a persona in .clinerules/ or AGENTS.md would leak into every interactive session in
# this repo. Missing file → fail loudly, never silently fall back to a default build agent.
PROFILE="${COUNCIL_CLINE_PROFILE:-$REPO/.cline/oparax-critic.md}"
if [ ! -f "$PROFILE" ]; then
  echo "CLINE_FAILED — critic profile missing at $PROFILE (refusing to run as a default build agent)" >&2
  exit 1
fi

# Schema goes in the prompt, because the CLI cannot enforce it.
{
  cat "$PROFILE"
  printf '\n\n---\n\n'
  cat "$PF"
  printf '\n\n---\n\n'
  printf 'OUTPUT CONTRACT — this overrides any formatting instinct.\n\n'
  printf 'Reply with ONE JSON object and NOTHING else: no prose before it, none after,\n'
  printf 'no markdown code fences, no preamble like "Here is my review".\n\n'
  printf 'Use EXACTLY these keys. Do NOT invent your own field names (no "title",\n'
  printf '"finding", "recommendation", "evidence") and do NOT invent severity values\n'
  printf '(no "low", "medium", "high"). A response with different keys is DISCARDED\n'
  printf 'UNREAD, however good the analysis inside it is.\n\n'
  printf 'Required shape — copy this structure exactly:\n\n'
  cat <<'EXAMPLE'
{
  "critiques": [
    {
      "severity": "blocking",
      "target": "Task 6 step 2 — checkHandlesExist metering",
      "critique": "The concrete gap, with the failure it causes, citing file:line you actually read.",
      "suggestion": "The concrete fix, or null if the right fix is genuinely open."
    }
  ]
}
EXAMPLE
  printf '\n"severity" is one of exactly: "blocking", "important", "minor".\n'
  printf 'Put your file:line evidence INSIDE the "critique" string — there is no\n'
  printf 'evidence field. An empty "critiques" array is valid if you truly found nothing.\n\n'
  printf 'The authoritative JSON Schema (top-level key MUST be "%s"):\n\n' "$KEY"
  cat "$SCHEMA"
} > "$prompt"

# The prompt goes as ARGV, not stdin. Both `< file` and a real shell pipe are rejected
# with "JSON output mode requires a prompt argument or piped stdin" — cline's stdin
# detection did not accept either here, so argv is the only path that works. Caught by
# selftest-cline.sh. Council prompts run ~35KB, far under macOS ARG_MAX (~1MB).
# --auto-approve true is required: in a non-TTY, approval-gated tools are otherwise denied.
cline --json \
      --auto-approve true \
      ${MODE_FLAG[@]+"${MODE_FLAG[@]}"} \
      -P "$PROVIDER" \
      -m "$MODEL" \
      ${THINK_FLAG[@]+"${THINK_FLAG[@]}"} \
      -c "$RUN_DIR" \
      ${TIMEOUT_FLAG[@]+"${TIMEOUT_FLAG[@]}"} \
      "$(cat "$prompt")" \
      > "$raw_out" 2> "$raw_err"

# Did plan mode hold? Compare the tree to its pre-run snapshot. This DETECTS rather than
# prevents, which is the right trade on an ft/* branch: a stray write is revertible, but
# a SILENT one would poison a build. Diffing against a baseline (not just "is it dirty")
# is what makes this usable on a branch that already has legitimate uncommitted work.
TREE_AFTER="$(git -C "${WORKTREE:-$REPO}" status --porcelain --untracked-files=all 2>/dev/null)"
if [ -n "$WORKTREE" ]; then TREE_BEFORE=""; fi   # a fresh worktree starts clean
if [ "$TREE_AFTER" != "$TREE_BEFORE" ]; then
  diff <(printf '%s\n' "$TREE_BEFORE") <(printf '%s\n' "$TREE_AFTER") \
    > "${OUT%.out.json}.wrote.err" 2>/dev/null || true
  echo "CLINE_FAILED (${SECONDS}s, $PROVIDER/$MODEL) — lane CHANGED the tree; plan mode did not hold. Evidence: ${OUT%.out.json}.wrote.err" >&2
  exit 1
fi

# Recover the final assistant text. Observed on cline 3.0.51: the terminal event is
# {"type":"run_result",...,"text":"..."}; older/other builds emit
# {"type":"agent_event","event":{"type":"done","text":"..."}}. Accept either, last wins.
final="$(jq -rs '
  [ .[]
    | select(type == "object")
    | if   .type == "run_result"                              then .text
      elif (.type == "agent_event" and .event.type == "done") then .event.text
      else empty end
  ] | map(select(. != null and . != "")) | last // empty
' "$raw_out" 2>/dev/null)"

# Recover the payload from free-form text. A capable model routinely returns the RIGHT
# object wrapped in prose ("Verification complete. ... {json}") or a ```json fence,
# because Cline cannot constrain output the way --output-schema/--json-schema do.
# Measured: a naive fence-strip discarded conforming payloads from kimi-k3 (8 critiques)
# and minimax-m3 (7) — extraction failures misread as model failures. The helper finds
# the longest balanced {...} carrying the payload key instead of demanding bare output.
payload="$(printf '%s' "$final" | python3 "$HERE/extract-json.py" "$KEY" 2>/dev/null)"
[ -n "$payload" ] || payload="$(printf '%s' "$final" | sed -e '/^[[:space:]]*```/d')"

if printf '%s' "$payload" | jq -e --arg k "$KEY" '
  (type == "object") and
  (.[$k] | type == "string" or type == "array" or type == "object")
' >/dev/null 2>&1; then
  cost="$(jq -rs '[.[] | select(type=="object" and .type=="run_result") | .usage.totalCost] | last // 0' "$raw_out" 2>/dev/null)"
  printf '%s' "$payload" | jq --argjson t "$SECONDS" --arg tier "$TIER" \
      --arg model "$MODEL" --argjson cost "${cost:-0}" \
      '. + {elapsed_s:$t, tier:$tier, model:$model, cost_usd:$cost}' > "$OUT"
  exit 0
else
  {
    printf '%s\n' '--- cline stderr ---'
    cat "$raw_err"
    printf '%s\n' '--- cline final text ---'
    printf '%s\n' "$final"
    printf '%s\n' '--- cline stdout (ndjson) ---'
    cat "$raw_out"
  } > "$raw_failure" 2>/dev/null || true
  echo "CLINE_FAILED (${SECONDS}s, $PROVIDER/$MODEL) — raw kept at $raw_failure" >&2; exit 1
fi
