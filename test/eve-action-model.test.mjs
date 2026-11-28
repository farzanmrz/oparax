import test from 'node:test';
import assert from 'node:assert/strict';
import {actionMiddleware,failureReason,recordNoAction,modelReceipt,localSalesCall} from '../lib/eve-action-model.mjs';
import {noActionMessage,budgetMessage} from '../lib/eve-turn-receipt.mjs';
import {prepareEveSession,eveCaller,eveModelCall,runEveSalesTurn} from '../lib/eve-bridge.mjs';
import {messageAgent} from '../lib/conversation.mjs';
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
test('paid native calls report the selected bot, actual model and gateway usage once for generated and streamed replies',async()=>{
  process.env.SUPABASE_SECRET_KEY='fixture-only';
  const w=fixture(),{ctx,t}=await context(w,{message:'Describe an introduction',requestId:'usage-fixture',modelPreference:'grok'});
  const {modelId,onUsage}=await eveModelCall(ctx,w.deps);
  assert.equal(modelId,'spacexai/grok-4.7');
  const usage={inputTokens:{total:1000},outputTokens:{total:100}};
  const providerMetadata={gateway:{cost:'0.0023'}},reported='provider-actual-model';
  let writes=0,receipt={status:'unconfirmed'},local=null;
  const mw=actionMiddleware({getReceipt:async()=>receipt,getLocalCall:async()=>local,fail:async()=>noActionMessage,
    onUsage:async value=>{writes++;await onUsage(value);}});
  w.d.bots[0].modelPreference='premium'; // The in-flight generation keeps its original selection.
  await mw.wrapGenerate({doGenerate:async()=>({content:[tool],response:{modelId:reported},usage,providerMetadata})});
  const stored=()=>w.d.bots.find(b=>b.id===t.agentId).lastModelUsage;
  assert.equal(view(w.d).bots.find(b=>b.id===t.agentId).lastModelUsage,undefined);
  assert.equal(stored().preference,'auto');assert.equal(stored().requestedModel,modelId);assert.equal(stored().modelId,reported);
  assert.equal(stored().inputTokens,1000);assert.equal(stored().outputTokens,100);assert.equal(stored().costUsd,0.0023);
  const nativeStream=await mw.wrapStream({doStream:async()=>({stream:parts([{type:'response-metadata',modelId},tool,{type:'finish',usage}])})});
  await collect(nativeStream.stream);
  assert.equal(stored().modelId,modelId);assert.equal(stored().costBasis,'estimated_standard_text');assert.equal(writes,2);
  const never=async()=>assert.fail('unexpected generation');
  local=tool;await mw.wrapGenerate({doGenerate:never});await collect((await mw.wrapStream({doStream:never})).stream);
  local=null;receipt={status:'confirmed',answer:'Recorded.'};
  await mw.wrapGenerate({doGenerate:never});await collect((await mw.wrapStream({doStream:never})).stream);
  assert.equal(writes,2);
});
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
test('Barbour first turn opens source selection with zero model calls, and replay keeps one authorized public job',async()=>{
  process.env.SUPABASE_SECRET_KEY='fixture-only';
  const w=fixture(),brief='Find buyers at Barbour footwear',jobs=[];
  const fail=()=>assert.fail('A source gate must not require a model call.');
  const deps={...w.deps,messageAgent:(input,overrides)=>messageAgent(input,{...w.deps,...overrides,plan:fail}),kick:async()=>jobs.push(w.d.bots[0].researchJob?.id)};
  async function submit(raw){
    const {t,ctx}=await context(w,raw);
    const middleware=actionMiddleware({getReceipt:()=>modelReceipt(ctx,w.deps),getLocalCall:()=>localSalesCall(ctx,w.deps),fail});
    const parts=await collect((await middleware.wrapStream({doStream:fail})).stream);
    const toolCall=parts.find(p=>p.type==='tool-call');
    if(toolCall)await runEveSalesTurn(ctx,deps,JSON.parse(toolCall.input));
    return t.agentId;
  }
  const first={message:brief,requestId:'barbour-source-first'};
  const id=await submit(first);
  assert.equal(w.d.bots[0].brief,brief);assert.equal(w.d.bots[0].searchGate.status,'awaiting_source');
  assert.equal(w.d.messages.at(-1).details.type,'sourceChoice');assert.equal(w.d.bots[0].researchJob,undefined);
  await submit({...first,id});assert.equal(w.d.messages.length,2);assert.deepEqual(jobs,[]);
  await submit({id,message:'Sales Navigator',requestId:'barbour-private'});
  assert.equal(w.d.bots[0].searchGate.status,'private_access_required');assert.deepEqual(jobs,[]);
  const select={id,message:'Use these research sources: Public web.',searchSources:['web'],requestId:'barbour-public'};
  await submit(select);await submit(select);
  assert.deepEqual(jobs,[w.d.bots[0].researchJob.id]);assert.equal(w.d.bots.length,1);assert.equal(w.d.messages.length,6);
});
test('native tool returns only the latest committed reply after an earlier no-action attempt',async()=>{
 const {canonicalAnswer}=await import('../lib/eve-turn-receipt.mjs');
 const key='retry-confirmed',id='b';
 const messages=[{botId:id,role:'user',requestId:key,eveNoAction:key},{botId:id,role:'assistant',content:'Previous failure.',eveNoAction:key},
   {botId:id,role:'user',requestId:key},{botId:id,role:'assistant',content:'Persisted success.'},{botId:id,role:'user',requestId:'other'},{botId:id,role:'assistant',content:'Later reply.'}];
 assert.equal(canonicalAnswer({messages},id,key),'Persisted success.');
});

