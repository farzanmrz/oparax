import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareEveSession,eveCaller,eveModel,runEveSalesTurn,parseTicket,ticket} from '../lib/eve-bridge.mjs';
import {view,workspaceId} from '../lib/store.mjs';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function workspace(){let d={bots:[],leads:[],messages:[],events:[]},creates=0;
  return {get d(){return d},get creates(){return creates},deps:{edit:async change=>{const next=structuredClone(d),result=change(next);d=next;return result;},read:async()=>({data:d}),start:async()=>{creates++;return 'wrun_test123';}}};
}
const request=(path,token,body)=>new Request('https://example.test'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token},...(body===undefined?{}:{body:JSON.stringify(body)})});
test('Eve creates one durable named bot/session, authorizes only its literal commands, and safely restores after reload',async()=>{
  process.env.SUPABASE_SECRET_KEY='test-fixture-only';
  const w=workspace(),input={message:'Check status',requestId:'turn-a-00001',botName:'My worker',modelPreference:'grok'};
  const fresh=await prepareEveSession(uid,input,w.deps),again=await prepareEveSession(uid,input,w.deps);
  assert.equal(fresh.agentId,again.agentId);assert.equal(w.creates,1);assert.equal(w.d.bots.length,1);assert.equal(w.d.bots[0].name,'My worker');
  await assert.rejects(prepareEveSession(uid,{...input,message:'A different message'},w.deps),/different text/);
  const base='/eve/v1/session/'+fresh.sessionId;
  const principal=await eveCaller(request(base,fresh.bearer,{message:input.message,turnPolicy:'queue',idempotencyKey:input.requestId}),w.deps);
  assert.equal(principal.attributes.workspace,uid);assert.equal(principal.attributes.requestId,input.requestId);
  assert.equal(await eveCaller(request(base,fresh.bearer,{message:'Send a different email'}),w.deps),null);
  assert.equal(await eveCaller(request(base+'/end',fresh.bearer,{}),w.deps),null);
  assert.equal(await eveCaller(request('/eve/v1/session/other/stream',fresh.bearer),w.deps),null);
  assert.equal(await eveCaller(request('/eve/v1/session',fresh.bearer,{}),w.deps),null);
  const reloaded=await prepareEveSession(uid,{id:fresh.agentId},w.deps);
  assert.equal(reloaded.sessionId,fresh.sessionId);
  assert.ok(await eveCaller(request(base+'/stream',reloaded.bearer),w.deps));
  assert.equal(await eveCaller(request(base,reloaded.bearer,{message:input.message}),w.deps),null);
  const ctx={session:{id:fresh.sessionId,auth:{current:principal,initiator:principal}}};assert.equal(await eveModel(ctx,w.deps),'spacexai/grok-4.7');
  let seen;
  const result=await runEveSalesTurn(ctx,{...w.deps,messageAgent:async arg=>{seen={...arg,owner:workspaceId()};w.d.conversationReceipts={[input.requestId]:{agentId:fresh.agentId}};w.d.messages.push({role:'user',botId:fresh.agentId,requestId:input.requestId},{role:'assistant',botId:fresh.agentId,content:'Checked the saved workspace.'});return {};}});
  assert.deepEqual(seen,{id:fresh.agentId,message:input.message,requestId:input.requestId,owner:uid});assert.equal(result.reply,'Checked the saved workspace.');
  const publicData=JSON.stringify(view(w.d));assert.ok(!publicData.includes('eveInputs')&&!publicData.includes('eveStartRequests'));
  const bad={...principal,principalId:other+'/'+fresh.agentId};
  await assert.rejects(runEveSalesTurn({session:{...ctx.session,auth:{...ctx.session.auth,current:bad}}},w.deps),/authorized/);
});
test('only internal, signed bootstrap tickets can create an idle native session',async()=>{
  process.env.SUPABASE_SECRET_KEY='test-fixture-only';const token=ticket({uid,bot:other,scope:'create'});
  assert.equal(await eveCaller(request('/eve/v1/session',token,{message:'bypass',operationId:'oparax-'+other+'-a'})),null);
  assert.ok(await eveCaller(request('/eve/v1/session',token,{operationId:'oparax-'+other+'-a'})));
  assert.equal(parseTicket(token+'!'),null);
});
test('concurrent first turns publish a single native session and a retired session can be replaced without losing the bot',async()=>{
 process.env.SUPABASE_SECRET_KEY='test-fixture-only';
 const w=workspace(),input={message:'Status',requestId:'concurrent-flight'};
 let count=0;const deps={...w.deps,start:async()=>{const n=++count;await new Promise(r=>setTimeout(r,20));return 'wrun_session'+n;}};
 const [a,b]=await Promise.all([prepareEveSession(uid,input,deps),prepareEveSession(uid,input,deps)]);
 assert.equal(a.agentId,b.agentId);assert.equal(a.sessionId,b.sessionId);assert.equal(count,1);
 w.d.bots[0].eveBinding.checkedAt=0;
 const c=await prepareEveSession(uid,{id:a.agentId},{...deps,retired:async()=>true});
 assert.equal(c.agentId,a.agentId);assert.notEqual(c.sessionId,a.sessionId);assert.equal(w.d.bots.length,1);
});

