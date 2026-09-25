#!/usr/bin/env bash
# Keeps Claude Design in step with the repo's design system (owner, September 24: "any time
# DESIGN.md changes, it knows to sync it to Claude Design"). The fingerprint covers everything the
# synced copy is built from; design-system/.synced holds the fingerprint of the last good sync.
#   design-sync.sh session   SessionStart: report drift made outside Claude (Codex, git pulls)
#   design-sync.sh stop      Stop: block the end of a turn once while the copy is stale
#   design-sync.sh mark      after a successful sync: record the new fingerprint
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
stamp=design-system/.synced

current=$(
  {
    cat DESIGN.md app/globals.css
    find components/ui design-system -type f ! -name .synced -print0 | sort -z | xargs -0 cat
  } | shasum -a 256 | cut -d' ' -f1
)

if [ "${1:-}" = mark ]; then
  echo "$current" >"$stamp"
  exit 0
fi
[ "$(cat "$stamp" 2>/dev/null)" = "$current" ] && exit 0

msg="The design system changed since the last sync to Claude Design (DESIGN.md, app/globals.css, components/ui or design-system/). Before finishing: update design-system/tokens.css and the preview cards in design-system/previews/ so they match, sync design-system/ to the owner's Claude Design project \"Oparax\" with the DesignSync tool (list_files, finalize_plan, write_files, delete_files for removed cards; the owner authorized this standing sync on September 24), then run: bash .claude/hooks/design-sync.sh mark"

case "${1:-}" in
  stop)
    # One block per stop cycle; a second stop in the same cycle is let through so a failed sync
    # cannot loop forever.
    [ "$(jq -r '.stop_hook_active // false')" = true ] && exit 0
    jq -n --arg reason "$msg" '{decision: "block", reason: $reason}'
    ;;
  *)
    jq -n --arg ctx "$msg" '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
    ;;
esac
