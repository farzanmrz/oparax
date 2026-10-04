#!/usr/bin/env python3
"""Launch one component's $build in a detached Codex process in the feature checkout, then decide BUILT, PARKED
or FAILED from the step commits and the PARKED:/FAILED: lines of the build's final report."""
import argparse
import importlib.util
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import signal
import subprocess
import sys
import time
import tomllib
import uuid

sys.path.insert(0, str(Path.home() / '.agents/skills/council/scripts'))
from providers import CODEX_CONFIG, MODELS as COUNCIL_MODELS  # noqa: E402

lease_spec = importlib.util.spec_from_file_location('writer_lease', Path(__file__).with_name('writer-lease.py'))
lease = importlib.util.module_from_spec(lease_spec)
lease_spec.loader.exec_module(lease)

MODELS = {name: COUNCIL_MODELS[name][1] for name in ('astra', 'sol')}
ACTIVE = {'STARTING', 'RUNNING'}
# Tool configuration written mid-flow (Codex or Claude settings, hooks, rules, skills) is committed
# instead of refusing the launch (owner decision 2026-09-06). Nothing is pushed: a build never pushes
# (owner, September 28); the flow pushes ft/<N>, and only ft/<N>.
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


def field(path, key):
    match = re.search(rf'^{key}:\s*(.+?)\s*$', path.read_text(), re.M)
    return match[1] if match else ''


def commit_tool_config(repo, issue):
    git(repo, 'add', '-A', '--', *META_PREFIXES)
    if git(repo, 'status', '--porcelain', '--', *META_PREFIXES):
        git(repo, 'commit', '-q', '-m', f'meta: commit tool configuration under .claude and .codex (#{issue})')


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


def steps_done(repo, base, component, round_):
    """{k: M} from the Step trailers of this component's commits for this round."""
    done = {}
    for record in git(repo, 'log', f'--format={LOG_FORMAT}', f'{base}..HEAD').split('\x1e'):
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
        holder_state = state_of(Path(holder['job'])) if Path(holder['job']).is_dir() else {}
        if holder_state.get('status') in ACTIVE:
            raise ValueError(f'Component {holder["component"]} is applying migrations (job {holder["job"]}); '
                             'one migrating component runs at a time.')
    lock.write_text(json.dumps({'component': component, 'job': str(job)}) + '\n')


def release_migrations(runs, issue, job):
    lock = runs / f'migrating-{issue}.json'
    if lock.is_file() and json.loads(lock.read_text()).get('job') == str(job):
        lock.unlink()


def prompt_for(state):
    last = max(state['steps_done'], default=0)
    resume = (f'Steps 1 to {last} are already committed with Step trailers; previous work is preserved. '
              f'Continue from step {last + 1} and never redo a committed step.\n') if last else ''
    return (f'$build {state["issue"]}\n\n'
            f'Component: {state["component"]}\n'
            f'Mode: {state["mode"]} (round {state["round"]})\n'
            f'Scope file: {state["scope"]}\n'
            f'Plan slice: {state["plan"]}\n'
            f'Checkout: {state["repo"]} on branch {state["branch"]}, round starting commit {state["base_commit"]}\n'
            f'Migrations allowed: {"yes" if state["migrations"] else "no"}\n'
            f'{resume}\n'
            'The owner approved the plan this launch comes from and nobody is watching, so follow the '
            'repository build skill exactly: one commit per numbered step with its trailers, and a final '
            'report that lists every choice and carries the five pauses as PARKED: lines. Subagents may '
            'research read-only; you are the only writer. Never push, switch, merge, reset or delete a '
            'branch, and never launch QC, ship or another build.\n')


def skills_off():
    # The override sets the whole skills.config array, so the owner's own entries ride along.
    config = tomllib.loads(CODEX_CONFIG.read_text()) if CODEX_CONFIG.exists() else {}
    entries = list(config.get('skills', {}).get('config', []))
    entries += [{'path': str(skill), 'enabled': False} for skill in sorted(SPARK_SKILLS.glob('*/skills/*/SKILL.md'))]
    tables = ','.join('{' + ','.join(f'{key}={json.dumps(value)}' for key, value in entry.items()) + '}'
                      for entry in entries)
    return f'skills.config=[{tables}]'


def command(state, job):
    repo = state['repo']
    cmd = ['codex', 'exec', '-C', repo, '-m', MODELS[state['model']],
           '-c', 'model_reasoning_effort="high"', '--approve-for-me',
           # The project .codex layer (rules, hooks, config) loads only for a trusted path.
           '-c', f'projects."{repo}".trust_level="trusted"',
           # Every step commits; without a writable .git the sandbox denies index.lock and the build
           # gives up on its first commit (onboarding, September 28).
           '--add-dir', str(Path(repo) / '.git')]
    for override in CONNECTORS_OFF + (skills_off(),):
        cmd += ['-c', override]
    return cmd + ['--json', '--output-last-message', str(job / 'result.md'), '--', '-']


