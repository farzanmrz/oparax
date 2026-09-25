#!/usr/bin/env python3
"""A sealed host draft plus a resumable peer, with bounded detached execution.

Only `exchange` exposes the peer answer. The host must seal its own draft
before start. New phases use new directories/sessions; replies use exact IDs.
This is an orchestration boundary, not a sandbox between adversarial agents.
"""
import argparse
import contextlib
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import uuid

sys.path.insert(0, str(Path.home() / '.agents/skills/counsel/scripts'))
# Model ids and CLI launch commands are shared with the counsel skill's runner.
from providers import MODELS as COUNSEL_MODELS, claude_command, codex_command  # noqa: E402

SCHEMA = {"type": "object", "properties": {"answer": {"type": "string"}},
          "required": ["answer"], "additionalProperties": False}
MODELS = {name: COUNSEL_MODELS[name][1] for name in ('fable', 'sol', 'astra')}
# The default partner is Astra. Routine phases honor an explicit Sol override;
# only detail and redesign are always Astra.
PHASES = {'scope': 'routine', 'plain': 'routine', 'detail': 'astra',
          'design-review': 'routine', 'adjudication': 'routine', 'redesign': 'astra'}
RESEARCH_PHASES = {'scope', 'plain', 'design-review'}
RULES = """You are the independent planning peer in /feature or /amend, not its coordinator.
Do only the assignment below. Do not invoke /feature, /amend or another workflow.
Read repository source as needed, but do not change repository files, git,
external services or product data.
Do not run the product app, tests or builds. No subagents or external writes.
Only read third-party public types and docs, never built package internals.
Do not inspect .feature/, other agent sessions, logs, transcripts or drafts.
All authorized planning inputs are supplied below; only explicitly named shared
reference files may be read in addition to source. Do not search for your peer's
answer. Until the EXCHANGE message, form your own answer without seeing theirs.
Owner decisions are binding; assistant proposals are not owner decisions.
Return the requested work in the `answer` field of the output JSON schema.
Use no em dashes. Cite source paths, URLs or observed visual states for facts.
"""


def rules(state):
    if state['phase'] in RESEARCH_PHASES:
        research = ('Independently research the supplied references before recommending a direction. '
                    'Web search and retrieval are allowed. Use the original owner input, detailed '
                    'reference observations and any supplied artifacts to form your own view. '
                    'Do not launch browsers, install tools or probe browser capabilities here. '
                    'Ask the coordinator for missing substantive details in one batch if needed. '
                    'Distinguish direct observations from its interpretations and challenge unsupported '
                    'assumptions. State whether your assessment is based on descriptions, source or '
                    'actual images; do not claim to have seen a page you have not seen. Do not let the coordinator\'s '
                    'interpretation replace the original owner input or references.\n')
    else:
        research = 'Do not run browsers or previews in this phase.\n'
    if state['phase'] == 'design-review':
        research += ('Review the actual supplied design images against the agreed direction. '
                     'The coordinator\'s description supplements those images, never replaces them. '
                     'Report if you cannot view them rather than returning a visual verdict.\n')
    images = state.get('images', [])
    visual = ('Shared image files (read these directly; attached to Codex calls):\n' +
              '\n'.join(str(Path(state['run']) / p) for p in images) + '\n') if images else ''
    return RULES + research + visual


def read_text(path):
    text = Path(path).read_text()
    if not text.strip():
        raise ValueError(f"Empty input: {path}")
    return text


def write_json(path, value):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, indent=2) + '\n')
    temp.replace(path)


def digest(text):
    return hashlib.sha256(text.encode() if isinstance(text, str) else text).hexdigest()


def image_inputs(paths):
    images = []
    for value in paths:
        path = Path(value).resolve()
        if path.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            raise ValueError(f'Use a rendered PNG, JPEG or WebP image: {path}')
        data = path.read_bytes()
        if not data:
            raise ValueError(f'Empty image: {path}')
        images.append((path.suffix.lower(), data))
    return images


