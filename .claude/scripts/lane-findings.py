#!/usr/bin/env python3
"""Extract the findings JSON array out of a lane's raw .out file AND classify
what actually happened to that lane.

Why this exists (2026-08-18): lane.sh `result` cats the whole .out file, and
for a codex --json lane that is the full JSONL event stream (825 KB on a real
run) even though the findings themselves are a few KB, sitting in the text of
the LAST agent_message item. Handing the adjudicator that whole stream is pure
wasted context. This script pulls out just the array, for any of the three
lane shapes in use, and writes it to <lane>.findings.json next to the .out.

Why it was rewritten (2026-08-23, issue #128): the first version collapsed two
different outcomes into one. A lane that completed successfully and returned a
valid empty array `[]` (a healthy review that found nothing) and a lane whose
output could not be parsed at all both ended up as `[]` on disk and both printed
`EMPTY`, and every consumer read `EMPTY` as "that lane is dead". This happened
for real: in #127's QC, codex-terra finished cleanly in 76 seconds with `[]` and
was reported to the owner as a review pass that never came back. Truthiness of
the parsed list can never be the classifier; parse failure is now a distinct
sentinel from a parsed-empty list.

States printed (the caller records exactly these):
  OK count=N     process succeeded, payload is a valid non-empty findings array
  NO_FINDINGS    process succeeded, payload is a valid empty array -- HEALTHY
  INVALID        process succeeded, payload missing / malformed / not an array
  FAILED         process exited non-zero or vanished (agy's fatal file-read bug
                 of 2026-08-18 lands here) and left no valid payload
  TIMED_OUT      caller killed the lane at the wall cap and it had emitted no
                 valid payload (pass --timed-out when killing at the cap)

A lane killed at the cap that HAD already emitted a valid payload is reported
OK/NO_FINDINGS on that payload, not TIMED_OUT: work already finished is not
thrown away for missing a deadline.

Never fabricates: partial prose, reasoning traces, and grok's `thought` field
are never parsed into findings. When a run ended without a usable final payload
the correct recovery is resuming its stored session (grok `--resume <id>`, agy
`--conversation <id>`) so the model finishes its own answer; this script surfaces
that session id under `resume_id=` so the caller can make exactly one bounded
attempt.

Shapes handled (inspected against real files on disk):
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
    (`result`/`text` kept as fallbacks). Its envelope also carries
    `status` (SUCCESS/ERROR/...) and `conversation_id`.

In every shape the findings text may come plain or fenced in ```json ... ```;
extraction just takes the first '[' through the last ']' and parses that.
"""
import json
import os
import sys


# Sentinel: the payload could not be parsed into an array at all. Distinct from
# [], which is a real answer meaning "reviewed, found nothing".
class Unparseable:
    pass


UNPARSEABLE = Unparseable()

# Fields that carry a resumable session/conversation id, across CLI shapes.
RESUME_ID_FIELDS = (
    'session_id', 'sessionId', 'conversation_id', 'conversationId', 'id',
)
# Fields that say why a run stopped, when it stopped early.
STOP_REASON_FIELDS = ('stopReason', 'stop_reason', 'status')


def extract_array(text):
    """Return a list, or UNPARSEABLE. Never returns None for a valid [].

    The findings array is the LAST decodable JSON array in the message. Taking
    the naive first-'[' to last-']' span breaks the moment a model writes any
    prose around its answer that itself contains a bracket -- measured on
    2026-08-23, grok-4.6 at high effort prefaced a perfectly good findings array
    with "whether empty `[]` is treated differently", and that stray `[]` made
    the whole span unparseable, so a real review was classified INVALID and its
    findings would have been thrown away. Decode candidates instead of slicing.
    """
    if not text or not text.strip():
        return UNPARSEABLE
    text = text.strip()
    try:
        val = json.loads(text)
        if isinstance(val, list):
            return val
    except Exception:
        pass
    decoder = json.JSONDecoder()
    best = None          # (end_index, span_length, value)
    idx = text.find('[')
    while idx != -1:
        try:
            val, end = decoder.raw_decode(text, idx)
            if isinstance(val, list):
                key = (end, end - idx)
                if best is None or key > best[0]:
                    best = (key, val)
        except ValueError:
            pass
        idx = text.find('[', idx + 1)
    return best[1] if best is not None else UNPARSEABLE


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


def load_json_object(path):
    with open(path, 'r', errors='replace') as f:
        obj = json.load(f)
    return obj if isinstance(obj, dict) else None


def field_text(obj, field_candidates):
    if not obj:
        return None
    for field in field_candidates:
        val = obj.get(field)
        if isinstance(val, str) and val.strip():
            return val
    return None


def read_exit_code(out_path):
    """The lane's recorded exit code, or None when it never finished."""
    base, _ = os.path.splitext(out_path)
    try:
        with open(base + '.exit') as f:
            return int(f.read().strip())
    except (FileNotFoundError, ValueError, OSError):
        return None


def main():
    args = [a for a in sys.argv[1:] if a != '--timed-out']
    timed_out = '--timed-out' in sys.argv[1:]
    if len(args) != 3:
        print('usage: lane-findings.py [--timed-out] <in.out> <lane-name> <out.findings.json>',
              file=sys.stderr)
        sys.exit(2)
    in_path, lane_name, out_path = args

    envelope = None
    text = None
    try:
        if 'codex' in lane_name:
            text = codex_last_agent_message(in_path)
        elif 'grok' in lane_name:
            envelope = load_json_object(in_path)
            text = field_text(envelope, ['text', 'response', 'result'])
        elif 'agy' in lane_name:
            envelope = load_json_object(in_path)
            text = field_text(envelope, ['response', 'result', 'text'])
        # An unrecognized lane name leaves text=None -> UNPARSEABLE below.
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        text = None

    parsed = extract_array(text)
    have_payload = not isinstance(parsed, Unparseable)
    findings = parsed if have_payload else []

    # The findings file always holds a real array, so consumers never special-case
    # it; the STATE line, not the file, says whether that array means anything.
    with open(out_path, 'w') as f:
        json.dump(findings, f)
    size = os.path.getsize(out_path)

    exit_code = read_exit_code(in_path)
    detail = []
    if not have_payload:
        resume_id = field_text(envelope, RESUME_ID_FIELDS) if envelope else None
        stop_reason = field_text(envelope, STOP_REASON_FIELDS) if envelope else None
        err = field_text(envelope, ['error']) if envelope else None
        if resume_id:
            detail.append(f'resume_id={resume_id}')
        if stop_reason:
            detail.append(f'stop_reason={stop_reason}')
        if err:
            detail.append('error=' + err.replace('\n', ' ')[:200])
    suffix = (' ' + ' '.join(detail)) if detail else ''

    if have_payload and findings:
        print(f'OK {out_path} bytes={size} count={len(findings)}')
    elif have_payload:
        print(f'NO_FINDINGS {out_path} bytes={size} count=0')
    elif timed_out:
        print(f'TIMED_OUT {out_path} bytes={size}{suffix}')
    elif exit_code is not None and exit_code != 0:
        print(f'FAILED {out_path} bytes={size} exit={exit_code}{suffix}')
    else:
        print(f'INVALID {out_path} bytes={size}{suffix}')


if __name__ == '__main__':
    main()
