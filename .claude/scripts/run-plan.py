#!/usr/bin/env python3
"""Carry out one approved plan component by component while the owner is away.

The plan is a file and this script follows it; no model session holds the plan. Every model
session does one bounded job (one component build, one component QC, one fix round) and reads
its frozen slice from disk. State lives in .feature/run-<N>.json (written atomically; the
detached loop is its only writer), the journal in .feature/run-<N>.log, the morning list in
.feature/run-<N>-summary.md. A stop request is a separate file so the loop stays the single
writer of the state file.
"""
import argparse
import importlib.util
import uuid
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

sys.path.insert(0, str(Path.home() / '.agents/skills/council/scripts'))
from providers import MODELS  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
LAUNCHER = REPO / '.claude/scripts/build-launch.py'
lease_spec = importlib.util.spec_from_file_location('writer_lease', Path(__file__).with_name('writer-lease.py'))
lease = importlib.util.module_from_spec(lease_spec)
lease_spec.loader.exec_module(lease)
BUILD_ACTIVE = {'STARTING', 'RUNNING'}
RUNNING = {'building', 'qc', 'fixing'}
DONE = {'merged', 'parked', 'blocked', 'failed'}
MAX_FIX_ROUNDS = 3
POLL_SECONDS = 20
# A Codex proof session hung for ten minutes on September 28; every session the run starts has
# a hard deadline. Clean work can resume from its last step commit; dirty work stays intact for inspection.
DEADLINES = {'building': 60 * 60, 'fixing': 45 * 60, 'qc': 30 * 60}
MAX_TIMEOUTS = 3
# No --permission-mode: the default mode with these tools pre-allowed and prompts answered by
# nobody is the headless setting that needs no human. --bare, --safe-mode and
# --disable-slash-commands would drop the repo's skills, so none of them is passed.
QC_FLAGS = ['--model', MODELS['sonnet'][1], '--effort', 'medium',
            '--output-format', 'json', '--permission-prompts', 'none',
            '--allowedTools', 'Bash', 'Read', 'Edit', 'Write', 'Grep', 'Glob',
            # The owner's settings allow every git and gh command; a headless QC may commit its gates
            # fix and read the issue, but never push, merge, move the branch or write GitHub. The supervisor owns proof and push.
            '--disallowedTools', 'Bash(git push:*)', 'Bash(git merge:*)', 'Bash(git switch:*)',
            'Bash(git checkout:*)', 'Bash(git reset:*)',
            'Bash(gh issue comment:*)', 'Bash(gh issue edit:*)', 'Bash(gh issue close:*)',
            'Bash(gh issue create:*)', 'Bash(gh pr:*)', 'Bash(gh api:*)']


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%S')


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def last_json(text):
    return json.loads(text.strip().splitlines()[-1])


class Real:
    """Runs commands for real; QC sessions are detached so a stopped loop never kills one."""

    def __init__(self):
        self.children = {}
        self.writer_fd = None
        self.run_id = None
        self.writer_token = None

    def run(self, cmd, cwd):
        env = os.environ.copy()
        if self.writer_fd is not None:
            env.update(OPARAX_WRITER_FD=str(self.writer_fd), OPARAX_RUN_ID=self.run_id, OPARAX_WRITER_TOKEN=self.writer_token)
        return subprocess.run([str(a) for a in cmd], cwd=str(cwd), text=True, capture_output=True, env=env,
                              pass_fds=(self.writer_fd,) if self.writer_fd is not None else ())

    def spawn(self, cmd, cwd, out, err):
        # The nesting markers would make the child believe it runs inside this Claude session.
        env = {k: v for k, v in os.environ.items() if k not in ('CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT')}
        env.update(OPARAX_SUPERVISOR='run-plan', OPARAX_RUN_ID=self.run_id or '', OPARAX_WRITER_TOKEN=self.writer_token or '')
        env['OPARAX_HEADLESS'] = '1'  # the repo's headless-guard hook blocks outward git and gh in these sessions
        with open(out, 'w') as stdout, open(err, 'w') as stderr:
            child = subprocess.Popen([str(a) for a in cmd], cwd=str(cwd), env=env, stdin=subprocess.DEVNULL,
                                     stdout=stdout, stderr=stderr, start_new_session=True,
                                     pass_fds=(self.writer_fd,) if self.writer_fd is not None else ())
        self.children[child.pid] = child
        return child.pid

    def alive(self, pid):
        if pid in self.children:  # poll() reaps our own child; a finished one would stay a zombie otherwise
            return self.children[pid].poll() is None
        try:
            os.kill(pid, 0)
            return True
        except (ProcessLookupError, TypeError):
            return False

    def read_json(self, path):
        return json.loads(Path(path).read_text()) if Path(path).is_file() else None

    def glob(self, pattern):
        return sorted(Path(pattern).parent.glob(Path(pattern).name), key=lambda p: p.stat().st_mtime)

    def kill(self, pids):
        # Each session leads its own process group (start_new_session), so the group is the whole session.
        for sig in (signal.SIGTERM, signal.SIGKILL):
            for pid in [p for p in pids if p]:
                try:
                    os.killpg(pid, sig)
                except ProcessLookupError:
                    pass
            time.sleep(5)

    def time(self):
        return time.time()

    def sleep(self):
        time.sleep(POLL_SECONDS)


