#!/usr/bin/env python3
"""Launch one component's $build in a detached Codex process inside its own worktree, then decide
BUILT, PARKED or FAILED from the step commits and the decision log, never from the agent's prose."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import signal
import subprocess
import sys
import time
import tomllib
import uuid

sys.path.insert(0, str(Path.home() / '.agents/skills/council/scripts'))
from providers import CODEX_CONFIG, MODELS as COUNCIL_MODELS  # noqa: E402

MODELS = {name: COUNCIL_MODELS[name][1] for name in ('astra', 'sol')}
ACTIVE = {'STARTING', 'RUNNING'}
# Tool configuration written mid-flow (Codex or Claude settings, hooks, rules, skills) rides into the
# worktree and is committed there instead of refusing the launch (owner decision 2026-09-06). Nothing
# is pushed: a build never pushes (owner, September 28); the flow pushes ft/<N>, and only ft/<N>.
META_PREFIXES = ('.claude/', '.codex/')
# Personal connectors stay out of a build while Stripe, Vercel, Supabase and PostHog stay on (owner,
# September 28). The plugins and apps keys are the switches the desktop app itself writes (the ids
# come from Codex's app directory cache); whether a -c override of them reaches the tool list is
# unverified. A plugin's enabled switch does not take its skills out of a run while a skills.config
# entry does (checked with `codex debug prompt-input`, September 28), so skills_off() also lists
# every Spark skill by path.
CONNECTORS_OFF = (
    'mcp_servers.x-ads.enabled=false',
    'plugins."gmail@openai-curated".enabled=false',
    'plugins."google-calendar@openai-curated".enabled=false',
    'plugins."google-drive@openai-curated".enabled=false',
    'plugins."spark-cli-skills@spark-codex-marketplace".enabled=false',
    'apps.connector_2128aebfecb84f64a069897515042a44.enabled=false',  # Gmail
    'apps.connector_947e0d954944416db111db556030eea6.enabled=false',  # Google Calendar
    'apps.connector_5f3c8c41a1e54ad7a76272c89e2554fa.enabled=false',  # Google Drive
)
SPARK_SKILLS = Path.home() / '.codex/plugins/cache/spark-codex-marketplace/spark-cli-skills'
STEP = re.compile(r'^(\d+)/(\d+)$')
LOG_FORMAT = ('%H%x1f%(trailers:key=Step,valueonly)%x1f%(trailers:key=Component,valueonly)'
              '%x1f%(trailers:key=Round,valueonly)%x1e')


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
        state.update(status='FAILED', reason='Build supervisor exited; inspect logs before retrying.')
        write_state(job, state)
    return state


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()


def branch_exists(repo, branch):
    probe = ['git', '-C', str(repo), 'rev-parse', '--verify', '--quiet', f'refs/heads/{branch}']
    return subprocess.run(probe, stdout=subprocess.DEVNULL).returncode == 0


def field(path, key):
    match = re.search(rf'^{key}:\s*(.+?)\s*$', path.read_text(), re.M)
    return match[1] if match else ''


def worktree_branch(repo, path):
    block = {}
    for line in git(repo, 'worktree', 'list', '--porcelain').splitlines() + ['']:
        if not line:
            if block.get('worktree') == str(path):
                return block.get('branch', '').removeprefix('refs/heads/')
            block = {}
        else:
            key, _, value = line.partition(' ')
            block[key] = value
    return None


def ensure_worktree(repo, base, component, path):
    branch = f'{base}-{component}'
    checked_out = worktree_branch(repo, path)
    if checked_out == branch:
        return branch
    if checked_out is not None:
        raise ValueError(f'{path} has {checked_out} checked out, not {branch}.')
    if path.exists():
        raise ValueError(f'{path} exists but is not a worktree of this checkout.')
    path.parent.mkdir(parents=True, exist_ok=True)
    if branch_exists(repo, branch):
        # A crashed run whose worktree folder was removed: the branch and its step commits remain.
        git(repo, 'worktree', 'add', str(path), branch)
    else:
        git(repo, 'worktree', 'add', '-b', branch, str(path), base)
    return branch


def commit_tool_config(repo, worktree, issue):
    entries = git(repo, 'status', '--porcelain', '--untracked-files=all', '--', *META_PREFIXES).splitlines()
    for line in entries:
        rel = line[3:].split(' -> ')[-1].strip('"')
        source, target = repo / rel, worktree / rel
        if source.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        elif target.exists():
            target.unlink()
    git(worktree, 'add', '-A', '--', *META_PREFIXES)
    if git(worktree, 'status', '--porcelain', '--', *META_PREFIXES):
        git(worktree, 'commit', '-q', '-m', f'meta: commit tool configuration under .claude and .codex (#{issue})')


def seed(repo, worktree):
    env = repo / '.env.local'
    if env.is_file():
        shutil.copy2(env, worktree / '.env.local')
    install = ['pnpm', 'install', '--frozen-lockfile']
    offline = subprocess.run(install + ['--offline'], cwd=worktree, capture_output=True, text=True)
    if offline.returncode:
        online = subprocess.run(install, cwd=worktree, capture_output=True, text=True)
        if online.returncode:
            raise ValueError(f'pnpm install failed in {worktree}:\n{online.stderr[-2000:]}')


def mode_of(repo, issue, component, plan):
    # AMEND before FIX before BUILD: an amendment can sit beside a pending fix list and goes first.
    amends = sorted(repo.glob(f'.feature/amend-{issue}-*.md'), key=lambda p: int(field(p, 'Round') or 0))
    for amend in amends:
        if field(amend, 'Status') == 'pending' and field(amend, 'Component') == component:
            return 'AMEND', f'amend-{field(amend, "Round")}', amend
    fixes = repo / f'.feature/fixes-{issue}-{component}.md'
    if fixes.is_file() and field(fixes, 'Status') == 'pending':
        return 'FIX', f'fix-{field(fixes, "Round")}', fixes
    return 'BUILD', 'build', plan


def steps_done(worktree, base, component, round_):
    """{k: M} from the Step trailers of this component's commits for this round."""
    done = {}
    for record in git(worktree, 'log', f'--format={LOG_FORMAT}', f'{base}..HEAD').split('\x1e'):
        fields = [part.strip() for part in record.split('\x1f')]
        if len(fields) < 4:
            continue
        step = STEP.match(fields[1])
        if step and fields[2] == component and fields[3] == round_:
            done[int(step[1])] = int(step[2])
    return done


