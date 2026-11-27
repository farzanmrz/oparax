import test from 'node:test';
import assert from 'node:assert/strict';
import {salesContext,sellerVersion} from '../lib/sales-context.mjs';
import {resolveAgentModel,modelUsage,setModelPreference} from '../lib/agent-models.mjs';
import {planCommand,writeDraft} from '../lib/conversation-model.mjs';
import {prepareCampaignDrafts,composeFollowUp} from '../lib/campaign-drafts.mjs';
import {outreachDraft} from '../lib/research.mjs';
import {addLead} from '../lib/domain.mjs';

const person={person:'Jane Cole',role:'Buyer',company:'Sample Brand',source:'https://sample.example/team',evidence:'Public page lists Jane as a buyer.'};
const bot={id:'b',name:'Scout',brief:'Find footwear buyers.',modelPreference:'grok',customSkillIds:['playbook-a']};
const workspace={businessMemory:{company:'Bridge Works',productsServices:'Custom leather insoles',salesProposition:'Small batch manufacturing',voice:'Plain and concise',proof:'Pilot sizes begin at 100 units.',mailPassword:'credentials must never leak'},
  customSkills:[{id:'playbook-a',name:'First touch',instructions:'Use one short question.'},{id:'unused',name:'Unused',instructions:'UNASSIGNED_CONTENT'}],mailbox:{secret:'WORKSPACE_SECRET'}};
const generated={subject:'Custom insoles',body:'Hi Jane, we manufacture custom leather insoles. Would samples be useful?',linkedin:'Hi Jane, do you buy leather insoles?',followUp:'Hi Jane, would a small pilot make sense for your team?'};
test('each chat and draft includes the workspace business profile, only the assigned skills and separate public recipient evidence',async()=>{
  const s=salesContext(workspace,bot),scope={...s,agent:bot,prospects:[{...person,id:'jane'}],message:'How should we approach our usual buyers?'};
  const observed=[];
  const gateway=async(messages,opts)=>{const parsed=JSON.parse(messages[1].content);observed.push({parsed,opts,prompt:messages[0].content});return JSON.stringify(parsed.recipient?generated:{action:'answer',answer:'Ask the buyer which insole specifications they need.'});};
  await planCommand(scope,gateway);await writeDraft({...scope,prospect:person},gateway);
  for(const call of observed){
    assert.equal(call.opts.modelId,'spacexai/grok-4.3');assert.equal(call.parsed.seller.businessProfile.productsServices,'Custom leather insoles');
    assert.deepEqual(call.parsed.seller.customSkills,[{name:'First touch',instructions:'Use one short question.'}]);
    assert.doesNotMatch(JSON.stringify(call.parsed),/credentials must never leak|UNASSIGNED_CONTENT|WORKSPACE_SECRET/);
    assert.match(call.prompt,/never evidence/);
  }
  assert.equal(observed[1].parsed.recipient.evidence,person.evidence);
  assert.deepEqual(salesContext(workspace,null).customSkills,[]);
  assert.equal(sellerVersion(salesContext({},bot)),'');
});
test('missing figures trigger owner clarification even if model proposes an ungrounded discount',async()=>{
  const args={agent:bot,...salesContext(workspace,bot),message:'Offer our approved discount',prospect:person,channel:'email'};
  const bad=await writeDraft(args,async()=>JSON.stringify({...generated,body:'We offer 40% off.'}));
  assert.ok(bad.question);assert.equal(bad.body,undefined);
  const good=await writeDraft({...args,message:'Offer 40% off for this order'},async()=>JSON.stringify({...generated,body:'We offer 40% off.'}));
  assert.equal(good.body,'We offer 40% off.');
});
test('first outreach, LinkedIn and follow-up use profile and playbook. Editing memory preserves saved copies',async()=>{
  const d={...structuredClone(workspace),bots:[bot],leads:[],messages:[],events:[],suppressed:[]};
  const before=salesContext(d,bot),oldRow={...person};
  let calls=0;
  const gateway=async(messages,opts)=>{calls++;assert.equal(opts.modelId,'spacexai/grok-4.3');const input=JSON.parse(messages[1].content);
    assert.equal(input.seller.businessProfile.productsServices,'Custom leather insoles');assert.equal(input.recipients[0].company,person.company);
    return JSON.stringify({drafts:[{ref:'0',...generated}]});};
  await prepareCampaignDrafts([oldRow],before,{brief:bot.brief,gateway});assert.equal(calls,1);
  addLead(d,bot,outreachDraft(oldRow));const snapshot=structuredClone(d.leads[0]);
  d.businessMemory.productsServices='Recycled footbeds';
  assert.notEqual(sellerVersion(before),sellerVersion(salesContext(d,bot)));
  assert.deepEqual(await composeFollowUp(d.leads[0],salesContext(d,bot),bot.brief,()=>{throw Error('Unexpected model call');}),{body:generated.followUp});
  assert.deepEqual(d.leads[0],snapshot);
  const next={...person};await prepareCampaignDrafts([next],salesContext(d,bot),{gateway:async messages=>{
    assert.equal(JSON.parse(messages[1].content).seller.businessProfile.productsServices,'Recycled footbeds');
    return JSON.stringify({drafts:[{ref:'0',question:'Which pilot price should I mention?'}]});
  }});
  assert.match(next.draftQuestion,/pilot price/);
  const held={...next,person:'A Different Buyer',email:'a@example.test'};
  addLead(d,bot,outreachDraft(held));assert.equal(d.leads[0].body,'');assert.equal(d.leads[0].status,'research');
  const disabledBot={...bot,skillSettings:{draft_outreach:false}};
  await prepareCampaignDrafts([{...person}],salesContext(d,disabledBot),{gateway:()=>{throw Error('Unexpected call');}});
  assert.equal(calls,1);
});
test('model choices are per agent, auto is cheap on routine and hard-ranked planning is bounded to that call',()=>{
  assert.equal(resolveAgentModel({}).modelId,'openai/gpt-6.2-sol');
  const difficult='Reconcile conflicting evidence from the two named employers';
  assert.equal(resolveAgentModel({}, {task:'planning',message:difficult}).modelId,'openai/gpt-6.2-astra');
  assert.equal(resolveAgentModel({}, {task:'research',message:difficult}).modelId,'openai/gpt-6.2-sol');
  const bots=[{},{}];setModelPreference({},bots[0],'grok');
  for(const task of ['research','planning','draft','conversation'])assert.equal(resolveAgentModel(bots[0],{task,complex:true}).modelId,'spacexai/grok-4.3');
  assert.equal(resolveAgentModel(bots[1]).modelId,'openai/gpt-6.2-sol');assert.throws(()=>setModelPreference({},bots[0],'made-up'));
});
test('model usage records Gateway costs when available and labels text-price estimates otherwise',()=>{
  const r=resolveAgentModel({modelPreference:'efficient'},{task:'draft'});
  const basis=modelUsage({model:r.modelId,usage:{prompt_tokens:1000,completion_tokens:200}},r);
  assert.equal(basis.costUsd,0.004);assert.equal(basis.costBasis,'estimated_standard_text');
  assert.equal(basis.inputTokens,1000);assert.equal(basis.outputTokens,200);assert.equal(basis.requestedModel,r.modelId);
  const actual=modelUsage({model:r.modelId,usage:{prompt_tokens:1000,completion_tokens:200,cost:'0.0027'}},r);
  assert.equal(actual.costUsd,0.0027);assert.equal(actual.costBasis,'gateway');assert.equal(modelUsage({},r).costUsd,undefined);
});

