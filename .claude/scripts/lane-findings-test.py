#!/usr/bin/env python3
"""Fixture test for lane-findings.py's five lane states.

Run: python3 .claude/scripts/lane-findings-test.py

Every fixture below is a real lane outcome, most of them recovered verbatim from
the 2026-08-18/22 runs of issues #124 and #127. The point of the test is the
distinction that was missing before issue #128: a review that came back saying
"nothing wrong" must never be reported as a review that never came back.

No network, no CLIs, no repo state: it writes fixtures to a temp dir, runs the
extractor on each, and compares the printed state to the expected one.
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
EXTRACTOR = os.path.join(HERE, 'lane-findings.py')


def codex_stream(final_text, extra_messages=()):
    """A codex --json event stream: earlier chatter, then the findings message."""
    lines = []
    for msg in extra_messages:
        lines.append(json.dumps({
            'type': 'item.completed',
            'item': {'type': 'agent_message', 'text': msg},
        }))
    lines.append(json.dumps({
        'type': 'item.completed',
        'item': {'type': 'agent_message', 'text': final_text},
    }))
    return '\n'.join(lines) + '\n'


ONE_FINDING = json.dumps([
    {'severity': 'important', 'file': 'app/x.ts', 'line': 12, 'claim': 'a real finding'}
])

CASES = [
    # (lane name, .out contents, exit code, timed_out, expected state, why)
    ('qc-codex-terra', codex_stream('[]'), 0, False, 'NO_FINDINGS',
     "#127 QC: terra finished in 76s with a valid empty array. The old code "
     "printed EMPTY and the skill told the owner the pass did not come back."),

    ('qc-codex-sol', codex_stream(ONE_FINDING, ['Consulting the Supabase skill now.']), 0, False, 'OK',
     'A normal codex run: earlier chatter, findings in the LAST agent message.'),

    ('critique-grok', json.dumps({'text': '[]', 'session_id': 'abc-123'}), 0, False, 'NO_FINDINGS',
     'Grok wrapper reporting a healthy empty review.'),

    ('critique-grok', json.dumps({
        'text': 'I looked at the plan and it seems mostly fine, but I ran out of room.',
        'thought': 'long internal reasoning that must never become findings',
        'session_id': 'sess-abc-123',
        'stopReason': 'cancelled',
    }), 0, False, 'INVALID',
     '#127 critique: grok hit its turn cap at 348s with prose and no findings JSON. '
     'Must stay INVALID and surface resume_id so the caller can resume the session once.'),

    ('critique-agy', json.dumps({
        'conversation_id': 'b3a41a8f-34fb-41d8-a791-799eb44dc250',
        'status': 'ERROR',
        'response': '',
        'error': ('declaring permissions: cortex tool view_file: convert tool call for '
                  'permissions: model output error: invalid tool call error (invalid_args) '
                  'failed to read file: open /Users/farzanm4/Desktop/repos/oparax/'
                  'instrumentation.ts: no such file or directory'),
        'duration_seconds': 276.175884,
        'num_turns': 1,
    }), 1, False, 'FAILED',
     "#124 QC round 4, verbatim: the agy CLI turned a wrong-filename read into a fatal "
     "error. A dead process, not a review with no findings."),

    ('critique-agy', json.dumps({
        'conversation_id': 'c7d2',
        'status': 'ERROR',
        'response': '',
        'error': 'timeout waiting for response',
        'duration_seconds': 298.36,
        'num_turns': 1,
    }), 1, False, 'FAILED',
     "#127 critique: agy hit the CLI's undeclared 5-minute default --print-timeout."),

    ('qc-grok', json.dumps({'text': 'partial notes, still thinking'}), 0, True, 'TIMED_OUT',
     'Killed at the wall cap with nothing valid emitted.'),

    ('qc-grok', json.dumps({'text': ONE_FINDING}), 0, True, 'OK',
     'Killed at the cap but it HAD already emitted valid findings: keep the work.'),

    ('critique-grok', json.dumps({
        'text': ("I'll read the extractor and see whether empty `[]` is treated differently "
                 "from unparseable output."
                 '[{"severity": "blocking", "file": "x.py", "line": 111, '
                 '"claim": "None is rewritten to [] and both print EMPTY."}]'),
        'stopReason': 'end_turn',
        'sessionId': '01a0308c-e581-72c0-ada1-0c882afcfa44',
    }), 0, False, 'OK',
     'Measured 2026-08-23: grok-4.6 at high effort wrapped a good findings array in prose '
     'containing a stray `[]`, AND its claim string contains another `[]`. Both a naive '
     'first-[-to-last-] slice and a last-decodable-array scan get this wrong; the real '
     'array is the one whose decode reaches furthest right.'),

    ('qc-codex-terra', codex_stream('```json\n[]\n```'), 0, False, 'NO_FINDINGS',
     'A fenced empty array is still a healthy empty review.'),

    ('qc-codex-sol', '', 0, False, 'INVALID',
     'Empty output file: no final message at all.'),

    ('qc-codex-sol', 'not json at all\n{"broken": ', 0, False, 'INVALID',
     'Malformed stream: never silently becomes "no findings".'),
]


def run_case(tmp, idx, lane, out_text, exit_code, timed_out):
    base = os.path.join(tmp, f'{idx}-{lane}')
    with open(base + '.out', 'w') as f:
        f.write(out_text)
    with open(base + '.exit', 'w') as f:
        f.write(str(exit_code))
    cmd = [sys.executable, EXTRACTOR]
    if timed_out:
        cmd.append('--timed-out')
    cmd += [base + '.out', lane, base + '.findings.json']
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.stdout.strip()


def main():
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        for idx, (lane, out_text, exit_code, timed_out, expected, why) in enumerate(CASES):
            line = run_case(tmp, idx, lane, out_text, exit_code, timed_out)
            state = line.split()[0] if line else '(no output)'
            ok = state == expected
            if not ok:
                failures += 1
            print(f'{"PASS" if ok else "FAIL"}  {lane:<18} expected {expected:<12} got {state}')
            if not ok:
                print(f'        full line: {line}')
            print(f'        {why}')
    print()
    if failures:
        print(f'{failures} of {len(CASES)} fixtures FAILED')
        sys.exit(1)
    print(f'all {len(CASES)} fixtures passed')


if __name__ == '__main__':
    main()
