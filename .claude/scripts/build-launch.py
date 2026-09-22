#!/usr/bin/env python3
"""Launch an approved $build in a detached Codex process; retain its result."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import uuid

MODELS = {'sol': 'gpt-6-sol', 'astra': 'gpt-6-astra', 'terra': 'gpt-5.6-terra'}
ACTIVE = {'STARTING', 'RUNNING'}
# Tool configuration written mid-flow (Codex or Claude settings, hooks, skills) is committed and
# pushed on the current branch instead of refusing the launch (owner decision 2026-09-06, after
# an untracked .codex/config.toml blocked the #132 fix build). Anything outside these still refuses.
META_PREFIXES = ('.claude/', '.codex/')


def write_state(job, state):
    temp = job / 'state.tmp'
    temp.write_text(json.dumps(state, indent=2) + '\n')
    temp.replace(job / 'state.json')


def alive(pid):
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False


def state_of(job):
    state = json.loads((job / 'state.json').read_text())
    if state['status'] in ACTIVE and not alive(state.get('worker_pid')):
        state.update(status='FAILED', error='Build supervisor exited; inspect logs before retrying.')
        write_state(job, state)
    return state


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()


def commit_tool_config(repo, issue, branch):
    entries = git(repo, 'status', '--porcelain', '--untracked-files=all').splitlines()
    paths = [line[3:].split(' -> ')[-1].strip('"') for line in entries if line.strip()]
    if not any(path.startswith(META_PREFIXES) for path in paths):
        return
    git(repo, 'add', '-A', '--', *META_PREFIXES)
    git(repo, 'commit', '-m', f'meta: commit tool configuration under .claude and .codex (#{issue})')
    pushed = subprocess.run(['git', '-C', str(repo), 'push', '-u', 'origin', branch],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if pushed.returncode:
        print(json.dumps({'warning': f'Committed tool configuration on {branch} but could not push it; push manually.'}),
              file=sys.stderr)


def prepare(repo, issue, source):
    plan = repo / f'.feature/plan-{issue}.md'
    if not plan.is_file() or not plan.read_text().strip():
        raise ValueError(f'Missing detailed plan: {plan}')
    if not (repo / '.agents/skills/build/SKILL.md').is_file():
        raise ValueError('The Codex build skill is missing from this checkout.')
    if source == 'qc':
        fixes = repo / f'.feature/fixes-{issue}.md'
        if not fixes.is_file() or 'Status: pending' not in fixes.read_text().splitlines():
            raise ValueError('QC handoff requires the approved pending fix list.')
    branch = git(repo, 'branch', '--show-current')
    if branch not in (f'ft/{issue}', f'bf/{issue}'):
        raise ValueError(f'Checkout is {branch or "detached"}; switch to ft/{issue} or bf/{issue} before launch.')
    commit_tool_config(repo, issue, branch)
    if git(repo, 'status', '--porcelain', '--untracked-files=all'):
        raise ValueError('Uncommitted files remain outside .claude/ and .codex/. Preserve and resolve them before launching build.')
    return branch


def command(state, job):
    return ['codex', 'exec', '-C', state['repo'], '-m', MODELS[state['model']],
            '-c', 'model_reasoning_effort="high"', '--approve-for-me',
            '--json', '--output-last-message', str(job / 'result.md'), '--', '-']


def run(job, lock_fd):
    # This inherited lock survives the parent command returning to Claude.
    lock = os.fdopen(lock_fd, 'a')
    state = json.loads((job / 'state.json').read_text())
    state['worker_pid'] = os.getpid()
    write_state(job, state)
    child = None
    try:
        if prepare(Path(state['repo']), state['issue'], state['source']) != state['branch']:
            raise ValueError('Branch changed before the build started.')
        env = os.environ.copy()
        env.pop('CLAUDECODE', None)
        prompt = (f'$build {state["issue"]}\n\n'
                  'The owner approved this build handoff from ' + state['source'] + '. '
                  'Follow the repository build skill, including its BUILD/AMEND/FIX selection. '
                  'Feel free to use subagents for useful independent work within the approved scope. '
                  'Do not launch QC, ship, another build, or change branches. '
                  'Finish with the usual plain-language result; if blocked, say what remains undone.\n')
        (job / 'prompt.txt').write_text(prompt)
        with (job / 'stderr.txt').open('w') as err, (job / 'events.jsonl').open('w') as out:
            child = subprocess.Popen(command(state, job), cwd=state['repo'], env=env,
                                     stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=err,
                                     text=True, start_new_session=True, pass_fds=(lock.fileno(),))
            state.update(status='RUNNING', child_pid=child.pid)
            write_state(job, state)
            child.stdin.write(prompt)
            child.stdin.close()
            completed = False
            for line in child.stdout:
                out.write(line)
                out.flush()
                try:
                    event = json.loads(line)
                except ValueError:
                    continue
                if event.get('type') == 'thread.started':
                    state['session_id'] = event['thread_id']
                    write_state(job, state)
                elif event.get('type') == 'turn.completed':
                    completed = True
                elif event.get('type') in ('error', 'turn.failed'):
                    state['error'] = event.get('message') or event.get('error')
            rc = child.wait()
        result = job / 'result.md'
        if rc or not completed or not state.get('session_id') or not result.is_file() or not result.read_text().strip():
            raise ValueError(f'Codex did not return a completed response (exit {rc}). {state.get("error") or ""}')
        # FINISHED means a completed response, which may itself report a blocker.
        state.update(status='FINISHED', exit_code=rc, finished_at=time.time())
    except Exception as exc:
        if child is not None and child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
        state.update(status='FAILED', error=str(exc), finished_at=time.time())
    finally:
        write_state(job, state)
        lock.close()


def start(args):
    repo = Path(git(Path(args.repo).resolve(), 'rev-parse', '--show-toplevel'))
    base = repo / '.feature/build-runs'
    base.mkdir(parents=True, exist_ok=True)
    lock = (base / 'launch.lock').open('a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise ValueError('A detached build is already running in this checkout; do not launch another.')
    latest = base / 'latest.json'
    if latest.is_file():
        previous = Path(json.loads(latest.read_text())['job'])
        previous_state = state_of(previous)
        if alive(previous_state.get('child_pid')) and previous_state['status'] != 'FINISHED':
            raise ValueError('An earlier build process is still alive; inspect it before retrying.')
    branch = prepare(repo, args.issue, args.source)
    job = base / f'{args.issue}-{uuid.uuid4().hex[:12]}'
    job.mkdir()
    state = dict(status='STARTING', issue=args.issue, source=args.source, model=args.model,
                 effort='high', repo=str(repo), branch=branch, job=str(job),
                 session_id=None, started_at=time.time(), worker_pid=None, child_pid=None)
    write_state(job, state)
    with (job / 'supervisor.log').open('w') as log:
        worker = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '_run', str(job),
                                   '--lock-fd', str(lock.fileno())], stdin=subprocess.DEVNULL,
                                  stdout=log, stderr=log, start_new_session=True,
                                  pass_fds=(lock.fileno(),))
    latest.write_text(json.dumps({'job': str(job)}) + '\n')
    # The worker is the only state writer after spawn. Brief startup acknowledgement,
    # not a wait for model output or build completion.
    for _ in range(40):
        current = json.loads((job / 'state.json').read_text())
        if current['status'] != 'STARTING' or worker.poll() is not None:
            break
        time.sleep(0.05)
    lock.close()
    print(json.dumps(state_of(job)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest='action', required=True)
    launch = subs.add_parser('start')
    launch.add_argument('issue', type=int)
    launch.add_argument('--repo', default='.')
    launch.add_argument('--source', choices=['feature', 'qc'], required=True)
    launch.add_argument('--model', type=str.lower, choices=list(MODELS), default='sol')
    for name in ['status', 'watch', '_run']:
        sub = subs.add_parser(name)
        sub.add_argument('job')
        if name == '_run':
            sub.add_argument('--lock-fd', type=int, required=True)
    args = parser.parse_args()
    if args.action == 'start':
        if args.issue <= 0:
            raise ValueError('Issue number must be positive.')
        start(args)
        return
    job = Path(args.job).resolve()
    if args.action == '_run':
        run(job, args.lock_fd)
        return
    state = state_of(job)
    if args.action == 'watch':
        while state['status'] in ACTIVE:
            time.sleep(2)
            state = state_of(job)
    print(json.dumps(state))
    if args.action == 'watch' and (job / 'result.md').is_file():
        print((job / 'result.md').read_text())


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        print(json.dumps({'status': 'ERROR', 'error': str(exc)}), file=sys.stderr)
        sys.exit(1)