def migrating(plan):
    return re.search(r'^migrations:\s*yes\b', plan.read_text(), re.I | re.M) is not None


def claim_migrations(runs, issue, component, job):
    lock = runs / f'migrating-{issue}.json'
    if lock.is_file():
        holder = json.loads(lock.read_text())
        if Path(holder['job']).is_dir() and state_of(Path(holder['job']))['status'] in ACTIVE:
            raise ValueError(f'Component {holder["component"]} is applying migrations (job {holder["job"]}); '
                             'one migrating component runs at a time.')
    lock.write_text(json.dumps({'component': component, 'job': str(job)}) + '\n')


def release_migrations(runs, issue, job):
    lock = runs / f'migrating-{issue}.json'
    if lock.is_file() and json.loads(lock.read_text()).get('job') == str(job):
        lock.unlink()


def prompt_for(state):
    last = max(state['steps_done'], default=0)
    resume = (f'Steps 1 to {last} are already committed with Step trailers and uncommitted changes were '
              f'discarded; continue from step {last + 1} and never redo a committed step.\n') if last else ''
    return (f'$build {state["issue"]}\n\n'
            f'Component: {state["component"]}\n'
            f'Mode: {state["mode"]} (round {state["round"]})\n'
            f'Scope file: {state["scope"]}\n'
            f'Plan slice: {state["plan"]}\n'
            f'Worktree: {state["worktree"]} on branch {state["branch"]}, cut from {state["base"]}\n'
            f'Decision log: {state["decision_log"]}\n'
            f'Migrations allowed: {"yes" if state["migrations"] else "no"}\n'
            f'{resume}\n'
            'The owner approved the plan this launch comes from and nobody is watching, so follow the '
            'repository build skill exactly: one commit per numbered step with its trailers, a decision-log '
            'line for every choice, the five pauses as PARKED lines. Feel free to use subagents for '
            'independent work inside the scope. Never push, switch, merge, reset or delete a branch, and '
            'never launch QC, ship or another build. Finish with the plain result.\n')


