#!/usr/bin/env python3
"""Extract the owner's own messages, verbatim and dated, from Claude Code and Codex session logs.

Usage: extract-owner-messages.py --cwd-contains <text> --days <n> --out <dir>
Writes one markdown file per session that has owner messages. Read-only on the logs.
"""
import argparse
import datetime
import glob
import json
import os
import re
import time

SKIP = re.compile(
    r"^(# AGENTS\.md instructions|<INSTRUCTIONS>|<local-command|<command-name>|<task-notification>|"
    r"<agent-message|<environment_context|<permissions|<turn_aborted|<user_action|\[Subagent hand-back\])"
)


def owner_text(text: str) -> bool:
    t = text.strip()
    if len(t) < 20 or SKIP.search(t):
        return False
    return "SYSTEM NOTIFICATION" not in t[:300] and "system-reminder" not in t[:120]


def write(out: str, kind: str, sid: str, when: str, cwd: str, msgs: list) -> int:
    if not msgs:
        return 0
    with open(os.path.join(out, f"{kind}-{when}-{sid[:8]}.md"), "w") as f:
        f.write(f"# {kind} session {sid} ({when}) cwd {cwd}\n\n")
        for ts, text in msgs:
            f.write(f"## {ts}\n\n{text.strip()}\n\n")
    return len(msgs)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cwd-contains", required=True, help="only sessions whose working directory contains this text")
    ap.add_argument("--days", type=int, default=9)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    cut = time.time() - a.days * 86400
    total = 0
    for p in glob.glob(os.path.expanduser("~/.claude/projects/*/*.jsonl")):
        if os.path.getmtime(p) < cut:
            continue
        msgs, cwd = [], ""
        for line in open(p, errors="ignore"):
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if d.get("type") != "user" or d.get("isMeta"):
                continue
            cwd = d.get("cwd", cwd)
            c = d.get("message", {}).get("content")
            text = "\n".join(b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text") if isinstance(c, list) else (c or "")
            if owner_text(text):
                msgs.append((d.get("timestamp", ""), text))
        if a.cwd_contains not in cwd:
            continue
        when = datetime.datetime.fromtimestamp(os.path.getmtime(p)).strftime("%m%d")
        total += write(a.out, "claude", os.path.basename(p)[:-6], when, cwd, msgs)
    for p in glob.glob(os.path.expanduser("~/.codex/sessions/*/*/*/*.jsonl")) + glob.glob(os.path.expanduser("~/.codex/archived_sessions/*.jsonl")):
        if os.path.getmtime(p) < cut:
            continue
        msgs, cwd = [], ""
        for line in open(p, errors="ignore"):
            try:
                d = json.loads(line)
            except ValueError:
                continue
            pl = d.get("payload", {})
            if d.get("type") == "session_meta":
                cwd = pl.get("cwd", "")
            elif d.get("type") == "response_item" and pl.get("type") == "message" and pl.get("role") == "user":
                text = "\n".join(b.get("text", "") for b in pl.get("content", []) if b.get("type") == "input_text")
                if owner_text(text):
                    msgs.append((d.get("timestamp", ""), text))
        if a.cwd_contains not in cwd:
            continue
        m = re.search(r"rollout-\d{4}-(\d\d)-(\d\d)", p)
        when = m.group(1) + m.group(2) if m else "0000"
        total += write(a.out, "codex", os.path.basename(p).split("-")[-5], when, cwd, msgs)
    print(f"{total} owner messages written to {a.out}")


if __name__ == "__main__":
    main()
