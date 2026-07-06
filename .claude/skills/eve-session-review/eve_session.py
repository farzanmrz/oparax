#!/usr/bin/env python3
"""Decode and review eve durable sessions offline, straight from .workflow-data/.

eve persists each turn as base64( b"zstd" + zstd-frame ) of a devalue-serialized
graph. User messages ride in uncompressed control events; assistant text,
reasoning, and tool calls/results live in the compressed step payloads, and each
step snapshots the FULL cumulative history — so the richest step holds the whole
conversation.

Usage:
  python3 eve_session.py list [--limit N]        # recent runs, newest first
  python3 eve_session.py show <id-or-query>      # full transcript for a run
  python3 eve_session.py show --last             # most recent run

<query> matches a run-id prefix, else a case-insensitive substring search over
each run's decoded content (newest run that contains it wins) — so you can say
`show crypto` without knowing the workflow id.

Run from the repo root (it looks for ./.workflow-data). Needs either the python
`zstandard` module or the `zstd` CLI on PATH.
"""
import base64
import glob
import json
import os
import re
import shutil
import subprocess
import sys

WF = ".workflow-data"

# ---- zstd ----------------------------------------------------------------
_ZSTD_CLI = shutil.which("zstd")
try:
    import zstandard as _zstd  # type: ignore
    _HAVE_MOD = True
except Exception:
    _HAVE_MOD = False


def _decompress(raw: bytes):
    if raw[:4] == b"zstd":
        raw = raw[4:]
    if _HAVE_MOD:
        try:
            return _zstd.ZstdDecompressor().decompressobj().decompress(raw)
        except Exception:
            pass
    if _ZSTD_CLI:
        p = subprocess.run([_ZSTD_CLI, "-d", "--stdout"], input=raw, capture_output=True)
        if p.returncode == 0:
            return p.stdout
    return None


def _no_zstd_msg():
    return ("Cannot decompress: install the python `zstandard` module "
            "(pip install --user zstandard) or the `zstd` CLI (brew install zstd).")


# ---- devalue unflatten ---------------------------------------------------
# eve wraps payloads as the ASCII tag "devl" + JSON.stringify(flattened array).
# Flattened form: element 0 is the root; container (array/object) members hold
# integer references into the array; primitives at a referenced slot are literal.
# Negative refs are sentinels (-1 undefined, -2 hole, -3 NaN, ±Inf, -0).
_NEG = {-1: None, -2: None, -3: float("nan"), -4: float("inf"), -5: float("-inf"), -6: -0.0}


def _hydrate(flat):
    memo = {}

    def go(i):
        if isinstance(i, (int,)) and i < 0:
            return _NEG.get(i)
        if i in memo:
            return memo[i]
        v = flat[i]
        if not isinstance(v, (list, dict)):
            memo[i] = v            # literal string / number / bool / null
            return v
        if isinstance(v, list):
            if v and isinstance(v[0], str):   # typed container: ['Date',..]/['Set',..]/['Map',..]
                tag = v[0]
                if tag == "Date":
                    memo[i] = {"__date": v[1]}
                elif tag in ("Set",):
                    out = []
                    memo[i] = out
                    out.extend(go(x) for x in v[1:])
                elif tag in ("Map",):
                    out = {}
                    memo[i] = out
                    kv = [go(x) for x in v[1:]]
                    for k in range(0, len(kv) - 1, 2):
                        out[str(kv[k])] = kv[k + 1]
                else:
                    memo[i] = {"__tag": tag, "values": [go(x) for x in v[1:]]}
                return memo[i]
            out = []
            memo[i] = out
            out.extend(go(x) for x in v)      # plain array: members are refs
            return out
        out = {}
        memo[i] = out
        for k, ref in v.items():              # object: values are refs
            out[k] = go(ref)
        return out

    return go(0)


def _payloads(obj, acc):
    """Collect every {__type:'Uint8Array', data:b64} blob in a parsed event/step JSON."""
    if isinstance(obj, dict):
        if obj.get("__type") == "Uint8Array" and "data" in obj:
            acc.append(obj["data"])
        for x in obj.values():
            _payloads(x, acc)
    elif isinstance(obj, list):
        for x in obj:
            _payloads(x, acc)


def _decode_file(path):
    """Return list of hydrated payloads (dropping the 'devl' tag) from one JSON file."""
    try:
        j = json.load(open(path))
    except Exception:
        return []
    b64s = []
    _payloads(j, b64s)
    out = []
    for b in b64s:
        raw = base64.b64decode(b)
        dec = _decompress(raw)
        if dec is None:
            continue
        s = dec.decode("utf-8", "replace")
        if s.startswith("devl"):
            s = s[4:]
        try:
            out.append(_hydrate(json.loads(s)))
        except Exception:
            out.append(s)  # keep raw text as a fallback
    return out


# ---- run discovery -------------------------------------------------------
def _run_files(run):
    files = []
    for sub in ("events", "steps", "streams", "runs"):
        files += glob.glob(f"{WF}/{sub}/*{run}*")
    return sorted(set(files), key=os.path.getmtime)


