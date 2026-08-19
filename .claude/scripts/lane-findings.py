#!/usr/bin/env python3
"""Extract ONLY the findings JSON array out of a lane's raw .out file.

Why this exists (2026-08-18): lane.sh `result` cats the whole .out file, and
for a codex --json lane that is the full JSONL event stream (825 KB on a real
run) even though the findings themselves are a few KB, sitting in the text of
the LAST agent_message item. Handing the adjudicator that whole stream is pure
wasted context. This script pulls out just the array, for any of the three
lane shapes in use, and writes it to <lane>.findings.json next to the .out.

Shapes handled (inspected against real files on disk: .feature/lanes/
qc-codex.out, qc-grok.out, qc-agy.out):
  - codex (--json): JSONL, one event per line. The findings are the `text` of
    the LAST `item.completed` event whose `item.type` is `agent_message`
    (a codex run emits earlier agent_message items too, e.g. "consulting the
    Supabase skill now" -- only the last one is the findings answer).
  - grok: a single JSON object. The real field is `text` (NOT `response` or
    `result`, despite earlier assumptions); those two are kept as fallbacks
    in case a future grok version renames it. The `thought` field is raw
    reasoning (17 KB in a real run, multiple times the findings' own size)
    and is never read here.
  - agy: a single JSON object; `response` holds the findings as a string
    (`result`/`text` kept as fallbacks).

In every shape the findings text may come plain or fenced in ```json ... ```;
extraction just takes the first '[' through the last ']' and parses that.

Never fabricates: a lane whose output does not parse, or whose extracted
value is not a JSON array, gets an empty array written out and the caller
(lane.sh) reports EMPTY so that lane is recorded dead, never silently treated
as "nothing found".
"""
import json
import os
import sys


def extract_array(text):
    if not text:
        return None
    text = text.strip()
    try:
        val = json.loads(text)
        if isinstance(val, list):
            return val
    except Exception:
        pass
    start = text.find('[')
    end = text.rfind(']')
    if start == -1 or end == -1 or end < start:
        return None
    candidate = text[start:end + 1]
    try:
        val = json.loads(candidate)
        if isinstance(val, list):
            return val
    except Exception:
        return None
    return None


def codex_last_agent_message(path):
    last_text = None
    with open(path, 'r', errors='replace') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get('type') == 'item.completed':
                item = obj.get('item', {}) or {}
                if item.get('type') == 'agent_message':
                    last_text = item.get('text')
    return last_text


def json_field_text(path, field_candidates):
    with open(path, 'r', errors='replace') as f:
        obj = json.load(f)
    if not isinstance(obj, dict):
        return None
    for field in field_candidates:
        val = obj.get(field)
        if isinstance(val, str) and val.strip():
            return val
    return None


def main():
    if len(sys.argv) != 4:
        print('usage: lane-findings.py <in.out> <lane-name> <out.findings.json>', file=sys.stderr)
        sys.exit(2)
    in_path, lane_name, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

    text = None
    try:
        if 'codex' in lane_name:
            text = codex_last_agent_message(in_path)
        elif 'grok' in lane_name:
            text = json_field_text(in_path, ['text', 'response', 'result'])
        elif 'agy' in lane_name:
            text = json_field_text(in_path, ['response', 'result', 'text'])
        # An unrecognized lane name leaves text=None -> written out as [].
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        text = None

    findings = extract_array(text) if text else None
    if findings is None:
        findings = []

    with open(out_path, 'w') as f:
        json.dump(findings, f)

    size = os.path.getsize(out_path)
    if not findings:
        print(f'EMPTY {out_path} bytes={size}')
    else:
        print(f'OK {out_path} bytes={size} count={len(findings)}')


if __name__ == '__main__':
    main()
