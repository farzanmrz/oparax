#!/bin/bash
# Reject network lookup commands whose failure can masquerade as an empty successful result.
# This is a PreToolUse guard: no permanent prompt instruction, and no network side effect occurs
# before the command is denied. Codex may expose shell input as `command` (documented Bash tool)
# or `cmd` (unified exec adapter), so accept both.
set -uo pipefail

raw="$(cat)"
[ -n "$raw" ] || exit 0
command="$(printf '%s' "$raw" | jq -r '.tool_input.command // .tool_input.cmd // empty' 2>/dev/null)"
[ -n "$command" ] || exit 0

deny() {
  jq -nc --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

if [[ "$command" =~ (^|[[:space:];&\|\(])([^[:space:];&\|]*/)?curl([[:space:]]|$) ]]; then
  has_silent=false
  has_show_error=false
  has_fail=false

  [[ "$command" == *"--silent"* ]] && has_silent=true
  [[ "$command" == *"--show-error"* ]] && has_show_error=true
  [[ "$command" == *"--fail"* ]] && has_fail=true

  # Recognize grouped short curl flags such as -fsS and -sSL.
  if printf '%s\n' "$command" | grep -Eq '(^|[[:space:]])-[[:alpha:]]*s[[:alpha:]]*([[:space:]]|$)'; then
    has_silent=true
  fi
  if printf '%s\n' "$command" | grep -Eq '(^|[[:space:]])-[[:alpha:]]*S[[:alpha:]]*([[:space:]]|$)'; then
    has_show_error=true
  fi
  if printf '%s\n' "$command" | grep -Eq '(^|[[:space:]])-[[:alpha:]]*f[[:alpha:]]*([[:space:]]|$)'; then
    has_fail=true
  fi

  if $has_silent && { ! $has_show_error || ! $has_fail; }; then
    deny "Silent curl is blocked because a DNS/HTTP failure can look like an empty successful lookup. Retry with --fail-with-body --silent --show-error (or -fsS)."
  fi

  if printf '%s\n' "$command" | grep -Eq '(^|[^|])\|([^|]|$)'; then
    pipefail_enabled=false
    pipeline_prefix="${command%%|*}"

    # Accept actual shell option syntax, not an incidental occurrence of the word
    # "pipefail" in a comment, URL, argument, or diagnostic message. Only inspect
    # text before the pipeline so enabling pipefail afterward cannot bypass the guard.
    if printf '%s\n' "$pipeline_prefix" | grep -Eq '(^|[;&(][[:space:]]*)set[[:space:]]+[^;|]*(-o|-[[:alpha:]]*o)[[:space:]]+pipefail([[:space:];&]|$)'; then
      pipefail_enabled=true
    elif printf '%s\n' "$pipeline_prefix" | grep -Eq '(^|[[:space:]])(ba|z|k)?sh[[:space:]][^;|]*-o[[:space:]]+pipefail([[:space:]]|$)'; then
      pipefail_enabled=true
    fi

    if ! $pipefail_enabled; then
      deny "A curl pipeline is blocked unless the command enables pipefail. Retry with 'set -o pipefail' and curl --fail-with-body --silent --show-error so an upstream lookup failure cannot be masked by jq or another consumer."
    fi
  fi
fi

exit 0