test('the public research planning entry point uses current seller context and the bot pin before any public query',async()=>{
  const {research}=await import('../lib/agent.mjs');
  const d={...structuredClone(workspace),bots:[{...bot,searchSources:['web'],researchRequestedAt:'run',cadence:24}],leads:[],messages:[],events:[],suppressed:[]};
  let called=0;
  await research('b',{requestedAt:'run',page:0},{
    edit:async fn=>fn(d),
    model:async(messages,opts)=>{
      called++;const input=JSON.parse(messages[1].content);assert.equal(opts.modelId,'spacexai/grok-4.3');
      assert.equal(input.seller.businessProfile.company,'Bridge Works');assert.deepEqual(input.seller.customSkills,[{name:'First touch',instructions:'Use one short question.'}]);
      assert.doesNotMatch(JSON.stringify(input),/UNASSIGNED_CONTENT|WORKSPACE_SECRET|credentials must never leak/);
      return JSON.stringify({mode:'people',question:'Which region should the buyer list cover?',target:'Footwear buyers',roles:['buyers']});
    },
    profilePage:()=>{throw Error('A question cannot start a public query');}
  });
  assert.equal(called,1);assert.equal(d.bots[0].lastRun.status,'needs_input');
});

test('a reported cost from the chat gateway is emitted exactly once by the actual model adapter',async()=>{
  const {model}=await import('../lib/agent.mjs');const saved=globalThis.fetch,env=process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY='local-test';
  const records=[];let actual;
  globalThis.fetch=async(url,opts)=>{actual=JSON.parse(opts.body);return Response.json({model:'spacexai/grok-4.3',usage:{prompt_tokens:200,completion_tokens:50,cost:'0.00037'},choices:[{message:{content:'{"ok":true}'}}]});};
  try{
    await model([{role:'user',content:'Return a test object.'}],{...resolveAgentModel(bot,{task:'draft'}),effort:'low',onUsage:r=>records.push(r)});
    assert.equal(actual.model,'spacexai/grok-4.3');assert.equal(actual.reasoning,undefined);
    assert.equal(records.length,1);assert.equal(records[0].costUsd,0.00037);assert.equal(records[0].costBasis,'gateway');
  }finally{
    globalThis.fetch=saved;
    if(env===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=env;
  }
});
