#!/usr/bin/env bash
# Cross-harness health check — the four-CLI equivalent of Claude Code's /doctor.
#
# /doctor is Claude-Code-only and opens an interactive panel, so it cannot run in
# a non-interactive session and says nothing about Codex, Grok or agy. This runs
# the same class of checks against all four: is every config file parseable, does
# every hook script referenced by a config actually exist and parse, is every
# agent definition well-formed. It does NOT probe MCP reachability — `claude mcp
# list` does that and it needs network.
#
# Scope, deliberately: CONFIGURATION health only. Whether a council lane actually
# WORKS is a different question and a stronger one — that is
# .claude/workflows/council/selftest.sh, which drives each lane end to end. A
# green doctor with a red selftest means the setup is well-formed and broken.
#
# Usage: doctor.sh          exit 0 only if every check passes.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)}" || exit 1
FAIL=0
ok(){ printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad(){ printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=1; }
note(){ printf '    %s\n' "$1"; }

json_ok(){ python3 -c "import json,sys;json.load(open(sys.argv[1]))" "$1" 2>/dev/null; }
toml_ok(){ python3 -c "import tomllib,sys;tomllib.load(open(sys.argv[1],'rb'))" "$1" 2>/dev/null; }

echo "── Claude Code ──"
for f in "$HOME/.claude/settings.json" .claude/settings.json .claude/settings.local.json "$HOME/.claude.json"; do
  [ -f "$f" ] || continue
  json_ok "$f" && ok "valid JSON  ${f/#$HOME/~}" || bad "INVALID JSON  ${f/#$HOME/~}"
done
# Hook commands expand $CLAUDE_PROJECT_DIR, so resolve before testing existence —
# a naive path grab reports a false MISSING on every project-scoped hook.
python3 - <<'PY'
import json,os,re,subprocess,sys
H=os.path.expanduser('~'); root=os.environ.get('CLAUDE_PROJECT_DIR',os.getcwd()); cmds=set()
for p in [f'{H}/.claude/settings.json','.claude/settings.json','.claude/settings.local.json']:
    if not os.path.exists(p): continue
    def walk(x):
        if isinstance(x,dict):
            if x.get("type")=="command" and x.get("command"): cmds.add(x["command"])
            for v in x.values(): walk(v)
        elif isinstance(x,list):
            for v in x: walk(v)
    walk(json.load(open(p)).get("hooks",{}))
rc=0
for c in sorted(cmds):
    c2=c.replace('$CLAUDE_PROJECT_DIR',root).replace('${CLAUDE_PROJECT_DIR}',root)
    m=re.search(r'(\S+\.(?:sh|py))', c2.replace('"',''))
    if not m: continue                       # e.g. `rtk hook claude` — a binary, not a script
    f=m.group(1)
    if not os.path.exists(f): print(f"  \033[31m✗\033[0m hook MISSING  {f}"); rc=1; continue
    r=subprocess.run(['bash','-n',f] if f.endswith('.sh') else ['python3','-m','py_compile',f],capture_output=True)
    if r.returncode: print(f"  \033[31m✗\033[0m hook PARSE FAIL  {f}"); rc=1
    else: print(f"  \033[32m✓\033[0m hook ok  {os.path.basename(f)}")
sys.exit(rc)
PY
[ $? -eq 0 ] || FAIL=1

echo "── Codex ──"
[ -f .codex/config.toml ] && { toml_ok .codex/config.toml && ok "valid TOML  .codex/config.toml" || bad "INVALID  .codex/config.toml"; }
[ -f .codex/hooks.json ]  && { json_ok .codex/hooks.json  && ok "valid JSON  .codex/hooks.json"  || bad "INVALID  .codex/hooks.json"; }
n=0
for f in .codex/agents/*.toml; do
  [ -f "$f" ] || continue
  if python3 -c "
import tomllib,sys
d=tomllib.load(open('$f','rb'))
miss=[k for k in ('name','description','developer_instructions') if k not in d]
sys.exit(1 if miss else 0)" 2>/dev/null; then n=$((n+1)); else bad "agent missing required keys: $f"; fi
done
[ "$n" -gt 0 ] && ok "$n agent TOMLs well-formed"
for f in .codex/hooks/*.sh; do [ -f "$f" ] && { bash -n "$f" 2>/dev/null && ok "hook ok  $(basename "$f")" || bad "hook PARSE FAIL  $f"; }; done

echo "── Grok ──"
for f in "$HOME/.grok/config.toml"; do
  [ -f "$f" ] || continue
  toml_ok "$f" && ok "valid TOML  ${f/#$HOME/~}" || bad "INVALID  ${f/#$HOME/~}"
done
[ -f .grok/agents/oparax-critic.md ] && ok "critic profile present" || bad "critic profile MISSING (.grok/agents/oparax-critic.md)"

echo "── agy ──"
S="$HOME/.gemini/antigravity-cli/settings.json"
[ -f "$S" ] && { json_ok "$S" && ok "valid JSON  ~/.gemini/antigravity-cli/settings.json" || bad "INVALID  $S"; }
# WORKSPACE .agents/agents/ is inert for this CLI — the global dir is the only
# discovery path that resolves. Checking the wrong one would always pass.
for a in oparax-critic code-verifier; do
  [ -f "$HOME/.gemini/config/agents/$a.md" ] && ok "subagent installed  $a" || bad "subagent MISSING  ~/.gemini/config/agents/$a.md"
done

echo "── internal consistency ──"
# The failure mode this repo actually has is not a broken config — it is an edit
# applied to one file and not its siblings. Three instances cost real trust:
# a dials row claiming sonnet while the agent was pinned opus; a critic contract
# updated in three harnesses and not the fourth; selftest gated in feature-find
# and left unconditional in feature-plan. All three are mechanically detectable.
py=$(command -v python3 || echo python3)
"$py" - <<'PYEOF' || FAIL=1
import re,glob,sys,tomllib
bad=0
# 1. every selftest call site is gated
for f in glob.glob('.claude/skills/*/SKILL.md')+['AGENTS.md']:
    for line in open(f,encoding='utf-8',errors='replace'):
        if 'selftest.sh' in line and '--if-changed' not in line:
            print(f"  \033[31m✗\033[0m ungated selftest call: {f}"); bad=1
# 2. the four critic lanes carry the same contract
lanes={'bug-finder':'.claude/agents/bug-finder.md','grok':'.grok/agents/oparax-critic.md',
       'agy':'.agents/agents/oparax-critic.md','codex':'.codex/agents/reviewer.toml'}
need=[r'Settled [Dd]ecisions',r'[Dd]ormant',r'COVERAGE,\s+not filtering',r'file:line']
for name,p in lanes.items():
    try:
        t=tomllib.load(open(p,'rb'))['developer_instructions'] if p.endswith('.toml') else open(p).read()
    except Exception as e:
        print(f"  \033[31m✗\033[0m critic lane unreadable: {p}"); bad=1; continue
    for pat in need:
        if not re.search(pat,t): print(f"  \033[31m✗\033[0m {name} missing contract element: {pat}"); bad=1
# 3. dials tables must not contradict an agent's pinned model
pins={}
for f in glob.glob('.claude/agents/*.md'):
    m=re.search(r'^---\n(.*?)\n---',open(f).read(),re.S)
    mm=re.search(r'^model:\s*(\S+)',m.group(1),re.M) if m else None
    if mm: pins[f.split('/')[-1][:-3]]=mm.group(1)
for f in glob.glob('.claude/skills/*/SKILL.md'):
    for line in open(f,encoding='utf-8',errors='replace'):
        if 'Internal review lane' in line and 'bug-finder' in line:
            if pins.get('bug-finder','') not in line:
                print(f"  \033[31m✗\033[0m {f}: internal-lane row contradicts bug-finder's pin ({pins.get('bug-finder')})"); bad=1
sys.exit(bad)
PYEOF
[ $FAIL -eq 0 ] && echo "  ✓ selftest gated everywhere, critic contracts in parity, dials match pins"

echo
[ $FAIL -eq 0 ] && echo "doctor: all configuration checks passed." \
  || echo "doctor: FAILURES above — fix before trusting a run." >&2
echo "doctor: this proves configuration only. Prove the lanes with:"
echo "        bash .claude/workflows/council/selftest.sh --if-changed"
exit $FAIL