class Dry:
    """Prints every command in order and answers with canned success, so the order can be read."""

    def __init__(self, issue, hang=None):
        self.issue, self.n, self.clock, self.hang, self.launched = issue, 0, 0.0, hang, {}

    def _say(self, cmd, cwd):
        self.n += 1
        print(f'{self.n:>3}. [{Path(cwd).name}] $ {" ".join(shlex.quote(str(a)) for a in cmd)}')

    def sha(self, ref):
        return hashlib.sha1(ref.encode()).hexdigest()[:12]

    def run(self, cmd, cwd):
        self._say(cmd, cwd)
        cmd, out = [str(a) for a in cmd], ''
        if cmd[:2] == ['git', 'rev-parse']:
            # HEAD in the main checkout is ft/<N>; in a worktree named <N>-<id> it is ft/<N>-<id>.
            ref = cmd[-1] if cmd[-1] != 'HEAD' else f'ft/{self.issue}'
            out = self.sha(ref)
        elif LAUNCHER.name in cmd[1] and cmd[2] == 'launch':
            unit = cmd[cmd.index('--component') + 1]
            self.launched[unit] = self.launched.get(unit, 0) + 1
            hung = '-hung' if unit == self.hang and self.launched[unit] == 1 else ''  # the first launch never returns
            out = json.dumps({'status': 'RUNNING', 'job': f'/dry/build-runs/{self.issue}-{unit}-job{hung}'})
        elif LAUNCHER.name in cmd[1] and cmd[2] == 'status':
            name = Path(cmd[-1]).name
            if name.endswith('-hung'):
                out = json.dumps({'status': 'RUNNING', 'worker_pid': 4242, 'child_pid': 4243})
            else:
                unit = name.removesuffix('-job')
                out = json.dumps({'status': 'BUILT', 'base_commit': self.sha(f'ft/{self.issue}'), 'head_commit': self.sha(f'ft/{self.issue}'), 'steps_done': [1, 2]})
        return subprocess.CompletedProcess(cmd, 0, out, '')

    def kill(self, pids):
        self._say(['kill', '--process-groups', *[p for p in pids if p]], REPO)

    def time(self):
        return self.clock

    def spawn(self, cmd, cwd, out, err):
        self._say(cmd, cwd)
        return 0

    def alive(self, pid):
        return False

    def read_json(self, path):
        path = Path(path)
        if path.name != 'result.json':
            return None
        unit = path.parents[1].name
        branch = f'ft/{self.issue}'
        return {'status': 'PASS', 'reviewed_commit': self.sha(branch), 'fixes': None, 'summary': 'dry run'}

    def glob(self, pattern):
        return []

    def sleep(self):
        self.clock += 15 * 60
        print(f'     (clock: {int(self.clock // 60)} minutes)')


def plan_components(plan):
    """The header table of the detailed plan: one row per component with depends_on and migrations."""
    header, rows = None, []
    for line in plan.read_text().splitlines():
        cells = [c.strip().strip('`') for c in line.strip().strip('|').split('|')] if line.strip().startswith('|') else None
        if header is None:
            if cells and 'depends_on' in [c.lower() for c in cells]:
                header = [c.lower().replace(' ', '_') for c in cells]
            continue
        if cells is None:
            break
        if set(line.strip()) <= set('|-: '):
            continue
        row = dict(zip(header, cells))
        deps = [d.strip().strip('`') for d in re.split('[,;]', row.get('depends_on', ''))]
        rows.append(dict(id=row.get('id') or row.get('component'), title=row.get('title') or row.get('component'),
                         depends_on=[d for d in deps if d and d.lower() not in ('none', '-')],
                         migrations=row.get('migrations', '').lower() in ('yes', 'true', 'y')))
    if not rows:
        raise ValueError(f'{plan} has no component table with a depends_on column.')
    ids = [r['id'] for r in rows]
    if len(ids) != len(set(ids)) or any(not re.fullmatch(r'[a-z0-9][a-z0-9-]*', cid or '') for cid in ids):
        raise ValueError('Component ids must be unique lowercase letters, digits and hyphens.')
    for r in rows:
        unknown = [d for d in r['depends_on'] if d not in ids]
        if unknown:
            raise ValueError(f'Component {r["id"]} depends on unknown component(s): {", ".join(unknown)}')
    pending, resolved = list(rows), set()
    while pending:
        ready = [r for r in pending if not set(r['depends_on']) - resolved]
        if not ready:
            raise ValueError('Component dependencies contain a cycle.')
        resolved.update(r['id'] for r in ready)
        pending = [r for r in pending if r not in ready]
    return rows


