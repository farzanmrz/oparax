import test from 'node:test';
import assert from 'node:assert/strict';
import {actionMiddleware,failureReason,recordNoAction,modelReceipt,localSalesCall} from '../lib/eve-action-model.mjs';
import {noActionMessage,budgetMessage} from '../lib/eve-turn-receipt.mjs';
import {prepareEveSession,eveCaller} from '../lib/eve-bridge.mjs';
import {view} from '../lib/store.mjs';

const tool={type:'tool-call',toolCallId:'one',toolName:'handle_sales_request',input:JSON.stringify({action:'status',text:null,name:null,prospectId:null,channel:null,existingDraft:null,concrete:null})};
const parts=values=>new ReadableStream({start(c){for(const v of values)c.enqueue(v);c.close();}});
async function collect(stream){const result=[];for await(const p of stream)result.push(p);return result;}
const read=async()=>({status:'unconfirmed'});
test('native first step restricts its schema and suppresses free text even when the model ignores forced tools',async()=>{
 let failed=0;
 const mw=actionMiddleware({getReceipt:read,fail:async()=>{failed++;return noActionMessage;}});
 const forced=await mw.transformParams({params:{tools:[{name:'something_else'},{name:'handle_sales_request'}]}});
 assert.deepEqual(forced.toolChoice,{type:'tool',toolName:'handle_sales_request'});
 assert.deepEqual(forced.tools,[{name:'handle_sales_request'}]);
 const r=await mw.wrapStream({doStream:async()=>({stream:parts([{type:'text-delta',delta:'I sent an email to the wrong person.'},{type:'finish',finishReason:{unified:'stop'}}])})});
 const out=await collect(r.stream);assert.equal(failed,1);assert.ok(!JSON.stringify(out).includes('wrong person'));
 assert.ok(out.some(p=>p.delta===noActionMessage));assert.ok(!out.some(p=>p.type==='tool-call'));
});
test('one valid owner action is forwarded; following model step emits canonical receipt without any additional model call',async()=>{
 let state='unconfirmed';
 const mw=actionMiddleware({getReceipt:async()=>({status:state,answer:'Exact persisted answer.'}),fail:async()=>assert.fail('valid')});
 const first=await mw.wrapStream({doStream:async()=>({stream:parts([{type:'text-delta',delta:'Invented claim'},tool,{type:'finish',finishReason:{unified:'stop'}}])})});
 const out=await collect(first.stream);
 assert.deepEqual(out.filter(p=>p.type==='tool-call'),[tool]);assert.ok(!JSON.stringify(out).includes('Invented'));
 state='confirmed';const final=await mw.wrapStream({doStream:async()=>assert.fail('extra gateway call')});
 assert.equal((await collect(final.stream)).find(p=>p.type==='text-delta').delta,'Exact persisted answer.');
});
test('duplicate, wrongly named or malformed calls yield a no-action receipt without selecting an alternative',async()=>{
 for(const calls of [[tool,tool],[{...tool,toolName:'send_email'}],[{...tool,input:'{'}],[{...tool,providerExecuted:true}]]){
   const mw=actionMiddleware({getReceipt:read,fail:async()=>noActionMessage});
   const out=await mw.wrapStream({doStream:async()=>({stream:parts([...calls,{type:'finish'}])})});
   const events=await collect(out.stream);assert.equal(events.some(p=>p.type==='tool-call'),false);assert.ok(events.some(p=>p.delta===noActionMessage));
 }
});
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function fixture(){let data={bots:[],messages:[],leads:[],events:[]};return {get d(){return data},deps:{read:async()=>({data}),edit:async f=>{const next=structuredClone(data),result=f(next);data=next;return result;},start:async()=> 'wrun_fixture'}};}
async function context(w,raw){
 const t=await prepareEveSession(uid,raw,w.deps);
 const req=new Request('https://example.org/eve/v1/session/'+t.sessionId,{method:'POST',headers:{authorization:'Bearer '+t.bearer},body:JSON.stringify({message:raw.message,idempotencyKey:t.deliveryKey})});
 const caller=await eveCaller(req,w.deps);return {t,ctx:{session:{id:t.sessionId,auth:{current:caller,initiator:caller}}}};
}
test('a wrapped upstream 402 records a billing-safe no-action outcome, survives reload and retries the identical signed owner command',async()=>{
 process.env.SUPABASE_SECRET_KEY='fixture-only';
 const w=fixture(),raw={requestId:'gateway-fixture',message:'Describe a customer introduction',searchSources:['web']};
 const {ctx,t}=await context(w,raw);const wrapped=Object.assign(new Error('Gateway internal error'),{cause:{data:{upstreamStatusCode:402,apiErrorMessage:'private spend $51.21'}}});
 const mw=actionMiddleware({getReceipt:()=>modelReceipt(ctx,w.deps),fail:reason=>recordNoAction(ctx,w.deps,reason)});
 const out=await collect((await mw.wrapStream({doStream:async()=>{throw wrapped;}})).stream);
 assert.ok(out.some(p=>p.delta===budgetMessage));assert.equal(failureReason(wrapped),'model_budget');
 const turn=view(w.d).bots[0].chatTurn;assert.equal(turn.status,'failed');assert.equal(turn.reason,'model_budget');
 assert.equal(w.d.messages.length,2);assert.equal(w.d.conversationReceipts,undefined);assert.ok(!JSON.stringify(view(w.d)).includes('$51.21'));
 const retry=await context(w,{...raw,id:t.agentId});assert.notEqual(t.deliveryKey,retry.t.deliveryKey);
 assert.equal(retry.ctx.session.auth.current.attributes.requestId,raw.requestId);
 assert.equal(view(w.d).bots[0].chatTurn.status,'unconfirmed');
 const duplicate=await context(w,{...raw,id:t.agentId});assert.equal(duplicate.t.deliveryKey,retry.t.deliveryKey);
 assert.deepEqual(retry.t.sessionId,t.sessionId);
});
test('status, saved results and explicitly scoped memory use the registered domain endpoint with zero provider calls',async()=>{
 process.env.SUPABASE_SECRET_KEY='fixture-only';
 const w=fixture();
 for(const [message,expected] of [['What is the status of this research?','status'],['Show me the prospects','results'],['Remember for all my bots: our company name is Test Rentals.','answer'],['Write an introduction',null]]){
   const {ctx}=await context(w,{message,requestId:'status-'+expected+(expected===null?'none':'id')});
   const call=await localSalesCall(ctx,w.deps);
   if(!expected){assert.equal(call,null);continue;}
   assert.equal(JSON.parse(call.input).action,expected);
   const mw=actionMiddleware({getReceipt:read,getLocalCall:async()=>call,fail:async()=>assert.fail('failed')});
   const out=await mw.wrapStream({doStream:async()=>assert.fail('called paid gateway for deterministic command')});
   assert.deepEqual((await collect(out.stream)).filter(p=>p.type==='tool-call'),[call]);
 }
});
test('native tool returns only the latest committed reply after an earlier no-action attempt',async()=>{
 const {canonicalAnswer}=await import('../lib/eve-turn-receipt.mjs');
 const key='retry-confirmed',id='b';
 const messages=[{botId:id,role:'user',requestId:key,eveNoAction:key},{botId:id,role:'assistant',content:'Previous failure.',eveNoAction:key},
   {botId:id,role:'user',requestId:key},{botId:id,role:'assistant',content:'Persisted success.'},{botId:id,role:'user',requestId:'other'},{botId:id,role:'assistant',content:'Later reply.'}];
 assert.equal(canonicalAnswer({messages},id,key),'Persisted success.');
});
