#!/bin/bash
# Resolve an AI Gateway model by name fragment and fail loudly on transport errors or zero matches.
set -euo pipefail

query="${1:-}"
if [ -z "$query" ]; then
  echo "usage: bash scripts/resolve-ai-gateway-model.sh <model-name-fragment>" >&2
  exit 2
fi

payload="$(curl --fail-with-body --silent --show-error https://ai-gateway.vercel.sh/v1/models)"
printf '%s' "$payload" | jq -er --arg query "$query" '
  [.data[] | select(.id | ascii_downcase | contains($query | ascii_downcase)) | {
    id,
    name,
    context_window,
    max_tokens,
    pricing,
    tags
  }]
  | if length == 0 then error("no AI Gateway model matched: " + $query) else . end
'