const handoff={...tool,input:JSON.stringify({...JSON.parse(tool.input),action:'request_review'})};
const finished={unified:'tool-calls',raw:'tool-calls'};
const commandSchema={name:'handle_sales_request',description:'Submit an action.',inputSchema:{
  type:'object',properties:{action:{type:'string',enum:['status','clarify']}}
}};
function answerFrom(modelId,content){
  return {content,response:{modelId},warnings:[],usage:{inputTokens:{total:10},outputTokens:{total:5}},finishReason:finished};
}
async function decideWithMiddleware(mode,mw,params,primary){
  if(mode==='generate')return (await mw.wrapGenerate({params,doGenerate:async()=>primary()})).content;
  const output=await mw.wrapStream({params,doStream:async()=>{
    const result=await primary();
    return {stream:parts([{type:'stream-start',warnings:[]},{type:'response-metadata',modelId:result.response.modelId},
      ...result.content,{type:'finish',finishReason:result.finishReason,usage:result.usage}])};
  }});
  return collect(output.stream);
}
for(const mode of ['generate','stream']){
  test(mode+' allows one internal difficulty review with the signed context and forwards only the checked final action',async()=>{
    process.env.SUPABASE_SECRET_KEY='fixture-only';
    const w=fixture(),{ctx}=await context(w,{message:'Interpret the account evidence',requestId:'review-test-'+mode});
    const route=await eveModelCall(ctx,w.deps),recorded=[],calls=[];
    assert.equal(route.modelId,'spacexai/grok-4.7');assert.equal(route.review.modelId,'openai/gpt-6.2-sol');
    const prompt=[{role:'user',content:[{type:'text',text:'Signed workspace facts'}]}],signal=new AbortController().signal;
    const mark=fn=>async info=>{await fn(info);recorded.push({...w.d.bots[0].lastModelUsage});};
    const mw=actionMiddleware({getReceipt:()=>modelReceipt(ctx,w.deps),onUsage:mark(route.onUsage),fail:()=>assert.fail('failed'),
      review:{onUsage:mark(route.review.onUsage),generate:async params=>{
        calls.push('review');assert.equal(params.prompt,prompt);assert.equal(params.abortSignal,signal);
        assert.equal(params.tools.length,1);assert.deepEqual(params.tools[0],commandSchema);
        assert.deepEqual(params.toolChoice,{type:'tool',toolName:'handle_sales_request'});
        return answerFrom(route.review.modelId,[{type:'text',text:'private second opinion'},tool]);
      }}});
    const params=await mw.transformParams({params:{prompt,abortSignal:signal,tools:[commandSchema,{name:'different_tool'}]}});
    assert.ok(params.tools[0].inputSchema.properties.action.enum.includes('request_review'));
    const output=await decideWithMiddleware(mode,mw,params,()=>{calls.push('routine');return answerFrom(route.modelId,[handoff]);});
    assert.deepEqual(calls,['routine','review']);assert.deepEqual(output.filter(p=>p.type==='tool-call'),[tool]);
    assert.ok(!JSON.stringify(output).includes('second opinion'));assert.ok(!JSON.stringify(output).includes('request_review'));
    assert.deepEqual(recorded.map(r=>r.requestedModel),[route.modelId,route.review.modelId]);
  });
  test(mode+' declines malformed and repeated review signals, preserves normal clarification and does not retry HTTP failures',async()=>{
    const clarify={...tool,input:JSON.stringify({...JSON.parse(tool.input),action:'clarify',text:'Which region?'})};
    const malformed={...tool,input:JSON.stringify({...JSON.parse(handoff.input),channel:'email'})};
    for(const [first,second,wantedCalls,expected] of [
      [[clarify],null,0,'clarify'],[[malformed],null,0,'failed'],[[handoff,tool],null,0,'failed'],
      [[handoff],[handoff],1,'failed'],[[handoff],[tool,tool],1,'failed'],
      [Object.assign(new Error('Access denied'),{status:403}),null,0,'failed'],
      [Object.assign(new Error('budget'),{status:402}),null,0,'model_budget'],
      [[handoff],Object.assign(new Error('budget'),{status:402}),1,'model_budget']
    ]){
      let reviews=0;
      const mw=actionMiddleware({getReceipt:read,fail:async reason=>reason==='model_budget'?'model_budget':'failed',
        review:{onUsage:async()=>{},generate:async()=>{reviews++;if(second instanceof Error)throw second;return answerFrom('review',second);}}});
      const params=await mw.transformParams({params:{tools:[commandSchema]}});
      const out=await decideWithMiddleware(mode,mw,params,()=>{if(first instanceof Error)throw first;return answerFrom('routine',first);});
      assert.equal(reviews,wantedCalls);
      if(expected==='clarify')assert.deepEqual(out.filter(p=>p.type==='tool-call'),[clarify]);
      else {assert.ok(out.some(p=>(p.text||p.delta)===expected));assert.equal(out.some(p=>p.type==='tool-call'),false);}
    }
  });
}