class Run:
    def __init__(self, issue, ex, path=None):
        self.issue, self.ex, self.dry = issue, ex, isinstance(ex, Dry)
        self.path = Path(path) if path else REPO / f'.feature/run-{issue}.json'
        self.state = json.loads(self.path.read_text())

    # ----- state, journal, git -----
    def save(self):
        if self.dry:
            return
        tmp = self.path.with_suffix('.tmp')  # a reader never sees a half-written state file
        tmp.write_text(json.dumps(self.state, indent=2) + '\n')
        tmp.replace(self.path)

    def log(self, who, text):
        line = f'{now()}  {who:<12} {text}'
        print(line, flush=True)
        if not self.dry:
            with (REPO / f'.feature/run-{self.issue}.log').open('a') as journal:
                journal.write(line + '\n')

    def git(self, cwd, *args):
        return self.ex.run(['git', *args], cwd)

    def head(self, cwd):
        return self.git(cwd, 'rev-parse', 'HEAD').stdout.strip()

    def dirty(self, cwd):
        return self.git(cwd, 'status', '--porcelain', '--untracked-files=all').stdout.strip()

    @property
    def comps(self):
        return self.state['components']

    def by_status(self, *statuses):
        return [c for c in self.comps if c['status'] in statuses]

    def comp(self, cid):
        return next(c for c in self.comps if c['id'] == cid)

    def set_status(self, c, status, error=None):
        c['status'], c['last_error'] = status, error
        self.log(c['id'], status + (f': {error}' if error else ''))

    def plan_changed(self):
        plan = Path(self.state['plan'])
        inputs = self.state.get('plan_inputs', {str(plan): self.state['plan_hash']})
        return any(not Path(path).is_file() or sha256(path) != digest for path, digest in inputs.items())

    # ----- builds -----
    def launch_build(self, c, fixes=False):
        # The launcher picks FIX mode by itself from .feature/fixes-<N>-<id>.md at Status: pending, which QC writes.
        fix_list = REPO / f'.feature/fixes-{self.issue}-{c["id"]}.md'
        if fixes and not self.dry and not re.search(r'^Status:\s*pending\s*$', fix_list.read_text() if fix_list.is_file() else '', re.M):
            return self.set_status(c, 'failed', f'QC reported fixes but {fix_list} is not pending')
        c['fixes'] = fixes
        cmd = [sys.executable, LAUNCHER, 'launch', '--issue', self.issue, '--component', c['id'],
               '--repo', REPO, '--worktree', c['worktree'], '--plan', c['plan_section']]
        if c.get('round_base_commit'):
            cmd += ['--base-commit', c['round_base_commit']]
        done = self.ex.run(cmd, REPO)
        try:
            job = last_json(done.stdout)
            c['build_job'] = job['job']
        except (ValueError, IndexError, KeyError):
            return self.set_status(c, 'failed', f'launcher refused: {done.stderr.strip() or done.stdout.strip()}')
        c['base_commit'], c['stage_started'] = c['base_commit'] or job.get('base_commit'), self.ex.time()
        c['round_base_commit'] = job.get('base_commit')
        self.set_status(c, 'fixing' if fixes else 'building')
        self.log(c['id'], f'job {c["build_job"]}')

    def timeout(self, c, pids, cwd, relaunch, stop=False):
        unit, holder, stage = (c['id'], c, c['status']) if c else ('integration', self.state['integration'], 'qc')
        self.ex.kill(pids)
        holder['timeouts'] += 1
        self.log(unit, f'TIMEOUT: {stage}; process groups {pids} stopped, all work preserved.')
        if self.dirty(cwd):
            reason = f'timeout left uncommitted work in {cwd}; preserved for inspection'
            return self.set_status(c, 'blocked', reason) if c else holder['qc'].update(status=reason)
        if holder['timeouts'] >= MAX_TIMEOUTS:
            reason = f'timed out {MAX_TIMEOUTS} times in {stage}'
            return self.set_status(c, 'blocked', reason) if c else holder['qc'].update(status=reason)
        if stop:
            return self.set_status(c, 'blocked', 'timeout stopped; work preserved') if c else holder['qc'].update(status='timeout stopped')
        relaunch()

    def poll_build(self, c, stop=False):
        done = self.ex.run([sys.executable, LAUNCHER, 'status', '--job', c['build_job']], REPO)
        try:
            job = last_json(done.stdout)
        except (ValueError, IndexError):
            return self.set_status(c, 'failed', f'unreadable build state: {done.stderr.strip()}')
        if job['status'] in BUILD_ACTIVE:
            if self.ex.time() - c['stage_started'] > DEADLINES[c['status']]:
                self.timeout(c, [job.get('worker_pid'), job.get('child_pid')], Path(c['worktree']),
                             lambda: self.launch_build(c, c['fixes']), stop)
            return
        # The launcher decides BUILT, PARKED or FAILED from the step commits and the decision log.
        c.update(base_commit=c['base_commit'] or job.get('base_commit'), head_commit=job.get('head_commit'),
                 steps_done=max(job.get('steps_done') or [0]))
        if job['status'] == 'PARKED':
            c['parked'] = self.parked_lines(c)
            return self.set_status(c, 'parked', '; '.join(c['parked']) or 'the build parked without a PARKED line')
        if job['status'] != 'BUILT':
            return self.set_status(c, 'failed', job.get('reason') or job.get('error') or f'build ended {job["status"]}')
        self.set_status(c, 'built')
        if stop:
            return
        self.start_check(c)

    def start_check(self, c):
        if c['id'] == 'integration':
            self.launch_qc()
        elif self.state.get('component_review', 'lanes') == 'gates':
            self.launch_gates(c)
        else:
            self.launch_qc(c)

    def parked_lines(self, c):
        note = REPO / f'.feature/decisions-{self.issue}-{c["id"]}.md'
        lines = note.read_text().splitlines() if note.is_file() else []
        return [l[len('PARKED:'):].strip() for l in lines if l.startswith('PARKED:')]

    # ----- QC -----
    def unit(self, c):
        """A QC unit is one component in its worktree, or the whole branch in the main checkout."""
        if c:
            return c['id'], c['qc'], Path(c['worktree'])
        return 'integration', self.state['integration']['qc'], REPO

    def latest_round(self, unit):
        dirs = self.ex.glob(REPO / f'.feature/lanes/{self.issue}/{unit}/round-*')
        return max((int(p.name[6:]) for p in dirs if p.name[6:].isdigit()), default=0)

    def launch_qc(self, c=None):
        unit, qc, checkout = self.unit(c)
        if self.dirty(checkout):
            qc['status'] = f'not run: uncommitted changes in {checkout}'
            return self.set_status(c, 'blocked', qc['status']) if c else self.log(unit, qc['status'])
        qc['round'], qc['status'], qc['started'] = self.latest_round(unit) + 1, 'running', self.ex.time()  # the session numbers its own round dir the same way
        self.set_status(c or self.state['integration'], 'qc')
        self.save()  # the QC session reads worktree, branch and head_commit from this file first thing
        mode_dir = REPO / f'.feature/lanes/{self.issue}/{unit}'
        if not self.dry:
            mode_dir.mkdir(parents=True, exist_ok=True)
        qc['expected_commit'] = self.head(checkout)
        prompt = f'/qc {self.issue} --component {unit}' if c else f'/qc {self.issue} --integration'
        # QC runs in the main checkout (the run file and .feature live there); --add-dir opens the worktree to its file tools.
        cmd = ['claude', '-p', prompt, *QC_FLAGS] + (['--add-dir', c['worktree']] if c else [])
        qc['pid'] = self.ex.spawn(cmd, REPO, mode_dir / f'claude-round-{qc["round"]}.json', mode_dir / f'claude-round-{qc["round"]}.log')
        self.log(unit, f'QC round {qc["round"]} pid {qc["pid"]}')

    def gates_only(self, c):
        return bool(c) and self.state.get('component_review', 'lanes') == 'gates'

    def launch_gates(self, c):
        # Owner, September 28: no review lanes per component; only the deterministic gates (pnpm build, tsc) so a broken
        # component never poisons the ones built on top of it. The one full review runs on the whole branch at the end.
        unit, qc, checkout = self.unit(c)
        if self.dirty(checkout):
            qc['status'] = f'not run: uncommitted changes in {checkout}'
            return self.set_status(c, 'blocked', qc['status'])
        qc['round'], qc['status'], qc['started'] = qc['round'] + 1, 'running', self.ex.time()
        self.set_status(c, 'qc')
        self.save()
        mode_dir = REPO / f'.feature/lanes/{self.issue}/{unit}'
        if not self.dry:
            mode_dir.mkdir(parents=True, exist_ok=True)
        cmd = ['bash', REPO / '.claude/scripts/qc-gates.sh', f'{c["base_commit"]}...{c["head_commit"]}']
        qc['pid'] = self.ex.spawn(cmd, checkout, mode_dir / f'gates-{qc["round"]}.log', mode_dir / f'gates-{qc["round"]}.err')
        self.log(unit, f'gates round {qc["round"]} pid {qc["pid"]}')

    def poll_gates(self, c, stop=False):
        unit, qc, checkout = self.unit(c)
        if self.ex.alive(qc.get('pid')):
            if self.ex.time() - qc['started'] > DEADLINES['qc']:
                self.timeout(c, [qc['pid']], checkout, lambda: self.launch_gates(c), stop)
            return
        log = REPO / f'.feature/lanes/{self.issue}/{unit}/gates-{qc["round"]}.log'
        text = 'GATES: GREEN' if self.dry else log.read_text() if log.is_file() else ''
        head = self.head(checkout)
        if 'GATES: GREEN' in text and head == c['head_commit']:
            qc.update(status='PASS', reviewed_commit=head, summary='gates green')
            self.log(unit, f'gates round {qc["round"]}: GREEN')
            return self.set_status(c, 'passed')
        fails = [l for l in text.splitlines() if 'FAIL' in l or 'error' in l.lower()][:6]
        qc.update(status='FAIL', summary='; '.join(fails)[:400])
        self.log(unit, f'gates round {qc["round"]}: RED')
        return self.set_status(c, 'blocked', 'gates red: ' + ('; '.join(fails)[:400] or 'no GATES line in the log'))

    def poll_qc(self, c=None, stop=False):
        if self.gates_only(c):
            return self.poll_gates(c, stop)
        unit, qc, checkout = self.unit(c)
        if self.ex.alive(qc.get('pid')):
            if self.ex.time() - qc['started'] > DEADLINES['qc']:
                self.timeout(c, [qc['pid']], checkout, lambda: self.launch_qc(c), stop)
            return
        result = self.ex.read_json(REPO / f'.feature/lanes/{self.issue}/{unit}/round-{qc["round"]}/result.json')
        if not result:
            qc['status'] = 'no result'
            return self.set_status(c, 'failed', f'QC round {qc["round"]} ended without result.json') if c else None
        qc.update(status=result['status'], reviewed_commit=result.get('reviewed_commit'), summary=result.get('summary'))
        self.log(unit, f'QC round {qc["round"]}: {result["status"]}')
        if result['status'] == 'PASS':
            head = self.head(checkout)
            if result.get('reviewed_commit') != head:  # a pass is only worth the commit it reviewed
                qc['status'] = f'stale: QC reviewed {result.get("reviewed_commit")} but the branch is at {head}'
                return self.set_status(c, 'blocked', qc['status']) if c else self.log(unit, qc['status'])
            return self.set_status(c, 'passed') if c else None
        if result['status'] == 'FIXES':
            c = c or self.state['integration']
            if result.get('reviewed_commit') != self.head(checkout):
                return self.set_status(c, 'blocked', 'FIXES reviewed a stale commit; preserve the list and run QC again')
            if stop:
                return self.set_status(c, 'needs-fix')
            return self.launch_fixes(c)
        self.set_status(c or self.state['integration'], 'blocked', f'QC said STOP: {result.get("summary")}')

    def launch_fixes(self, c):
        if c['fix_rounds'] >= MAX_FIX_ROUNDS:
            return self.set_status(c, 'blocked', f'still has fixes after {MAX_FIX_ROUNDS} fix rounds')
        c['fix_rounds'] += 1
        c['round_base_commit'] = None
        self.launch_build(c, fixes=True)

    # ----- merge and the decision, once per tick -----
    def merge(self, c):
        # Components already wrote the canonical branch; only verify their passed commit.
        if self.dirty(REPO) or c['qc']['reviewed_commit'] != self.head(REPO):
            return self.set_status(c, 'blocked', 'the checkout changed after its check passed')
        self.set_status(c, 'merged')

    def schedule(self):
        merged = {c['id'] for c in self.by_status('merged')}
        migrating = any(c['migrations'] for c in self.by_status(*RUNNING, 'built', 'passed'))
        for c in self.by_status('planned'):
            stuck = [d for d in c['depends_on'] if d not in merged and self.comp(d)['status'] in DONE]
            if stuck:
                self.set_status(c, 'blocked', f'waits on {stuck[0]}, which is {self.comp(stuck[0])["status"]}')
                continue
            if set(c['depends_on']) - merged or self.by_status(*RUNNING, 'built', 'passed'):
                continue
            if c['migrations'] and migrating:  # two migrating builds against the one shared Supabase project never overlap
                continue
            self.launch_build(c)
            break

    def tick(self, stop):
        for c in self.by_status('building', 'fixing'):
            self.poll_build(c, stop)
        for c in self.by_status('qc'):
            self.poll_qc(c, stop)
        for c in self.by_status('passed'):  # dependency order holds by construction: a build starts only after its dependencies merged
            self.merge(c)
        if not stop:
            for c in self.by_status('built'):
                self.start_check(c)
            for c in self.by_status('needs-fix'):
                self.launch_fixes(c)
            self.schedule()
        integration = self.state['integration']
        if integration.get('status') in ('building', 'fixing'):
            self.poll_build(integration, stop)
        if not stop and integration.get('status') == 'built':
            self.start_check(integration)
        if not stop and integration.get('status') == 'needs-fix':
            self.launch_fixes(integration)
        if integration['qc']['status'] == 'running':
            self.poll_qc(stop=stop)
        if not stop and integration['qc']['status'] == 'PASS' and not integration['pushed']:
            reviewed = integration['qc']['reviewed_commit']
            if self.dirty(REPO) or self.head(REPO) != reviewed:
                integration['qc']['status'] = 'stale: checkout changed after PASS'
            else:
                marker = f'## QC done: integration\n\nReviewed-Commit: {reviewed}\nResult: PASS'
                if not integration.get('proof_posted'):
                    posted = self.ex.run(['gh', 'issue', 'comment', self.issue, '--body', marker], REPO)
                    integration['proof_posted'] = posted.returncode == 0
                    if posted.returncode:
                        integration['qc']['status'] = 'proof comment failed: ' + posted.stderr.strip()
                if integration.get('proof_posted'):
                    pushed = self.git(REPO, 'push', '-u', 'origin', self.state['branch'])
                    integration['pushed'] = pushed.returncode == 0
                    self.log('integration', f'pushed {self.state["branch"]}' if integration['pushed'] else 'push failed: ' + pushed.stderr.strip())
        elif (not stop and integration['qc']['status'] is None and self.by_status('merged')
              and not self.by_status(*RUNNING, 'planned', 'built', 'passed')):
            self.launch_qc()
        busy = (self.by_status(*RUNNING) or (not stop and self.by_status('built', 'passed', 'needs-fix')) or integration['qc']['status'] == 'running'
                or integration.get('status') in ('building', 'fixing'))
        startable = not stop and any(not set(c['depends_on']) - {m['id'] for m in self.by_status('merged')} for c in self.by_status('planned'))
        return bool(busy or startable)

    def finish(self, status):
        self.state['status'], self.state['finished_at'] = status, now()
        self.log('run', status)
        self.save()
        if not self.dry:
            (REPO / f'.feature/run-{self.issue}-summary.md').write_text(self.summary())
            report = REPO / f'scratch/feature-flow/{self.issue}'
            report.mkdir(parents=True, exist_ok=True)
            (report / f'run-{self.state["run_id"]}-summary.md').write_text(self.summary())
        counts = ', '.join(f'{len(self.by_status(s))} {s}' for s in ('merged', 'parked', 'blocked', 'failed') if self.by_status(s))
        self.ex.run(['osascript', '-e', f'display notification "{counts or "nothing ran"}. Read .feature/run-{self.issue}-summary.md" '
                     f'with title "Oparax run {self.issue}: {status}"'], REPO)

    def summary(self):
        s, lines = self.state, [f'# Run {self.issue}: {self.state["status"]} at {self.state.get("finished_at", now())}', '']

        def block(title, comps, fmt):
            if comps:
                lines.extend([f'## {title}', ''] + [f'- {fmt(c)}' for c in comps] + [''])
        block(f'Built on {s.get("branch", f"ft/{self.issue}")}', self.by_status('merged'),
              lambda c: f'{c["title"]}: {c["steps_done"]} steps, QC passed after {c["fix_rounds"]} fix rounds')
        block('Parked, waiting for your answer', self.by_status('parked'),
              lambda c: f'{c["title"]}: ' + ('; '.join(c['parked']) or c['last_error']) + f' (branch {c["branch"]}, {c["steps_done"]} steps kept)')
        block('Blocked', self.by_status('blocked'), lambda c: f'{c["title"]}: {c["last_error"]}')
        block('Failed', self.by_status('failed'), lambda c: f'{c["title"]}: {c["last_error"]}')
        block('Not finished when the run stopped', self.by_status('planned', *RUNNING, 'built', 'passed'),
              lambda c: f'{c["title"]}: {c["status"]}')
        integration = s['integration']
        qc = integration['qc']
        if integration.get('last_error'):
            lines += ['## Whole-branch blocker', '', integration['last_error'], '']
        if qc['status']:
            lines += ['## Whole-branch check', '', f'- QC on {s.get("branch", f"ft/{self.issue}")}: {qc["status"]}. {qc.get("summary") or ""}',
                      f'- Pushed to origin: {"yes" if s["integration"]["pushed"] else "no"}', '']
        block('What to walk', self.by_status('merged'), lambda c: f'{c["title"]}: the acceptance journeys in {c["plan_section"]}')
        return '\n'.join(lines)


