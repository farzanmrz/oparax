import test from 'node:test';
import assert from 'node:assert/strict';
import {visualReview} from '../lib/visual.mjs';

const qwen = 'alibaba/qwen3.8-27b', sol = 'openai/gpt-6.2-sol';
const done = {action:'done',summary:'The team page names a procurement director.'};
const scroll = {action:'scroll',y:500};
const source = 'https://merchant.example/team';

function fixture(t, responses, screens = ['initial']) {
  const agent = {id:'b',brief:'Find buyers',modelPreference:'premium'};
  const prospect = {id:'p',botId:agent.id,company:'Merchant',source};
  const data = {bots:[agent],leads:[prospect],events:[]};
  const requests = [], frames = [];
  const key = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = 'test-only';
  t.after(()=>{if (key === undefined) delete process.env.AI_GATEWAY_API_KEY; else process.env.AI_GATEWAY_API_KEY = key;});
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,'https://ai-gateway.vercel.sh/v1/chat/completions');
    const request = JSON.parse(options.body);
    requests.push(request);
    const next = responses.shift();
    const result = typeof next === 'function' ? next(agent) : next;
    assert.notEqual(result,undefined,'unexpected additional call');
    const status = typeof result === 'number' ? result : 200;
    const content = typeof result === 'string' ? result : JSON.stringify(result);
    return Response.json({choices:[{message:{content},finish_reason:'stop'}], model:request.model, usage:{prompt_tokens:10,completion_tokens:5}}, {status});
  });
  const sandbox = {
    async runCommand(){return {exitCode:0,stdout:async()=>source};},
    async writeFiles(files){
      if(files[0].path === 'visual-input.json') frames.push(JSON.parse(files[0].content.toString()));
    },
    async readFileToBuffer(){return Buffer.from(screens.shift() ?? 'next page');},
    async stop(){},
  };
  const services = {editWorkspace:async fn=>fn(data), readWorkspace:async()=>({data}), openSandbox:async()=>sandbox};
  return {run:()=>visualReview(prospect.id,services), requests, frames, agent, prospect};
}

test('a routine screen uses only the low-cost Qwen image route even for a legacy pinned bot',async t=>{
  const f = fixture(t,[done]);
  await f.run();
  assert.equal(f.requests.length,1);
  const [request] = f.requests;
  assert.equal(request.model,qwen);
  assert.deepEqual(request.providerOptions,{gateway:{only:['runinfra']}});
  assert.deepEqual(request.reasoning,{effort:'none'});
  assert.deepEqual(request.response_format,{type:'json_object'});
  assert.match(request.messages[1].content[1].image_url.url,/^data:image\/jpeg;base64,/);
  assert.match(f.prospect.visual,/procurement director/);
  assert.deepEqual(f.agent.lastVisualReviewUsage.map(x=>[x.modelId,x.inputTokens]),[[qwen,10]]);
});

test('explicit uncertainty requests Sol once on the same screen, then ordinary steps return to Qwen',async t=>{
  const f = fixture(t,[{action:'help'},scroll,done],['first','second']);
  await f.run();
  assert.deepEqual(f.requests.map(r=>r.model),[qwen,sol,qwen]);
  assert.deepEqual(f.requests[0].messages,f.requests[1].messages);
  assert.equal(f.requests[1].providerOptions,undefined);
  assert.deepEqual(f.requests[1].reasoning,{effort:'low'});
  assert.deepEqual(f.frames.map(v=>v.actions),[[],[scroll]]);
  assert.deepEqual(f.agent.lastVisualReviewUsage.map(v=>v.modelId),[qwen,sol,qwen]);
});

test('a completed empty response gets one recovery call and both usage receipts',async t=>{
  const f = fixture(t,['',done]);
  await f.run();
  assert.deepEqual(f.requests.map(r=>r.model),[qwen,sol]);
  assert.deepEqual(f.agent.lastVisualReviewUsage.map(v=>v.modelId),[qwen,sol]);
});

test('disabling computer access between the primary request and recovery stops the review',async t=>{
  const f = fixture(t,[agent=>{
    agent.skillSettings = {computer_use:false};
    return {action:'help'};
  }]);
  await assert.rejects(f.run(),error=>error.status===403);
  assert.deepEqual(f.requests.map(r=>r.model),[qwen]);
  assert.equal(f.prospect.visual,undefined);
  assert.equal(f.agent.lease,null);
});

test('a stalled screen goes directly to Sol without another primary call',async t=>{
  const f = fixture(t,[scroll,done],['same','same']);
  await f.run();
  assert.deepEqual(f.requests.map(r=>r.model),[qwen,sol]);
});

test('bad model output can escalate once and unsafe actions never reach the browser',async t=>{
  const f = fixture(t,['unparseable',{action:'click',x:-1,y:0}]);
  await assert.rejects(f.run(),/could not choose a supported action/);
  assert.deepEqual(f.requests.map(r=>r.model),[qwen,sol]);
  assert.deepEqual(f.frames.map(v=>v.actions),[[]]);
  assert.equal(f.prospect.visual,undefined);
  assert.equal(f.agent.lease,null);
});

test('the final screen must yield an observation inside the original step limit',async t=>{
  const f = fixture(t,[scroll,scroll,scroll,scroll,done],['a','b','c','d']);
  await f.run();
  assert.equal(f.frames.length,4);
  assert.deepEqual(f.requests.map(r=>r.model),[qwen,qwen,qwen,qwen,sol]);
});

for (const status of [402,403,503]) {
  test('gateway status '+status+' stops without buying a fallback call',async t=>{
    const f = fixture(t,[status]);
    await assert.rejects(f.run(),/budget|AI Gateway returned/);
    assert.deepEqual(f.requests.map(r=>r.model),[qwen]);
    assert.equal(f.prospect.visual,undefined);
    assert.equal(f.agent.lease,null);
  });
}
