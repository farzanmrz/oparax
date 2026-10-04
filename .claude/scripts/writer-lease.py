#!/usr/bin/env python3
"""One writer lease shared by every checkout of this repository."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid


def paths(repo):
    common = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', '--path-format=absolute', '--git-common-dir'], text=True).strip()
    return Path(common) / 'flow-writer.lock', Path(common) / 'flow-writer.json'


def acquire(repo, run_id):
    path, meta = paths(repo)
    lock = path.open('a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        lock.close()
        raise ValueError('Another product writer owns this repository; inspect its run or build before launching.')
    token = uuid.uuid4().hex
    meta.write_text(json.dumps(dict(run_id=run_id, token=token, pid=os.getpid())) + '\n')
    return lock, token


def inherited(repo, fd, run_id, token):
    path, meta = paths(repo)
    stat = os.fstat(fd)
    if (stat.st_dev, stat.st_ino) != (path.stat().st_dev, path.stat().st_ino):
        raise ValueError('The inherited writer lease does not belong to this repository.')
    owner = json.loads(meta.read_text())
    if owner.get('run_id') != run_id or owner.get('token') != token:
        raise ValueError('The supervisor writer lease context is stale.')
    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    return os.fdopen(os.dup(fd), 'a')


def verify(repo, run_id, token):
    path, meta = paths(repo)
    if not run_id or not token or not meta.is_file():
        return False
    owner = json.loads(meta.read_text())
    if owner.get('run_id') != run_id or owner.get('token') != token:
        return False
    with path.open('a') as probe:
        try:
            fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return True
    return False


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_subparsers(dest='action', required=True)
    for name in ('verify', 'run'):
        sub = actions.add_parser(name)
        sub.add_argument('--repo', default='.')
        sub.add_argument('--run-id', required=True)
        if name == 'verify':
            sub.add_argument('--token', required=True)
        else:
            sub.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if args.action == 'verify':
        raise SystemExit(0 if verify(args.repo, args.run_id, args.token) else 1)
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if not command:
        parser.error('run requires a command after --')
    try:
        lock, token = acquire(args.repo, args.run_id)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
    with lock:
        env = os.environ.copy()
        env.update(OPARAX_WRITER_FD=str(lock.fileno()), OPARAX_RUN_ID=args.run_id, OPARAX_WRITER_TOKEN=token)
        child = subprocess.Popen(command, env=env, pass_fds=(lock.fileno(),))
        raise SystemExit(child.wait())