# ----- commands -----
def stop_file(issue):
    return REPO / f'.feature/run-{issue}.stop'


def take_lock(issue, run_id=None):
    return lease.acquire(REPO, run_id or f'run-{issue}')


def launch_loop(issue, lock, token):
    log = (REPO / f'.feature/run-{issue}-loop.log').open('a')
    worker = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '_loop', '--issue', str(issue),
                               '--lock-fd', str(lock.fileno()), '--writer-token', token], stdin=subprocess.DEVNULL,
                              stdout=log, stderr=log, start_new_session=True, pass_fds=(lock.fileno(),))
    lock.close()
    print(json.dumps({'issue': issue, 'loop_pid': worker.pid, 'state': str(REPO / f'.feature/run-{issue}.json')}))


def main_checkout_ready(issue):
    git = lambda *a: subprocess.run(['git', '-C', REPO, *a], text=True, capture_output=True).stdout.strip()
    branch = git('branch', '--show-current')
    if branch not in (f'ft/{issue}', f'bf/{issue}'):
        raise ValueError(f'{REPO} must be on ft/{issue} or bf/{issue}, not {branch or "detached HEAD"}.')
    if git('status', '--porcelain', '--untracked-files=all'):
        raise ValueError(f'{REPO} has uncommitted changes; they are preserved. Commit them before launching.')
    return branch