test('a browser submission queues its signed literal once by key and receives a read-only native receipt',async()=>{
  process.env.SUPABASE_SECRET_KEY='test-fixture-only';
  const w=workspace(),calls=[],deliveries=new Map(),input={message:'Find buyers at Barbour footwear',requestId:'browser-first-00001'};
  const deps={...w.deps,fetch:async (url,options)=>{
    const req=new Request(url,options),caller=await eveCaller(req,w.deps);
    assert.equal(caller.attributes.requestId,input.requestId);
    const payload=await req.json();calls.push(payload);
    assert.deepEqual(payload,{message:input.message,turnPolicy:'queue',idempotencyKey:input.requestId});
    if(calls.length===1)return Response.json({code:'session_not_ready'},{status:409});
    deliveries.set(payload.idempotencyKey,'delivery-1');
    return Response.json({sessionId:'wrun_test123',deliveryId:deliveries.get(payload.idempotencyKey)},{status:202});
  }};
  const a=await prepareEveSession(uid,input,deps,true),b=await prepareEveSession(uid,input,deps,true);
  assert.equal(a.deliveryId,'delivery-1');assert.equal(b.deliveryId,a.deliveryId);assert.equal(deliveries.size,1);
  assert.equal(a.agentId,b.agentId);assert.equal(calls.length,3);assert.equal(w.creates,1);
  assert.equal(parseTicket(a.bearer).scope,'read');
  assert.equal(await eveCaller(request('/eve/v1/session/'+a.sessionId,a.bearer,calls[0]),w.deps),null);
  assert.ok(await eveCaller(request('/eve/v1/session/'+a.sessionId+'/stream',a.bearer),w.deps));
  const restored=await prepareEveSession(uid,{id:a.agentId},deps,true);
  assert.equal(restored.deliveryId,undefined);assert.equal(calls.length,3);
});

test('legacy first turns rebind only after finite, delivery-free native history is proven',async()=>{
  process.env.SUPABASE_SECRET_KEY='test-fixture-only';
  for(const mode of ['empty','started','admitted','ambiguous','unavailable','ledger']){
    const w=workspace(),input={message:'Find buyers at Barbour footwear',requestId:'legacy-first-00001'};
    const old=await prepareEveSession(uid,input,w.deps);
    const agent=w.d.bots[0];delete agent.eveBinding.serverQueue;
    if(mode==='ledger')w.d.messages.push({botId:agent.id,role:'user',content:input.message});
    const binds=[],posts=[],reads=[];
    const deps={...w.deps,start:async()=>{binds.push(true);return 'wrun_currentBuild';},fetch:async(url,options)=>{
      if(url.includes('/stream?follow=false')){
        reads.push(url);
        if(mode==='unavailable')return new Response(null,{status:503});
        const facts=mode==='admitted'?[{type:'session.started'},{type:'delivery.admitted'}]:[{type:'session.started'}];
        const lines=[{$eve:'heartbeat'},...(mode==='empty'?[]:[{facts}]),{$eve:'stream.ended'}];
        return new Response(lines.map(JSON.stringify).join('\n'),{headers:{
          'x-eve-stream-tail-index':mode==='empty'?'-1':'0','x-eve-session-id':mode==='ambiguous'?'wrun_other':old.sessionId
        }});
      }
      const req=new Request(url,options),auth=await eveCaller(req,w.deps);assert.equal(auth.attributes.requestId,input.requestId);
      posts.push(await req.json());return Response.json({sessionId:url.split('/').at(-1),deliveryId:'saved-delivery'},{status:202});
    }};
    const result=await prepareEveSession(uid,{id:agent.id,...input},deps,true);
    const unused=['empty','started'].includes(mode);
    assert.equal(result.sessionId,unused?'wrun_currentBuild':old.sessionId,mode);
    assert.equal(binds.length,unused?1:0,mode);assert.equal(reads.length,mode==='ledger'?0:1,mode);
    assert.equal(w.d.bots.length,1);assert.equal(result.agentId,old.agentId);
    assert.equal(posts.length,1);assert.equal(posts[0].idempotencyKey,input.requestId);
  }
});

test('an unconfirmed or mismatched native response never becomes a saved or displayed success',async()=>{
  process.env.SUPABASE_SECRET_KEY='test-fixture-only';
  const w=workspace(),input={message:'Check the status.',requestId:'missing-receipt-00001'};
  const fetch=async()=>Response.json({sessionId:'wrun_other',deliveryId:'different'},{status:202});
  await assert.rejects(prepareEveSession(uid,input,{...w.deps,fetch},true),/did not confirm delivery/);
  assert.equal(view(w.d).bots[0].chatTurn.status,'unconfirmed');
});
