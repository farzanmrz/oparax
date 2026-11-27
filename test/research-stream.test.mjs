import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/research-stream/route.js';

const owner = '33333333-3333-4333-8333-333333333333';
const agent = '11111111-1111-4111-8111-111111111111';

test('research activity streams only the signed-in owner’s selected agent', async t => {
  const previous = { ...process.env };
  t.after(() => {
    for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY']) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'only-for-this-test';
  const reads = [];
  const job = { id: 'job', status: 'goal_met', goal: 5, qualified: 5, seen: ['internal-search'] };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/auth/v1/user')) {
      assert.equal(options.headers.authorization, 'Bearer fixture');
      return Response.json({ id: owner, email: 'owner@example.test', email_confirmed_at: 'now' });
    }
    assert.equal(url, 'https://db.example.test/rest/v1/rpc/outreach_user_read');
    reads.push(JSON.parse(options.body).uid);
    return Response.json({ rev: 1, data: { bots: [
      { id: agent, name: 'Research team', researchWake: 'private-wake', inbox: { key: 'private-inbox' },
        researchJob: job,
        lastRun: {status: 'goal_met'} }
    ], mailbox: { secret: 'private-credential' } } });
  });

  const url = 'https://outreach.example.test/api/research-stream?id=';
  const noAuth = await GET(new Request(url + agent + '&access_token=fixture'));
  assert.equal(noAuth.status, 401);
  assert.equal(reads.length, 0);
  const headers = { authorization: 'Bearer fixture' };
  const foreign = await GET(new Request(url + '22222222-2222-4222-8222-222222222222', { headers }));
  assert.equal(foreign.status, 404);
  const response = await GET(new Request(url + agent, { headers }));
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const body = await response.text();
  assert.doesNotMatch(body, /private-|internal-search/);
  assert.match(body, /event: snapshot\n/);
  const data = JSON.parse(body.split('\n').find(line => line.startsWith('data: ')).slice(6));
  assert.equal(data.finished, true);
  assert.equal(data.qualified, 5);
  assert.deepEqual(reads, [owner, owner]);

  job.status = 'running';
  job.qualified = 3;
  const live = await GET(new Request(url + agent, { headers }));
  const reader = live.body.getReader();
  const decoder = new TextDecoder();
  assert.match(decoder.decode((await reader.read()).value), /retry:/);
  assert.match(decoder.decode((await reader.read()).value), /"qualified":3/);
  job.status = 'goal_met';
  job.qualified = 5;
  const finalFrame = decoder.decode((await reader.read()).value);
  assert.match(finalFrame, /"finished":true/);
  assert.match(finalFrame, /"qualified":5/);
  assert.equal((await reader.read()).done, true);

  job.status = 'running';
  const aborter = new AbortController();
  const interrupted = await GET(new Request(url + agent, { headers, signal: aborter.signal }));
  const unfinished = interrupted.body.getReader();
  await unfinished.read();
  await unfinished.read();
  aborter.abort();
  assert.equal((await unfinished.read()).done, true);
});