def start(args):
    path = REPO / f'.feature/run-{args.issue}.json'
    if path.is_file():
        raise ValueError(f'{path} exists; use resume, or move it aside to start over.')
    plan, plan_dir = REPO / f'.feature/plan-{args.issue}.md', REPO / f'.feature/plan-{args.issue}'
    if not plan.is_file():
        raise ValueError(f'Missing detailed plan: {plan}')
    rows = plan_components(plan)
    missing = [f for f in ['shared.md'] + [f'{r["id"]}.md' for r in rows] if not (plan_dir / f).is_file()]
    if missing:
        raise ValueError(f'Missing plan slices under {plan_dir}: {", ".join(missing)}')
    branch = main_checkout_ready(args.issue)
    if args.max_builds != 1:
        raise ValueError('Current-checkout runs allow exactly one product writer (--max-builds 1).')
    run_id = uuid.uuid4().hex
    lock, token = take_lock(args.issue, run_id)
    comps = [dict(r, plan_section=str(plan_dir / f'{r["id"]}.md'), worktree=str(REPO),
                  branch=branch, base_commit=None, head_commit=None, status='planned', steps_done=0,
                  qc=dict(round=0, reviewed_commit=None, status=None, pid=None), fix_rounds=0, timeouts=0,
                  last_error=None, parked=[], build_job=None, fixes=False, stage_started=None) for r in rows]
    state = dict(schema_version=2, topology='current-checkout', run_id=run_id, branch=branch, issue=args.issue, plan=str(plan), plan_hash=sha256(plan), plan_dir=str(plan_dir), started_at=now(),
                 plan_inputs={str(path): sha256(path) for path in [plan, plan_dir / 'shared.md', *[plan_dir / f'{r["id"]}.md' for r in rows]]},
                 max_builds=args.max_builds, component_review=args.component_review, status='running', components=comps,
                 integration=dict(id='integration', title='Whole branch', plan_section=str(plan), worktree=str(REPO), branch=branch,
                                  status='planned', base_commit=None, round_base_commit=None, head_commit=None,
                                  steps_done=0, fix_rounds=0, fixes=False, parked=[], last_error=None,
                                  qc=dict(round=0, status=None, reviewed_commit=None, pid=None), timeouts=0, pushed=False))
    path.write_text(json.dumps(state, indent=2) + '\n')
    launch_loop(args.issue, lock, token)


