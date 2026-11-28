import assert from 'node:assert/strict';
import test from 'node:test';
import {view} from '../lib/store.mjs';
import {budgetMessage,chatStatus,conversationRows,isModelBudgetFailure,retryTurnPayload,visibleEveTools} from '../app/eve-result.mjs';

test('streaming text or tool output never becomes a confirmed sales action',()=>{
  const message={role:'assistant',parts:[
    {type:'text',text:'I sent three emails.'},{type:'reasoning',text:'Private reasoning'},
    {type:'tool',name:'unknown',state:'completed',output:'Arbitrary output'},
    {type:'tool',name:'handle_sales_request',state:'completed',callId:'c123',output:{sent:3}}
  ]};
  assert.deepEqual(visibleEveTools(message),[{id:'c123',state:'completed'}]);
  assert.deepEqual(visibleEveTools({role:'user',parts:message.parts}),[]);
});

test('retry copies only the original bound sales command and preserves logical id',()=>{
  const bot={id:'b',chatTurn:{requestId:'same-request',message:'Search selected sources',searchSources:['web','linkedin'],sender:'mailbox',draftId:'reviewed-version',status:'failed',answer:'internal',deliveryKey:'transport-only'}};
  const expected={id:bot.id,requestId:'same-request',message:bot.chatTurn.message,searchSources:bot.chatTurn.searchSources,sender:'mailbox',draftId:'reviewed-version'};
  assert.deepEqual(retryTurnPayload(bot),expected);
  assert.deepEqual(retryTurnPayload({...bot,chatTurn:{...bot.chatTurn,status:'unconfirmed'}}),expected);
  assert.equal(retryTurnPayload({...bot,chatTurn:{...bot.chatTurn,status:'confirmed'}}),null);
  assert.equal(retryTurnPayload({id:'other'}),null);
});

test('budget detection uses provider failure fields without returning the team or its spending',()=>{
  assert.equal(isModelBudgetFailure({info:{message:'AI Gateway team budget exceeded for internal-team-id at $500'}}),true);
  assert.equal(isModelBudgetFailure({message:'HTTP 403: session expired'}),false);
  assert.equal(isModelBudgetFailure({code:'model_budget'}),true);
  assert(!budgetMessage.includes('$')&&!budgetMessage.includes('internal-team-id'));
});

test('mobile first turn reconciles the brief, optimistic row and saved reply by request ID',()=>{
  const first={message:'Find buyers at Barbour footwear',requestId:'request-001',status:'unconfirmed'};
  const rows=conversationRows([],first,first);
  assert.equal(rows.length,1);assert.equal(rows[0].content,first.message);
  const previous={...rows[0],id:'previous',requestId:'request-000'};
  const repeat=conversationRows([previous],first,first);
  assert.deepEqual(repeat.map(m=>m.requestId),['request-000','request-001']);
  const legacy={id:'old',role:'user',content:first.message};
  assert.deepEqual(conversationRows([legacy],first,null),[legacy]);
  const confirmed={...first,status:'confirmed',answer:'Which market should I cover?'};
  const result=conversationRows(rows,confirmed,first);
  assert.deepEqual(result.map(m=>m.content),[first.message,confirmed.answer]);
  assert.deepEqual(conversationRows(result,confirmed,null),result);
});

test('saved failures have one current status while previous failed turns remain in history',()=>{
  const turn={requestId:'request-002',message:'Find buyers',status:'failed',reason:'model_budget'};
  const saved=view({messages:[
    {id:'a0',role:'assistant',content:'Older failure',eveNoAction:'previous'},
    {id:'u1',role:'user',content:turn.message,requestId:turn.requestId,eveNoAction:turn.requestId},
    {id:'a1',role:'assistant',content:budgetMessage,eveNoAction:turn.requestId}
  ]}).messages;
  assert.deepEqual(conversationRows(saved,turn,null).map(m=>m.content),['Older failure',turn.message]);
  const transport={error:'The live connection was interrupted.'};
  const budget=chatStatus(turn,{snapshot:transport});
  assert.equal(budget.retry,true);assert.match(budget.text,/budget/);assert.doesNotMatch(budget.text,/connection/);
  const unconfirmed=chatStatus({...turn,status:'unconfirmed',reason:null},{snapshot:transport});
  assert.equal(unconfirmed.label,'Awaiting confirmation');assert.equal(unconfirmed.retry,true);
  assert.equal(chatStatus(turn,{retrying:true,snapshot:transport}).retry,undefined);
  assert.equal(chatStatus({...turn,status:'confirmed'},{snapshot:transport}),null);
});