def verdict(state, report):
    repo = Path(state['repo'])
    done = steps_done(repo, state['base_commit'], state['component'], state['round'])
    state.update(steps_done=sorted(done), head_commit=git(repo, 'rev-parse', 'HEAD'))
    # A report line may arrive as a markdown bullet; the prefix is what counts.
    lines = [line.strip().lstrip('-* ') for line in report.splitlines()]
    failed = '; '.join(line for line in lines if line.startswith('FAILED:'))
    if not done:
        return 'FAILED', failed or 'no commit carries a Step trailer for this round'
    totals = sorted(set(done.values()))
    if len(totals) != 1:
        return 'FAILED', f'step trailers disagree on the step count: {totals}'
    missing = sorted(set(range(1, totals[0] + 1)) - set(done))
    if missing:
        return 'FAILED', failed or f'steps {missing} of {totals[0]} were not committed'
    dirty = git(repo, 'status', '--porcelain')
    if dirty:
        return 'FAILED', f'every step is committed but the checkout still has uncommitted changes:\n{dirty}'
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
        env['OPARAX_WRITER_FD'] = str(lock.fileno())
        prompt = (job / 'prompt.txt').read_text()
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
        status, reason = verdict(state, result.read_text())
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
    branch = git(repo, 'branch', '--show-current')
    if branch not in (f'ft/{args.issue}', f'bf/{args.issue}'):
        raise ValueError(f'{repo} must be on ft/{args.issue} or bf/{args.issue}, not {branch or "detached HEAD"}.')
    inherited_fd = os.environ.get('OPARAX_WRITER_FD')
    run_id = os.environ.get('OPARAX_RUN_ID')
    if inherited_fd:
        lock = lease.inherited(repo, int(inherited_fd), run_id, os.environ.get('OPARAX_WRITER_TOKEN'))
    else:
        run_id = 'build-' + uuid.uuid4().hex
        lock, _ = lease.acquire(repo, run_id)
    dirty = git(repo, 'status', '--porcelain', '--untracked-files=all')
    product_dirty = git(repo, 'status', '--porcelain', '--untracked-files=all', '--', '.',
                        ':(exclude).claude', ':(exclude).codex')
    if product_dirty:
        raise ValueError(f'Unowned dirty work is preserved in {repo}; commit or resolve it before launching:\n{dirty}')
    runs = repo / '.feature/build-runs'
    runs.mkdir(parents=True, exist_ok=True)
    if not args.dry_run:
        commit_tool_config(repo, args.issue)
    if not (repo / '.codex/rules/default.rules').is_file():
        raise ValueError('The project rules file .codex/rules/default.rules is missing from the checkout; '
                         'a build runs only under those rules.')
    mode, round_, scope = mode_of(repo, args.issue, args.component, plan)
    base_commit = args.base_commit or git(repo, 'rev-parse', 'HEAD')
    if args.base_commit:
        git(repo, 'merge-base', '--is-ancestor', base_commit, 'HEAD')
    scope_hash = hashlib.sha256(scope.read_bytes()).hexdigest()
    previous = sorted(runs.glob(f'{args.issue}-{args.component}-*/state.json'), key=lambda p: p.stat().st_mtime)
    for old in reversed(previous):
        saved = json.loads(old.read_text())
        if (saved.get('branch') == branch and saved.get('round') == round_ and saved.get('scope') == str(scope)):
            if saved.get('scope_hash') != scope_hash:
                raise ValueError('This round scope changed; preserve its job records and approve a new round.')
            if not args.base_commit:
                if saved['status'] == 'BUILT':
                    raise ValueError('This round is already built; review it or supply a pending fix/amendment.')
                base_commit = saved['base_commit']
                git(repo, 'merge-base', '--is-ancestor', base_commit, 'HEAD')
            break
    job = runs / f'{args.issue}-{args.component}-{uuid.uuid4().hex[:12]}'
    migration_scope = scope if re.search(r'^migrations:', scope.read_text(), re.I | re.M) else plan
    if migrating(migration_scope):
        claim_migrations(runs, args.issue, args.component, job)
    job.mkdir()
    state = dict(run_id=run_id, status='STARTING', issue=args.issue, component=args.component, model=args.model,
                 effort='high', repo=str(repo), branch=branch,
                 base_commit=base_commit, mode=mode, round=round_, scope=str(scope),
                 plan=str(plan), scope_hash=scope_hash, migrations=migrating(migration_scope), job=str(job),
                 session_id=None, started_at=time.time(), worker_pid=None, child_pid=None,
                 steps_done=sorted(steps_done(repo, base_commit, args.component, round_)),
                 head_commit=git(repo, 'rev-parse', 'HEAD'))
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
    start.add_argument('--base-commit', help='persisted starting commit for this round or retry')
    start.add_argument('--plan', required=True, help='this component\'s plan slice file')
    start.add_argument('--repo', default='.')
    start.add_argument('--model', type=str.lower, choices=list(MODELS), default='astra')
    start.add_argument('--dry-run', action='store_true', help='validate the checkout and print the command, no Codex')
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
