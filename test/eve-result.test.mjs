import assert from 'node:assert/strict';
import test from 'node:test';
import {budgetMessage,isModelBudgetFailure,retryTurnPayload,visibleEveTools} from '../app/eve-result.mjs';

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
