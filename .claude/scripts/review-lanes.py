#!/usr/bin/env python3
"""Fixed Oparax review profiles using the global council skill's lane runner.

Lanes run inside --checkout (the checkout this command runs in by default), so they read the
code under review. --run-dir is a fresh folder for this review's lane records. --add-dir names
the builders' skill folders by their central path; the runner exposes each as a read root.
"""

import argparse
from pathlib import Path
import subprocess
import sys

SCRIPTS = Path.home() / ".agents/skills/council/scripts"
sys.path.insert(0, str(SCRIPTS))
from providers import MODELS  # noqa: E402

RUNNER = SCRIPTS / "lanes.py"
# These profiles are shared by the Claude and Codex workflow entry points: (lane, council name).
# Model ids live in providers.py, so a model bump is made there once.
COMMON = (
    ("agy-pro", "pro"),
    ("agy-flash", "flash"),
    ("grok", "grok"),
    # Owner, 2026-09-23: models outside the other vendors, run on his Cursor Pro+ pool.
    ("cursor-kimi", "kimi"),
    ("cursor-muse", "muse"),
    ("claude-opus", "opus"),
)
PROFILES = {
    "critique": (("codex-astra", "astra"),) + COMMON,
    "qc": (("codex-sol", "sol"), ("codex-astra", "astra")) + COMMON,
}


def checkout_root(path):
    """The top of the git checkout, or None."""
    found = subprocess.run(
        ["git", "-C", str(path), "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    return Path(found.stdout.strip()) if found.returncode == 0 else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("preview", "start"):
        command = commands.add_parser(name)
        command.add_argument("--profile", choices=tuple(PROFILES), required=True)
        command.add_argument("--run-dir", required=True)
        command.add_argument("--brief", required=True)
        command.add_argument(
            "--checkout", default=".",
            help="the checkout the lanes read and run in; default: the one this command runs in",
        )
        command.add_argument(
            "--add-dir", action="append", default=[], metavar="DIR",
            help="a skill folder every lane may read, by its central path (repeatable)",
        )
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
        parser.error(f"Global council lane runner is missing: {RUNNER}. Restore the installed skill; do not substitute a lane script.")
    run_dir = Path(args.run_dir).expanduser().resolve()
    base = [sys.executable, str(RUNNER), args.command, "--run-dir", str(run_dir)]
    if args.command in ("preview", "start"):
        brief = Path(args.brief).expanduser().resolve()
        if not brief.is_file():
            parser.error(f"Review brief is missing: {brief}")
        checkout = checkout_root(Path(args.checkout).expanduser())
        if checkout is None:
            parser.error(f"--checkout is not a git checkout: {args.checkout}")
        add_dirs = [Path(directory).expanduser().resolve() for directory in args.add_dir]
        missing = [str(directory) for directory in add_dirs if not directory.is_dir()]
        if missing:
            parser.error(f"--add-dir is not a folder: {', '.join(missing)}")
        extra = [arg for directory in add_dirs for arg in ("--add-dir", str(directory))]
        lanes = PROFILES[args.profile]
        if args.command == "start":
            existing = [name for name, _ in lanes if (run_dir / f"{args.profile}-{name}.json").exists()]
            if existing:
                parser.error("This review already has lane records. Continue it or choose a fresh run directory.")
        for name, council_name in lanes:
            provider, model, _ = MODELS[council_name]
            subprocess.run(
                base + [
                    "--lane", f"{args.profile}-{name}", "--provider", provider,
                    "--model", model, "--effort", "high", "--brief", str(brief),
                    "--cwd", str(checkout), "--result-format",
                    "plan-json" if args.profile == "critique" else "qc-json",
                ] + extra,
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