def skills_off():
    # The override sets the whole skills.config array, so the owner's own entries ride along.
    config = tomllib.loads(CODEX_CONFIG.read_text()) if CODEX_CONFIG.exists() else {}
    entries = list(config.get('skills', {}).get('config', []))
    entries += [{'path': str(skill), 'enabled': False} for skill in sorted(SPARK_SKILLS.glob('*/skills/*/SKILL.md'))]
    tables = ','.join('{' + ','.join(f'{key}={json.dumps(value)}' for key, value in entry.items()) + '}'
                      for entry in entries)
    return f'skills.config=[{tables}]'


def command(state, job):
    worktree = state['worktree']
    cmd = ['codex', 'exec', '-C', worktree, '-m', MODELS[state['model']],
           '-c', 'model_reasoning_effort="high"', '--approve-for-me',
           # The project .codex layer (rules, hooks, config) loads only for a trusted path, and a
           # worktree path is new every time.
           '-c', f'projects."{worktree}".trust_level="trusted"',
           # The decision log and the .feature scope files live in the main checkout.
           '--add-dir', str(Path(state['repo']) / '.feature'),
           # A worktree's git metadata lives in the main repo's .git; without this the Codex sandbox denies
           # index.lock there and a build can give up on its first commit (onboarding, September 28).
           '--add-dir', str(Path(state['repo']) / '.git')]
    for override in CONNECTORS_OFF + (skills_off(),):
        cmd += ['-c', override]
    return cmd + ['--json', '--output-last-message', str(job / 'result.md'), '--', '-']


def verdict(state):
    worktree = Path(state['worktree'])
    done = steps_done(worktree, state['base'], state['component'], state['round'])
    state.update(steps_done=sorted(done), head_commit=git(worktree, 'rev-parse', 'HEAD'))
    log = Path(state['decision_log'])
    lines = log.read_text().splitlines() if log.is_file() else []
    failed = '; '.join(line for line in lines if line.startswith('FAILED:'))
    if not done:
        return 'FAILED', failed or 'no commit carries a Step trailer for this round'
    totals = sorted(set(done.values()))
    if len(totals) != 1:
        return 'FAILED', f'step trailers disagree on the step count: {totals}'
    missing = sorted(set(range(1, totals[0] + 1)) - set(done))
    if missing:
        return 'FAILED', failed or f'steps {missing} of {totals[0]} were not committed'
    dirty = git(worktree, 'status', '--porcelain')
    if dirty:
        return 'FAILED', f'every step is committed but the worktree still has uncommitted changes:\n{dirty}'
    parked = [line for line in lines if line.startswith('PARKED:')]
    return ('PARKED' if parked else 'BUILT'), '\n'.join(parked)