def resume(args):
    run = Run(args.issue, Real())
    if run.state.get('topology') != 'current-checkout' or run.state.get('schema_version') != 2:
        raise ValueError('Historical worktree run: inspect status and records. It cannot resume into the current-checkout topology.')
    if run.state['status'] in ('finished', 'refused'):
        raise ValueError('This completed run is history; preserve it before approving a new run.')
    main_checkout_ready(args.issue)
    if run.plan_changed():
        raise ValueError('The plan file changed since the run was approved; start a new run from the new plan.')
    lock, token = take_lock(args.issue, run.state['run_id'])
    stop_file(args.issue).unlink(missing_ok=True)
    # A passed component's reviewed commit is checked again by merge() on the first tick.
    for c in run.by_status('built', 'passed', 'qc'):
        if not run.ex.alive(c['qc'].get('pid')) and run.dirty(Path(c['worktree'])):
            run.set_status(c, 'blocked', f'uncommitted changes in {c["worktree"]} that no session owns')
    run.state['status'] = 'running'
    run.log('run', 'resumed')
    run.save()
    launch_loop(args.issue, lock, token)


def loop(args):
    lock = os.fdopen(args.lock_fd, 'a')  # inherited from start or resume; held until this loop ends
    run = Run(args.issue, Real())
    if run.state.get('topology') != 'current-checkout':
        raise ValueError('Historical run cannot execute in the new topology.')
    run.ex.writer_fd, run.ex.writer_token, run.ex.run_id = lock.fileno(), args.writer_token, run.state['run_id']
    run.state['loop_pid'] = os.getpid()
    while True:
        if run.plan_changed():
            for c in run.by_status('planned'):
                run.set_status(c, 'blocked', 'the plan file changed under the run')
            run.finish('refused')
            break
        stop = stop_file(args.issue).is_file()
        if not run.tick(stop):
            run.finish('stopped' if stop else 'finished')
            break
        run.save()
        run.ex.sleep()
    lock.close()


