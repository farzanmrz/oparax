#!/usr/bin/env python3
"""Fixed Oparax review profiles using the global critique skill's runner."""

import argparse
from pathlib import Path
import subprocess
import sys


REPO = Path(__file__).resolve().parents[2]
RUNNER = Path.home() / ".agents/skills/critique/scripts/critique-lanes.py"
# These profiles are shared by the Claude and Codex workflow entry points.
CRITIQUE = (
    ("codex-sol", "codex", "gpt-6-sol"),
    ("codex-astra", "codex", "gpt-6-astra"),
    ("agy-pro", "agy", "gemini-3.1-pro-high"),
    ("agy-flash", "agy", "gemini-3.8-flash-high"),
    ("grok", "grok", "grok-4.7-build-fast"),
)
PROFILES = {
    "critique": CRITIQUE,
    "qc": CRITIQUE[:2] + (("codex-terra", "codex", "gpt-5.6-terra"),) + CRITIQUE[2:],
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("preview", "start"):
        command = commands.add_parser(name)
        command.add_argument("--profile", choices=tuple(PROFILES), required=True)
        command.add_argument("--run-dir", required=True)
        command.add_argument("--brief", required=True)
    for name in ("wait", "extract", "resume"):
        command = commands.add_parser(name)
        command.add_argument("--run-dir", required=True)
        command.add_argument("--lane", required=True)
        if name == "wait":
            command.add_argument("--seconds", type=int, default=30, choices=range(1, 61))
        if name == "resume":
            command.add_argument("--source-lane", required=True)
    args = parser.parse_args()
    if not RUNNER.is_file():
        parser.error(f"Global critique runner is missing: {RUNNER}. Restore the installed skill; do not substitute a lane script.")
    run_dir = Path(args.run_dir).expanduser().resolve()
    base = [sys.executable, str(RUNNER), args.command, "--run-dir", str(run_dir)]
    if args.command in ("preview", "start"):
        brief = Path(args.brief).expanduser().resolve()
        if not brief.is_file():
            parser.error(f"Review brief is missing: {brief}")
        lanes = PROFILES[args.profile]
        if args.command == "start":
            existing = [name for name, _, _ in lanes if (run_dir / f"{args.profile}-{name}.json").exists()]
            if existing:
                parser.error("This review already has lane records. Continue it or choose a fresh run directory.")
        for name, provider, model in lanes:
            subprocess.run(
                base + [
                    "--lane", f"{args.profile}-{name}", "--provider", provider,
                    "--model", model, "--effort", "high", "--brief", str(brief),
                    "--cwd", str(REPO), "--result-format",
                    "plan-json" if args.profile == "critique" else "qc-json",
                ],
                check=True,
            )
    else:
        command = base + ["--lane", args.lane]
        if args.command == "wait":
            command += ["--seconds", str(args.seconds)]
        elif args.command == "resume":
            command += ["--source-lane", args.source_lane]
        subprocess.run(command, check=True)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(error.returncode)