def _all_runs():
    ids = set()
    for f in glob.glob(f"{WF}/events/*.json") + glob.glob(f"{WF}/runs/*.json"):
        m = re.search(r"(wrun_[0-9A-Z]+)", os.path.basename(f))
        if m:
            ids.add(m.group(1))
    runs = []
    for r in ids:
        fs = _run_files(r)
        if fs:
            runs.append((r, max(os.path.getmtime(x) for x in fs)))
    return sorted(runs, key=lambda t: t[1], reverse=True)


# ---- transcript extraction ----------------------------------------------
def _walk_find_history(node, best):
    """Find the longest list stored under a 'history' key (the cumulative convo)."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "history" and isinstance(v, list) and len(v) > len(best[0]):
                best[0] = v
            _walk_find_history(v, best)
    elif isinstance(node, list):
        for v in node:
            _walk_find_history(v, best)


def _text_of(parts):
    out = []
    if isinstance(parts, str):
        return [("text", parts)] if parts.strip() else []
    if isinstance(parts, list):
        for p in parts:
            if isinstance(p, dict):
                t = p.get("type")
                if t in ("text", "reasoning") and isinstance(p.get("text"), str):
                    out.append((t, p["text"]))
                elif t in ("tool-call", "tool_call") or "toolName" in p:
                    name = p.get("toolName") or p.get("name")
                    args = p.get("input") if "input" in p else p.get("args")
                    out.append(("tool-call", f"{name}  input={_short(args)}"))
                elif t in ("tool-result", "tool_result") or "output" in p:
                    out.append(("tool-result", _short(p.get("output") if "output" in p else p.get("result"))))
    return out


def _short(v, n=1500):
    try:
        s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False, default=str)
    except Exception:
        s = str(v)
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[:n] + " …[truncated]"


def _render_history(history):
    lines = []
    for msg in history:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role", "?")
        content = msg.get("content", msg.get("parts"))
        pieces = _text_of(content)
        if isinstance(content, str) and not pieces:
            pieces = [("text", content)]
        if not pieces:
            continue
        lines.append(f"\n### {role.upper()}")
        for kind, txt in pieces:
            label = {"text": "", "reasoning": "[reasoning] ", "tool-call": "[tool→] ",
                     "tool-result": "[tool←] "}.get(kind, f"[{kind}] ")
            lines.append(f"{label}{_short(txt, 2000)}")
    return "\n".join(lines)


def cmd_show(target):
    runs = _all_runs()
    if not runs:
        print("No runs found under", WF)
        return
    run = None
    if target == "--last":
        run = runs[0][0]
    else:
        for r, _ in runs:                      # id-prefix match
            if r.startswith(target) or target in r:
                run = r
                break
    payload_cache = {}

    def decode_run(r):
        if r not in payload_cache:
            pays = []
            for f in _run_files(r):
                pays += _decode_file(f)
            payload_cache[r] = pays
        return payload_cache[r]

    if run is None:                            # content search, newest first
        for r, _ in runs:
            blob = json.dumps(decode_run(r), default=str, ensure_ascii=False).lower()
            if target.lower() in blob:
                run = r
                break
    if run is None:
        print(f"No run matched '{target}'. Try `list`.")
        return

    pays = decode_run(run)
    if not pays and not (_HAVE_MOD or _ZSTD_CLI):
        print(_no_zstd_msg())
        return
    best = [[]]
    for p in pays:
        _walk_find_history(p, best)
    print(f"# Session {run}   ({len(best[0])} messages)\n")
    if best[0]:
        print(_render_history(best[0]))
    else:
        print("(No structured history found — raw signal below.)")
    # Always append hard evidence that survives any parsing gap.
    blob = "\n".join(json.dumps(p, default=str, ensure_ascii=False) if not isinstance(p, str) else p for p in pays)
    urls = sorted(set(re.findall(r'https?://[^\s"\\)]+', blob)))
    tools = sorted(set(re.findall(r'"?(grok_twitter_search|x_search|web_search|web_fetch)"?', blob)))
    print("\n---\nTool calls seen:", ", ".join(tools) or "none")
    if urls:
        print("Source URLs:")
        for u in urls[:40]:
            print("  ", u)


def cmd_list(limit):
    runs = _all_runs()[:limit]
    if not runs:
        print("No runs found under", WF)
        return
    import time
    print(f"{'RUN':<32}  {'WHEN':<20}  FIRST MESSAGE / TOOLS")
    for r, mt in runs:
        pays = []
        for f in _run_files(r):
            pays += _decode_file(f)
        blob = "\n".join(json.dumps(p, default=str, ensure_ascii=False) if not isinstance(p, str) else p for p in pays)
        first = ""
        m = re.search(r'"message"\s*:\s*"([^"\\]{3,120})"', blob)
        if m:
            first = m.group(1)
        ntool = len(re.findall(r"grok_twitter_search", blob))
        when = time.strftime("%b %d %H:%M", time.localtime(mt))
        print(f"{r:<32}  {when:<20}  {first[:60]}  [grok x{ntool}]")


def main():
    if not os.path.isdir(WF):
        print(f"No {WF}/ here — run from the repo root after the agent has run at least once.")
        sys.exit(1)
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return
    if args[0] == "list":
        limit = 20
        if "--limit" in args:
            limit = int(args[args.index("--limit") + 1])
        cmd_list(limit)
    elif args[0] == "show":
        if len(args) < 2:
            print("show needs <id-or-query> or --last")
            sys.exit(1)
        cmd_show(args[1])
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
