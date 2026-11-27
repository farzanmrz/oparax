import assert from 'node:assert/strict';
import test from 'node:test';
import {startComputer,computerWaitMs} from '../app/start-computer.mjs';

const base={agentId:'bot',provider:'linkedin',requestId:'stable-id',getToken:async()=>'user-access',onStarting:()=>{}};
const ticket={provider:'linkedin',url:'https://desktop.example/handoff/short',expiresAt:'2027-05-01T01:00:00Z'};
const time=()=>Date.parse('2027-05-01T00:00:00Z');
test('a cold VM polls with the identical request ID, renewed authorization, and bounded waits',async()=>{
  const delays=[],requests=[];let starts=0;
  const result=await startComputer({...base,getToken:async()=>'access-'+(requests.length+1),signal:new AbortController().signal,onStarting:()=>starts++},{
    request:async(path,opts)=>{requests.push({path,body:opts.body,auth:opts.headers.Authorization});
      return requests.length===1?Response.json({status:'starting',retryAfterMs:1},{status:202}):
        requests.length===2?Response.json({status:'starting',retryAfterMs:20000}):Response.json(ticket);},
    delay:async ms=>delays.push(ms),now:time});
  assert.equal(starts,2);assert.deepEqual(delays,[2000,6000]);assert.equal(result.url,ticket.url);
  assert.equal(new Set(requests.map(req=>req.body)).size,1);assert.equal(JSON.parse(requests[0].body).requestId,'stable-id');
  assert.deepEqual(requests.map(req=>req.auth),['Bearer access-1','Bearer access-2','Bearer access-3']);
  assert.ok(requests.every(req=>req.path==='/api/agent-computer'));
});
test('stops polling when the operator cancels or startup times out',async()=>{
  const controller=new AbortController();let calls=0;
  await assert.rejects(startComputer({...base,signal:controller.signal},{request:async()=>{calls++;return Response.json({status:'starting'},{status:202})},delay:async()=>controller.abort(new Error('closed popup'))}),/closed popup/);
  assert.equal(calls,1);
  let timestamp=time();
  await assert.rejects(startComputer({...base,signal:new AbortController().signal},{request:async()=>Response.json({status:'starting'},{status:202}),delay:async()=>{timestamp+=computerWaitMs+1},now:()=>timestamp}),/longer than expected/);
});
test('rejects a wrong provider, expired ticket or non-secure destination',async()=>{
  for(const overrides of [{provider:'sales_navigator'},{expiresAt:'2027-04-01T00:00:00Z'},{url:'http://example.test'}]){
    await assert.rejects(startComputer({...base,signal:new AbortController().signal},{request:async()=>Response.json({...ticket,...overrides}),now:time}),/invalid or expired/);
  }
});
