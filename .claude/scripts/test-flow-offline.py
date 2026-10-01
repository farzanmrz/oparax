#!/usr/bin/env python3
"""Focused flow proof in temporary repos with fake providers, no paid calls or product server.

Product writes are serial. The fake provider checks predecessor commits and gates; independent
fixtures use isolated temporary repos. Nothing is committed, pushed or branched in the real repo.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parent


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


FAKE = r'''#!/usr/bin/env python3
import json,os,pathlib,re,subprocess,sys,time
args=sys.argv[1:]
repo=pathlib.Path.cwd()
name=pathlib.Path(sys.argv[0]).name
if name=='codex':
    prompt=sys.stdin.read()
    unit=re.search(r'^Component: (.+)$',prompt,re.M)[1]
    round_=re.search(r'^Mode: .*\(round (.+)\)$',prompt,re.M)[1]
    hold=os.environ.get('FAKE_HOLD')
    if hold:
        pathlib.Path(hold).write_text(str(os.getpid()))
        while not pathlib.Path(hold+'.release').exists(): time.sleep(.05)
    if unit=='second':
        assert (repo/'first.txt').read_text()=='first'
        assert 'GATES: GREEN' in (repo/'.feature/lanes/7/first/gates-1.log').read_text()
    partial=os.environ.get('FAKE_PARTIAL')
    retry=os.environ.get('FAKE_RETRY_2')
    if retry: assert 'step 2' in prompt
    filename=f'{unit}-retry.txt' if retry else f'{unit}.txt'
    (repo/filename).write_text(unit)
    subprocess.run(['git','add',filename],check=True)
    step='2/2' if retry else '1/2' if partial else '1/1'
    subprocess.run(['git','commit','-q','-m',f'fake {unit}\n\nStep: {step}\nComponent: {unit}\nRound: {round_}'],check=True)
    if unit=='integration':
        fix=repo/'.feature/fixes-7-integration.md'
        fix.write_text(fix.read_text().replace('Status: pending','Status: done'))
    pathlib.Path(args[args.index('--output-last-message')+1]).write_text('fake build complete')
    print(json.dumps({'type':'thread.started','thread_id':'fake-session'}),flush=True)
    print(json.dumps({'type':'turn.completed'}),flush=True)
elif name=='claude':
    assert os.environ['OPARAX_RUN_ID'] and os.environ['OPARAX_WRITER_TOKEN']
    lease=subprocess.run([sys.executable,'.claude/scripts/writer-lease.py','verify','--run-id',os.environ['OPARAX_RUN_ID'],'--token',os.environ['OPARAX_WRITER_TOKEN']])
    assert lease.returncode==0
    root=repo/'.feature/lanes/7/integration'
    rounds=list(root.glob('round-*'))
    for previous in rounds:
        fix=previous/'fixes.md'
        if fix.is_file(): assert 'Status: pending' not in fix.read_text()
    number=max([int(p.name[6:]) for p in rounds]+[0])+1
    folder=root/f'round-{number}'
    folder.mkdir(parents=True)
    head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    status='FIXES' if number==1 else 'PASS'
    if status=='PASS' and os.environ.get('FAKE_STALE'):
        head=subprocess.check_output(['git','rev-parse','HEAD^'],text=True).strip()
    if status=='FIXES':
        content=f'Status: pending\nRound: {number}\nComponent: integration\n1. Fix integration.\n'
        (repo/'.feature/fixes-7-integration.md').write_text(content)
        (folder/'fixes.md').write_text(content)
    (folder/'result.json').write_text(json.dumps({'status':status,'reviewed_commit':head,'summary':'fake independent review'}))
    print('{}')
elif name=='gh':
    assert args[:2]==['issue','comment'],args
    marker=args[args.index('--body')+1]
    with (repo/'.feature/fake-comments.jsonl').open('a') as f: f.write(json.dumps({'body':marker})+'\n')
elif name=='osascript':
    pass
'''


class FlowProof(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='oparax-flow-proof-')
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.home = self.root / 'home'
        providers = self.home / '.agents/skills/council/scripts'
        providers.mkdir(parents=True)
        (providers / 'providers.py').write_text("from pathlib import Path\nCODEX_CONFIG=Path.home()/'config.toml'\nMODELS={'astra':('codex','fake-astra'), 'sol':('codex','fake-sol'), 'sonnet':('claude','fake-sonnet')}\n")
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        for name in ('codex', 'claude', 'gh', 'osascript'):
            tool = self.bin / name
            tool.write_text(FAKE)
            tool.chmod(0o755)
        self.env = dict(os.environ, HOME=str(self.home), PATH=f'{self.bin}:{os.environ["PATH"]}')
        for key in ('OPARAX_WRITER_FD', 'OPARAX_RUN_ID', 'OPARAX_WRITER_TOKEN'):
            self.env.pop(key, None)
        scripts = self.repo / '.claude/scripts'
        scripts.mkdir(parents=True)
        for name in ('build-launch.py', 'run-plan.py', 'writer-lease.py', 'qc-proof.py', 'start.sh'):
            shutil.copy2(SCRIPTS / name, scripts / name)
        (scripts / 'qc-gates.sh').write_text('#!/bin/bash\necho "GATES: GREEN"\n')
        (self.repo / '.agents/skills/build').mkdir(parents=True)
        (self.repo / '.agents/skills/build/SKILL.md').write_text('Fake provider fixture.\n')
        (self.repo / '.codex/rules').mkdir(parents=True)
        (self.repo / '.codex/rules/default.rules').write_text('# fixture\n')
        (self.repo / '.feature/plan-7').mkdir(parents=True)
        (self.repo / '.gitignore').write_text('.feature/\nscratch/\n__pycache__/\n')
        self.plan = self.repo / '.feature/plan-7.md'
        self.plan.write_text('| id | title | depends_on | migrations |\n| --- | --- | --- | --- |\n| first | First | none | no |\n| second | Second | first | no |\n')
        for name in ('first', 'second', 'shared'):
            (self.repo / f'.feature/plan-7/{name}.md').write_text('1. Fake step.\n')
        self.git('init', '-q', '-b', 'ft/7')
        self.git('config', 'user.name', 'Offline fixture')
        self.git('config', 'user.email', 'offline@example.test')
        self.git('add', '.')
        self.git('commit', '-qm', 'fixture')
        self.bare = self.root / 'origin.git'
        subprocess.run(['git', 'init', '-q', '--bare', str(self.bare)], check=True, env=self.env)
        self.git('remote', 'add', 'origin', str(self.bare))
        self.git('push', '-qu', 'origin', 'ft/7')

    def tearDown(self):
        self.temp.cleanup()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], env=self.env, text=True).strip()

    def call(self, script, *args, **kwargs):
        return subprocess.run([sys.executable, str(self.repo / '.claude/scripts' / script), *map(str, args)],
                              cwd=self.repo, env=self.env, text=True, capture_output=True, **kwargs)

    def launch(self, unit='first', **kwargs):
        return self.call('build-launch.py', 'launch', '--issue', 7, '--component', unit,
                         '--plan', self.repo / f'.feature/plan-7/{unit}.md', **kwargs)

    def test_serial_fix_pass_exact_sha_and_no_new_refs(self):
        before_refs = self.git('for-each-ref', '--format=%(refname)')
        before_trees = [line for line in self.git('worktree', 'list', '--porcelain').splitlines() if not line.startswith('HEAD ')]
        with patch.dict(os.environ, self.env, clear=True):
            runmod = load(self.repo / '.claude/scripts/run-plan.py', 'offline_run')
            captured = []
            with patch.object(runmod, 'launch_loop', side_effect=lambda issue, lock, token: captured.append((lock, token))):
                runmod.start(argparse.Namespace(issue=7, max_builds=1, component_review='gates'))
            lock, token = captured[0]
            ex = runmod.Real()
            run = runmod.Run(7, ex)
            ex.writer_fd, ex.writer_token, ex.run_id = lock.fileno(), token, run.state['run_id']
            deadline = time.time() + 20
            while run.tick(False):
                run.save()
                self.assertLess(time.time(), deadline, run.state)
                time.sleep(.05)
            run.save()
            lock.close()
            self.assertTrue(run.state['integration']['pushed'], run.state)
            self.assertEqual(run.state['integration']['fix_rounds'], 1)
            self.assertEqual([c['status'] for c in run.comps], ['merged', 'merged'])
        head = self.git('rev-parse', 'HEAD')
        remote = subprocess.check_output(['git', '--git-dir', str(self.bare), 'rev-parse', 'ft/7'], text=True).strip()
        self.assertEqual(head, remote)
        comments = [json.loads(line) for line in (self.repo / '.feature/fake-comments.jsonl').read_text().splitlines()]
        proof = load(self.repo / '.claude/scripts/qc-proof.py', 'offline_proof')
        self.assertEqual(len(comments), 1)
        self.assertTrue(proof.proves(comments, head))
        self.assertFalse(proof.proves(comments, self.git('rev-parse', 'HEAD^')))
        self.assertFalse(proof.proves(comments + [{'body': '## QC done: integration\nFix build complete'}], head))
        self.assertEqual(before_refs, self.git('for-each-ref', '--format=%(refname)'))
        self.assertEqual(before_trees, [line for line in self.git('worktree', 'list', '--porcelain').splitlines() if not line.startswith('HEAD ')])
        states = [json.loads(p.read_text()) for p in (self.repo / '.feature/build-runs').glob('*/state.json')]
        self.assertEqual(len(states), 3)
        self.assertTrue(all(s['topology'] == 'current-checkout' and s['status'] == 'BUILT' for s in states))
        self.assertEqual(self.git('rev-list', '--count', 'HEAD'), '4')

    def test_dirty_and_concurrent_writer_preserved_even_after_supervisor_death(self):
        dirty = self.repo / 'unknown.txt'
        dirty.write_text('keep this exact content')
        refused = self.launch()
        self.assertNotEqual(refused.returncode, 0)
        self.assertIn('dirty work is preserved', refused.stderr)
        self.assertEqual(dirty.read_text(), 'keep this exact content')
        dirty.unlink()
        held = self.root / 'provider-held'
        self.env['FAKE_HOLD'] = str(held)
        launch = self.launch()
        self.assertEqual(launch.returncode, 0, launch.stderr)
        job = json.loads(launch.stdout.strip().splitlines()[-1])
        deadline = time.time() + 5
        while not held.exists():
            self.assertLess(time.time(), deadline)
            time.sleep(.05)
        state = json.loads((Path(job['job']) / 'state.json').read_text())
        try:
            other = self.launch('second')
            self.assertIn('Another product writer', other.stderr)
            os.kill(state['worker_pid'], signal.SIGKILL)
            time.sleep(.1)
            still_owned = self.launch('second')
            self.assertIn('Another product writer', still_owned.stderr)
        finally:
            os.killpg(state['child_pid'], signal.SIGTERM)
        self.assertEqual(self.git('rev-list', '--count', 'HEAD'), '1')

    def test_feature_start_refuses_active_writer_before_branch_or_remote_actions(self):
        lease = load(self.repo / '.claude/scripts/writer-lease.py', 'offline_start_lease')
        refs = self.git('for-each-ref', '--format=%(refname):%(objectname)')
        head = self.git('rev-parse', 'HEAD')
        lock, _ = lease.acquire(self.repo, 'active-build')
        try:
            kickoff = subprocess.run(['bash', str(self.repo / '.claude/scripts/start.sh'), '--issue', '8', str(self.plan)],
                                     cwd=self.repo, env=self.env, text=True, capture_output=True)
            self.assertNotEqual(kickoff.returncode, 0)
            self.assertIn('Another product writer', kickoff.stderr)
        finally:
            lock.close()
        self.assertEqual(refs, self.git('for-each-ref', '--format=%(refname):%(objectname)'))
        self.assertEqual(head, self.git('rev-parse', 'HEAD'))
        self.assertEqual(self.git('branch', '--show-current'), 'ft/7')
        self.assertFalse((self.repo / '.feature/fake-comments.jsonl').exists())

    def test_current_round_stale_fixes_stop_and_plan_hash(self):
        with patch.dict(os.environ, self.env, clear=True):
            runmod = load(self.repo / '.claude/scripts/run-plan.py', 'offline_transitions')
            captured = []
            with patch.object(runmod, 'launch_loop', side_effect=lambda issue, lock, token: captured.append((lock, token))):
                runmod.start(argparse.Namespace(issue=7, max_builds=1, component_review='gates'))
            lock, token = captured[0]
            run = runmod.Run(7, runmod.Real())
            head = self.git('rev-parse', 'HEAD')
            unit = run.state['integration']
            unit['qc'].update(round=2, status='running', pid=None)
            round1 = self.repo / '.feature/lanes/7/integration/round-1'
            round1.mkdir(parents=True)
            (round1 / 'result.json').write_text(json.dumps(dict(status='PASS', reviewed_commit=head)))
            run.poll_qc()
            self.assertEqual(unit['qc']['status'], 'no result')
            round2 = round1.with_name('round-2')
            round2.mkdir()
            (round2 / 'result.json').write_text(json.dumps(dict(status='FIXES', reviewed_commit='stale')))
            with patch.object(run, 'launch_build') as launch:
                run.poll_qc()
                launch.assert_not_called()
                self.assertEqual(unit['status'], 'blocked')
            (round2 / 'result.json').write_text(json.dumps(dict(status='FIXES', reviewed_commit=head)))
            with patch.object(run, 'launch_build') as launch:
                run.poll_qc(stop=True)
                launch.assert_not_called()
                self.assertEqual(unit['status'], 'needs-fix')
                self.assertEqual(unit['fix_rounds'], 0)
            first = run.comps[0]
            first.update(status='building', build_job='/fake')
            result = subprocess.CompletedProcess([], 0, json.dumps(dict(status='BUILT', head_commit=head, steps_done=[1])), '')
            with patch.object(run.ex, 'run', return_value=result), patch.object(run, 'start_check') as check:
                run.poll_build(first, stop=True)
                check.assert_not_called()
                self.assertEqual(first['status'], 'built')
            self.assertFalse(run.plan_changed())
            (self.repo / '.feature/plan-7/shared.md').write_text('Changed unapproved contract.\n')
            self.assertTrue(run.plan_changed())
            lock.close()

    def test_retry_uses_original_base_and_preserves_previous_job(self):
        original_head = self.git('rev-parse', 'HEAD')
        self.env['FAKE_PARTIAL'] = '1'
        first = self.launch()
        self.assertEqual(first.returncode, 0, first.stderr)
        job1 = Path(json.loads(first.stdout)['job'])
        watched = self.call('build-launch.py', 'watch', '--job', job1, timeout=10)
        old = json.loads(watched.stdout.splitlines()[0])
        self.assertEqual(old['status'], 'FAILED')
        self.assertEqual(old['steps_done'], [1])
        first_record = (job1 / 'state.json').read_bytes()
        log = self.repo / '.feature/decisions-7-first.md'
        with log.open('a') as out:
            out.write('PARKED: previous attempt evidence, retained as history\n')
        self.env.pop('FAKE_PARTIAL')
        self.env['FAKE_RETRY_2'] = '1'
        second = self.launch()
        self.assertEqual(second.returncode, 0, second.stderr)
        job2 = Path(json.loads(second.stdout)['job'])
        watched = self.call('build-launch.py', 'watch', '--job', job2, timeout=10)
        new = json.loads(watched.stdout.splitlines()[0])
        self.assertEqual(new['status'], 'BUILT', new)
        self.assertEqual(new['base_commit'], original_head)
        self.assertEqual(new['steps_done'], [1, 2])
        self.assertEqual(first_record, (job1 / 'state.json').read_bytes())
        self.assertIn('PARKED: previous attempt', log.read_text())

    def test_effective_amendment_migration_scope_and_historical_holder(self):
        amend = self.repo / '.feature/amend-7-1.md'
        amend.write_text('Status: pending\nRound: 1\nComponent: first\nmigrations: yes\n1. Approved migration.\n')
        old_job = self.repo / '.feature/build-runs/old-job'
        old_job.mkdir(parents=True)
        record = old_job / 'state.json'
        record.write_text(json.dumps(dict(status='RUNNING', worker_pid=12345)))
        original = record.read_bytes()
        (old_job.parent / 'migrating-7.json').write_text(json.dumps(dict(component='retired', job=str(old_job))))
        launched = self.call('build-launch.py', 'launch', '--issue', 7, '--component', 'first',
                             '--plan', self.repo / '.feature/plan-7/first.md', '--dry-run')
        self.assertEqual(launched.returncode, 0, launched.stderr)
        state = json.loads(launched.stdout)
        self.assertEqual(state['mode'], 'AMEND')
        self.assertTrue(state['migrations'])
        self.assertEqual(record.read_bytes(), original)

    def test_historical_run_is_inspectable_and_not_resumed(self):
        old = dict(issue=7, status='finished', started_at='old', plan=str(self.plan), components=[],
                   integration=dict(qc=dict(status='FIXES'), pushed=False))
        record = self.repo / '.feature/run-7.json'
        record.write_text(json.dumps(old))
        original = record.read_bytes()
        status = self.call('run-plan.py', 'status', '--issue', 7)
        self.assertEqual(status.returncode, 0, status.stderr)
        self.assertIn('historical worktree run', status.stdout)
        refused = self.call('run-plan.py', 'resume', '--issue', 7)
        self.assertNotEqual(refused.returncode, 0)
        self.assertIn('Historical worktree run', refused.stderr)
        self.assertEqual(record.read_bytes(), original)
        launched = self.launch()
        self.assertEqual(launched.returncode, 0, launched.stderr)
        watched = self.call('build-launch.py', 'watch', '--job', json.loads(launched.stdout)['job'], timeout=10)
        self.assertEqual(json.loads(watched.stdout.splitlines()[0])['status'], 'BUILT')

    def test_invalid_graphs_refuse_before_writes_and_headless_issue_read_only(self):
        for rows in ('| first | One | none | no |\n| first | Two | none | no |\n',
                     '| first | One | second | no |\n| second | Two | first | no |\n'):
            self.plan.write_text('| id | title | depends_on | migrations |\n| --- | --- | --- | --- |\n' + rows)
            rejected = self.call('run-plan.py', 'start', '--issue', 7)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertFalse((self.repo / '.feature/run-7.json').exists())
        guard = SCRIPTS.parent / 'hooks/headless-guard.sh'
        for cmd, expected in (('gh issue view 7 --json body', 0), ('gh issue comment 7 --body PASS', 2),
                              ('git -C /tmp push origin ft/7', 2), ('git branch --show-current', 0), ('git branch -D ft/7', 2)):
            checked = subprocess.run(['bash', str(guard)], input=json.dumps({'tool_input': {'command': cmd}}),
                                     env=dict(self.env, OPARAX_HEADLESS='1'), text=True, capture_output=True)
            self.assertEqual(checked.returncode, expected, checked.stderr)
        refused = subprocess.run(['bash', str(SCRIPTS / 'promote.sh'), 'beta', 'main'], cwd=self.repo,
                                 env=self.env, text=True, capture_output=True)
        self.assertEqual(refused.returncode, 2)
        self.assertIn('pull request', refused.stderr)
        direct_ship = subprocess.run(['bash', str(SCRIPTS / 'ship.sh'), '--onto', 'main', '7', 'fake'], cwd=self.repo,
                                     env=self.env, text=True, capture_output=True)
        self.assertEqual(direct_ship.returncode, 2)
        self.assertIn('pull request', direct_ship.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