def save_images(run, state, images):
    if not images:
        return
    names = []
    for index, (suffix, data) in enumerate(images):
        name = f'image-{state["turn"]}-{index}{suffix}'
        (run / name).write_bytes(data)
        state['sealed'][name] = digest(data)
        names.append(name)
    state['images'] = names


@contextlib.contextmanager
def locked(run):
    with (run / 'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield


def load(run):
    state = json.loads((run / 'state.json').read_text())
    for name, expected in state['sealed'].items():
        if digest((run / name).read_bytes()) != expected:
            raise ValueError(f"Sealed input changed: {name}. Start a new round.")
    return state


def save(run, state):
    write_json(run / 'state.json', state)


def alive(pid):
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False


def kill_group(pid):
    if pid:
        try:
            os.killpg(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def refresh(run, state):
    if state['status'] in ('STARTING', 'RUNNING'):
        if time.time() > state['deadline']:
            kill_group(state.get('child_pid'))
            kill_group(state.get('worker_pid'))
            state.update(status='TIMED_OUT', error='Hard deadline exceeded')
            save(run, state)
        elif not alive(state.get('worker_pid')):
            kill_group(state.get('child_pid'))
            state.update(status='FAILED', error='Worker exited without a result')
            save(run, state)
    return state


def report(state):
    # Deliberately no answer, raw log or sealed draft paths in progress output.
    print(json.dumps({k: state.get(k) for k in
                      ('status', 'phase', 'pair_model', 'peer', 'model', 'turn', 'session_id',
                       'error', 'deadline')}))


def peer_for(host, phase, pair_model='astra'):
    codex_partner = 'astra' if PHASES[phase] == 'astra' else pair_model
    if host == 'fable':
        return codex_partner
    if host == codex_partner:
        return 'fable'
    raise ValueError(f'{phase} requires Fable and {codex_partner.title()}; '
                     f'{host.title()} cannot author the host draft for this phase')


def launch(run, state, prompt):
    turn = state['turn']
    (run / f'prompt-{turn}.txt').write_text(prompt)
    state.update(status='STARTING', error=None, child_pid=None,
                 deadline=time.time() + state['timeout'])
    save(run, state)
    with (run / f'worker-{turn}.log').open('w') as log:
        worker = subprocess.Popen([sys.executable, str(Path(__file__).resolve()),
                                   '_run', str(run)], stdin=subprocess.DEVNULL,
                                  stdout=log, stderr=log, start_new_session=True)
    state['worker_pid'] = worker.pid
    save(run, state)
    report(state)


def command(run, state):
    session = state.get('session_id')
    research = state['phase'] in RESEARCH_PHASES
    if state['peer'] in ('astra', 'sol'):
        return codex_command(state['model'], 'high', cwd=state['repo'], resume=session,
                             schema=str(run / 'schema.json'), web=research,
                             images=tuple(str(run / name) for name in state.get('images', [])))
    tools = ('Read', 'Glob', 'Grep') + (('WebFetch', 'WebSearch') if research else ())
    return claude_command(state['model'], 'high', tools=tools, schema=json.dumps(SCHEMA),
                          resume=session)


def parse_output(peer, raw):
    if peer in ('astra', 'sol'):
        events = [json.loads(line) for line in raw.splitlines() if line.strip()]
        ids = [e['thread_id'] for e in events if e.get('type') == 'thread.started']
        answers = [e['item']['text'] for e in events
                   if e.get('type') == 'item.completed'
                   and e.get('item', {}).get('type') == 'agent_message']
        if not ids or not answers or not any(e.get('type') == 'turn.completed' for e in events):
            raise ValueError('Missing completed turn, session ID or final answer')
        session, result = ids[-1], json.loads(answers[-1])
    else:
        envelope = json.loads(raw)
        if envelope.get('is_error') or envelope.get('subtype') != 'success':
            raise ValueError('Claude did not return a successful result')
        session = envelope['session_id']
        result = envelope.get('structured_output')
        if result is None:
            result = json.loads(envelope['result'])
    uuid.UUID(session)
    if not isinstance(result, dict) or not isinstance(result.get('answer'), str) or not result['answer'].strip():
        raise ValueError('Missing nonempty answer field')
    return session, result['answer']



def failure_reason(raw, exit_code):
    """Surface provider errors without making the host read partial transcripts."""
    reason = f"CLI exited {exit_code}"
    for line in raw.splitlines():
        try:
            event = json.loads(line)
            if event.get('type') == 'error':
                reason = event.get('message', reason)
            elif event.get('type') == 'turn.failed':
                reason = event.get('error', {}).get('message', reason)
            elif event.get('type') == 'result' and event.get('is_error'):
                reason = event.get('result', reason)
        except (ValueError, AttributeError):
            continue
    return str(reason)[:600]


def work(run):
    with locked(run):
        state = load(run)
        if state['status'] != 'STARTING':
            return
        turn = state['turn']
        prompt = read_text(run / f'prompt-{turn}.txt')
        cmd = command(run, state)
        # Claude Code disallows nesting an interactive session. This is a
        # separate, read-only print subprocess with its own explicit session.
        env = os.environ.copy()
        env.pop('CLAUDECODE', None)
        try:
            out = (run / f'raw-{turn}.json').open('w')
            err = (run / f'stderr-{turn}.txt').open('w')
            child = subprocess.Popen(cmd, cwd=state['repo'], env=env,
                                     stdin=subprocess.PIPE, stdout=out, stderr=err,
                                     start_new_session=True)
            state.update(status='RUNNING', child_pid=child.pid)
            save(run, state)
        except OSError as exc:
            state.update(status='FAILED', error=str(exc))
            save(run, state)
            return
    status, error, session, answer = 'FAILED', None, None, None
    try:
        child.communicate(prompt.encode(), timeout=max(1, state['deadline'] - time.time()))
        if child.returncode:
            out.flush()
            raise ValueError(failure_reason((run / f'raw-{turn}.json').read_text(), child.returncode))
        out.close()
        session, answer = parse_output(state['peer'], (run / f'raw-{turn}.json').read_text())
        if state.get('session_id') and session != state['session_id']:
            raise ValueError('Resume returned a different session ID')
        status = 'READY'
    except subprocess.TimeoutExpired:
        kill_group(child.pid)
        child.wait()
        status, error = 'TIMED_OUT', 'CLI exceeded the hard deadline'
    except (ValueError, KeyError, TypeError, OSError) as exc:
        error = str(exc)
    finally:
        out.close()
        err.close()
    with locked(run):
        current = load(run)
        if current['status'] != 'RUNNING' or current['turn'] != turn:
            return
        current.update(status=status, error=error, child_pid=None)
        if status == 'READY':
            (run / f'answer-{turn}.md').write_text(answer + '\n')
            current['sealed'][f'answer-{turn}.md'] = digest(answer + '\n')
            current['session_id'] = session
        save(run, current)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest='cmd', required=True)
    start = subs.add_parser('start')
    start.add_argument('run')
    start.add_argument('--repo', required=True)
    start.add_argument('--brief', required=True)
    start.add_argument('--owner-input', required=True, help='Unedited owner messages and corrections')
    start.add_argument('--host-draft', required=True)
    start.add_argument('--host', choices=list(MODELS), required=True)
    start.add_argument('--phase', choices=list(PHASES), required=True)
    start.add_argument('--pair-model', type=str.lower, choices=['sol', 'astra'], default='astra')
    start.add_argument('--image', action='append', default=[])
    start.add_argument('--reason', help='Required for a substantial post-critique redesign')
    start.add_argument('--timeout', type=int, default=900)
    for name in ('status', 'exchange', 'cancel', '_run'):
        subs.add_parser(name).add_argument('run')
    wait = subs.add_parser('wait')
    wait.add_argument('run')
    wait.add_argument('--seconds', type=int, default=30, choices=range(1, 61), metavar='1..60')
    reply = subs.add_parser('reply')
    reply.add_argument('run')
    reply.add_argument('--message', required=True)
    reply.add_argument('--image', action='append', default=[])
    args = parser.parse_args()
    run = Path(args.run).resolve()
    if args.cmd == '_run':
        work(run)
        return
    if args.cmd == 'start':
        if not 1 <= args.timeout <= 900:
            raise ValueError('timeout must be between 1 and 900 seconds')
        peer = peer_for(args.host, args.phase, args.pair_model)
        if args.phase == 'redesign' and not (args.reason or '').strip():
            raise ValueError('redesign requires --reason explaining the substantial design change')
        brief, draft = read_text(args.brief), read_text(args.host_draft)
        owner_input = read_text(args.owner_input)
        images = image_inputs(args.image)
        if args.phase == 'design-review' and not images:
            raise ValueError('design-review requires --image with the actual generated design')
        repo = Path(args.repo).resolve()
        if not repo.is_dir():
            raise ValueError('Repository directory is missing')
        run.mkdir(parents=True, exist_ok=False)
        (run / 'brief.md').write_text(brief)
        (run / 'host-draft.md').write_text(draft)
        (run / 'owner-input.md').write_text(owner_input)
        write_json(run / 'schema.json', SCHEMA)
        state = dict(repo=str(repo), run=str(run), host=args.host, phase=args.phase,
                     pair_model=args.pair_model,
                     peer=peer, model=MODELS[peer], reason=args.reason,
                     session_id=None, turn=0, timeout=args.timeout,
                     sealed={'brief.md': digest(brief), 'host-draft.md': digest(draft),
                             'owner-input.md': digest(owner_input)})
        save_images(run, state, images)
        with locked(run):
            launch(run, state, rules(state) + '\nORIGINAL OWNER INPUT\n' + owner_input +
                   '\nINDEPENDENT ASSIGNMENT\n' + brief)
        return
    if args.cmd == 'wait':
        until = time.time() + args.seconds
        while True:
            with locked(run):
                state = refresh(run, load(run))
            if state['status'] not in ('STARTING', 'RUNNING') or time.time() >= until:
                report(state)
                return
            time.sleep(min(1, max(0, until - time.time())))
    with locked(run):
        state = refresh(run, load(run))
        if args.cmd == 'status':
            report(state)
        elif args.cmd == 'cancel':
            if state['status'] in ('STARTING', 'RUNNING'):
                kill_group(state.get('child_pid'))
                kill_group(state.get('worker_pid'))
                state.update(status='CANCELLED', error='Cancelled by coordinator')
                save(run, state)
            report(state)
        elif args.cmd == 'exchange':
            if state['status'] not in ('READY', 'EXCHANGED'):
                raise ValueError(f"Exchange closed: {state['status']}")
            state['status'] = 'EXCHANGED'
            save(run, state)
            print(json.dumps({'status': 'EXCHANGED', 'session_id': state['session_id'],
                              'host_draft': read_text(run / 'host-draft.md'),
                              'peer_answer': read_text(run / f"answer-{state['turn']}.md")}))
        elif args.cmd == 'reply':
            if state['status'] != 'EXCHANGED':
                raise ValueError('Exchange the completed answer before sending a reply')
            limit = 2 if state['phase'] == 'design-review' else 3
            if state['turn'] >= limit:
                raise ValueError(f'{limit} follow-ups used. Bring remaining choices to the owner.')
            message = read_text(args.message)
            images = image_inputs(args.image)
            if state['turn'] == 0:
                message = 'Your peer independently wrote:\n' + read_text(run / 'host-draft.md') + '\n\n' + message
            state['turn'] += 1
            state.setdefault('run', str(run))
            save_images(run, state, images)
            name = f"message-{state['turn']}.md"
            (run / name).write_text(message)
            state['sealed'][name] = digest(message)
            launch(run, state, rules(state) + '\nEXCHANGE\n' + message)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError) as exc:
        print(json.dumps({'status': 'ERROR', 'error': str(exc)}), file=sys.stderr)
        sys.exit(1)