def run(job, lock_fd):
    # This inherited lock survives the parent command returning to the orchestrator.
    lock = os.fdopen(lock_fd, 'a')
    state = json.loads((job / 'state.json').read_text())
    state['worker_pid'] = os.getpid()
    write_state(job, state)
    runs = job.parent
    child = None
    try:
        env = os.environ.copy()
        env.pop('CLAUDECODE', None)
        prompt = (job / 'prompt.txt').read_text()
        with (job / 'stderr.txt').open('w') as err, (job / 'events.jsonl').open('w') as out:
            child = subprocess.Popen(command(state, job), cwd=state['worktree'], env=env,
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
        status, reason = verdict(state)
        state.update(status=status, reason=reason, exit_code=rc, finished_at=time.time())
    except Exception as exc:
        if child is not None and child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
        state.update(status='FAILED', reason=str(exc), finished_at=time.time())
    finally:
        write_state(job, state)
        release_migrations(runs, state['issue'], job)
        lock.close()


def launch(args):
    repo = Path(git(Path(args.repo).resolve(), 'rev-parse', '--show-toplevel'))
    plan = Path(args.plan).resolve()
    if not plan.is_file() or not plan.read_text().strip():
        raise ValueError(f'Missing plan slice: {plan}')
    if not (repo / '.agents/skills/build/SKILL.md').is_file():
        raise ValueError('The Codex build skill is missing from this checkout.')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', args.component):
        raise ValueError('A component id is lowercase letters, digits and hyphens.')
    base = next((b for b in (f'ft/{args.issue}', f'bf/{args.issue}') if branch_exists(repo, b)), None)
    if base is None:
        raise ValueError(f'Neither ft/{args.issue} nor bf/{args.issue} exists; run /feature first.')
    runs = repo / '.feature/build-runs'
    runs.mkdir(parents=True, exist_ok=True)
    lock = (runs / f'{args.issue}-{args.component}.lock').open('a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise ValueError(f'A build for component {args.component} is already running; do not launch another.')
    worktree = Path(args.worktree).resolve()
    branch = ensure_worktree(repo, base, args.component, worktree)
    if git(worktree, 'status', '--porcelain'):
        # Whatever a crashed run left half-done is redone from its last committed step.
        git(worktree, 'reset', '-q', '--hard', 'HEAD')
        git(worktree, 'clean', '-qfd')
    commit_tool_config(repo, worktree, args.issue)
    if not (worktree / '.codex/rules/default.rules').is_file():
        raise ValueError('The project rules file .codex/rules/default.rules is missing from the worktree; '
                         'a build runs only under those rules.')
    seed(repo, worktree)
    mode, round_, scope = mode_of(repo, args.issue, args.component, plan)
    job = runs / f'{args.issue}-{args.component}-{uuid.uuid4().hex[:12]}'
    if migrating(plan):
        claim_migrations(runs, args.issue, args.component, job)
    job.mkdir()
    decision_log = repo / f'.feature/decisions-{args.issue}-{args.component}.md'
    if not decision_log.exists():
        decision_log.write_text(f'# Decisions for #{args.issue}, component {args.component}: one line each; '
                                'PARKED: lines wait for the owner\n')
    state = dict(status='STARTING', issue=args.issue, component=args.component, model=args.model,
                 effort='high', repo=str(repo), worktree=str(worktree), branch=branch, base=base,
                 base_commit=git(repo, 'rev-parse', base), mode=mode, round=round_, scope=str(scope),
                 plan=str(plan), decision_log=str(decision_log), migrations=migrating(plan), job=str(job),
                 session_id=None, started_at=time.time(), worker_pid=None, child_pid=None,
                 steps_done=sorted(steps_done(worktree, base, args.component, round_)),
                 head_commit=git(worktree, 'rev-parse', 'HEAD'))
    state['command'] = shlex.join(command(state, job))
    (job / 'prompt.txt').write_text(prompt_for(state))
    if args.dry_run:
        state['status'] = 'DRY_RUN'
        write_state(job, state)
        release_migrations(runs, args.issue, job)
        print(json.dumps(state))
        return
    write_state(job, state)
    with (job / 'supervisor.log').open('w') as log:
        worker = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '_run', str(job),
                                   '--lock-fd', str(lock.fileno())], stdin=subprocess.DEVNULL,
                                  stdout=log, stderr=log, start_new_session=True,
                                  pass_fds=(lock.fileno(),))
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
    start = subs.add_parser('launch')
    start.add_argument('--issue', type=int, required=True)
    start.add_argument('--component', required=True)
    start.add_argument('--worktree', required=True)
    start.add_argument('--plan', required=True, help='this component\'s plan slice file')
    start.add_argument('--repo', default='.')
    start.add_argument('--model', type=str.lower, choices=list(MODELS), default='astra')
    start.add_argument('--dry-run', action='store_true', help='prepare the worktree and print the command, no Codex')
    for name in ('status', 'watch'):
        subs.add_parser(name).add_argument('--job', required=True)
    worker = subs.add_parser('_run')
    worker.add_argument('job')
    worker.add_argument('--lock-fd', type=int, required=True)
    args = parser.parse_args()
    if args.action == 'launch':
        if args.issue <= 0:
            raise ValueError('Issue number must be positive.')
        launch(args)
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