def dry_run(args):
    issue = json.loads(Path(args.run_file).read_text())['issue']
    run = Run(issue, Dry(issue, args.hang), args.run_file)
    if run.state.get('topology') != 'current-checkout':
        raise ValueError('Historical worktree run: inspect status; dry-run cannot simulate a topology conversion.')
    for _ in range(50):  # every canned answer is success, so the graph drains in a few ticks
        if not run.tick(False):
            run.finish('finished')
            break
        run.ex.sleep()
    print()
    print(run.summary())


def status(args):
    run = Run(args.issue, Real())
    s = run.state
    _, meta = lease.paths(REPO)
    owner = json.loads(meta.read_text()) if meta.is_file() else {}
    live = 'running' if lease.verify(REPO, s.get('run_id'), owner.get('token')) else 'not running'
    if s.get('topology') != 'current-checkout':
        live = 'historical worktree run, not resumable'
    print(f'Run {args.issue}: {s["status"]}, loop {live}, started {s["started_at"]}, plan {s["plan"]}')
    for c in run.comps:
        note = c['last_error'] or '; '.join(c['parked'])
        print(f'  {c["id"]:<16} {c["status"]:<9} steps {c["steps_done"]:<3} qc round {c["qc"]["round"]} fixes {c["fix_rounds"]} timeouts {c["timeouts"]}  {note}')
    qc = s['integration']['qc']
    print(f'  {"whole branch":<16} {qc["status"] or "not yet":<9} pushed: {s["integration"]["pushed"]}')


