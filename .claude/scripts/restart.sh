#!/usr/bin/env bash
# Serve again whatever was served last (the design lab or the product app), from .claude/last-served.json.
# Deterministic: no model judgment. Prints two or three lines for the owner. Usage: bash .claude/scripts/restart.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
record=".claude/last-served.json"

if [ -f "$record" ]; then
  target=$(python3 -c "import json;print(json.load(open('$record'))['target'])")
  port=$(python3 -c "import json;print(json.load(open('$record'))['port'])")
  rule="the record"
elif [ -f scratch/design-recovery/server.pid ]; then
  target=lab; port=3000; rule="no record; the lab's pid file"
else
  target=product; port=3000; rule="no record and no lab pid file"
fi

pid=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)
if [ -n "$pid" ]; then
  cmd=$(ps -p "$pid" -o command= || true)
  case "$cmd" in
    *"next start"*|*"next-server"*|*"scratch/design-recovery/site"*) running=lab ;;
    *"next dev"*) running=product ;;
    *) running=other ;;
  esac
  if [ "$running" = "$target" ]; then
    echo "Already serving the $target on port $port (pid $pid), nothing restarted."
    started=0
  else
    kill "$pid"; sleep 2
    echo "Stopped the $running on port $port (pid $pid)."
    started=1
  fi
else
  started=1
fi

if [ "$started" = 1 ]; then
  if [ "$target" = lab ]; then
    if [ ! -f scratch/design-recovery/site/build/BUILD_ID ]; then
      echo "The lab has no build; building first (about three minutes)."
      (cd scratch/design-recovery/site && pnpm build >/dev/null)
    fi
    python3 scratch/design-recovery/start-preview.py --port "$port" >/dev/null
  else
    nohup pnpm dev --port "$port" >.next-dev.log 2>&1 &
  fi
  sleep 5
fi

first=$(python3 -c "import json;print(json.load(open('$record'))['pages'][0])" 2>/dev/null || echo "http://localhost:$port/")
code=$(curl -s -o /dev/null -w "%{http_code}" "$first" || echo 000)
case "$code" in
  200|307|308) ;;
  *) echo "Not answering yet: $first returned $code. Server log: scratch/design-recovery/server.log (lab) or .next-dev.log (product)."; exit 2 ;;
esac

RULE="$rule" python3 - "$record" <<'EOF'
import json, sys, datetime, os
p = sys.argv[1]
d = json.load(open(p))
d["started"] = datetime.datetime.now().astimezone().isoformat(timespec="seconds")
json.dump(d, open(p, "w"), indent=2); open(p, "a").write("\n")
print(f"Serving the {d['target']} on port {d['port']} (decided by {os.environ.get('RULE', 'the record')}).")
print(d["note"])
for page in d["pages"]:
    print(f"- {page}")
EOF
