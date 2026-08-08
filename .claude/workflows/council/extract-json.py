#!/usr/bin/env python3
"""Recover a schema-shaped JSON object from a model's free-form final text.

Cline cannot constrain output to a schema the way `codex --output-schema` and
`grok --json-schema` do, so a capable model routinely returns the right payload
wrapped in prose ("Verification complete. ... {json}") or a ```json fence. A
naive fence-strip loses those. This finds the payload instead of demanding the
model produce it bare.

Usage:  extract-json.py <key> < final-text   ->  prints the object, or exits 1.
"""
import json
import sys


def candidates(text):
    """Yield every balanced {...} span, longest-first, ignoring braces in strings."""
    spans = []
    for start in (i for i, ch in enumerate(text) if ch == "{"):
        depth = 0
        in_str = False
        esc = False
        for i in range(start, len(text)):
            ch = text[i]
            if esc:
                esc = False
                continue
            if ch == "\\":
                esc = True
                continue
            if ch == '"':
                in_str = not in_str
                continue
            if in_str:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    spans.append(text[start:i + 1])
                    break
    # Longest first: the outermost object wins over a nested critique item.
    return sorted(spans, key=len, reverse=True)


def main():
    key = sys.argv[1] if len(sys.argv) > 1 else "critiques"
    text = sys.stdin.read()

    for span in candidates(text):
        try:
            obj = json.loads(span)
        except (json.JSONDecodeError, ValueError):
            continue
        if isinstance(obj, dict) and isinstance(obj.get(key), (list, dict, str)):
            json.dump(obj, sys.stdout)
            return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