def stop(args):
    run = Run(args.issue, Real())
    if run.state.get('topology') != 'current-checkout':
        raise ValueError('This historical run is not active and cannot be stopped or resumed.')
    stop_file(args.issue).touch()
    print(f'Stop requested for run {args.issue}: nothing new starts; builds and reviews already running finish '
          'on their own (each build commits per step) and are picked up by resume.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest='action', required=True)
    actions = {'start': start, 'resume': resume, 'status': status, 'stop': stop, '_loop': loop, 'dry-run': dry_run}
    for name in actions:
        sub = subs.add_parser(name)
        if name == 'dry-run':
            sub.add_argument('--run-file', required=True)
            sub.add_argument('--hang', help='component whose first build launch never returns')
        else:
            sub.add_argument('--issue', type=int, required=True)
        if name == 'start':
            sub.add_argument('--max-builds', type=int, default=1, help='current-checkout topology requires 1')
            sub.add_argument('--component-review', choices=['gates', 'lanes'], default='gates',
                             help='gates: build and typecheck only per component, one review at the end (owner, September 28); lanes: the full /qc per component')
        if name == '_loop':
            sub.add_argument('--lock-fd', type=int, required=True)
            sub.add_argument('--writer-token', required=True)
    args = parser.parse_args()
    actions[args.action](args)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        print(json.dumps({'status': 'ERROR', 'error': str(exc)}), file=sys.stderr)
        sys.exit(1)
