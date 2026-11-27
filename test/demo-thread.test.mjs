import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleMessage} from '../app/preview/sample.mjs';

test('sample conversations research and draft for the selected agent and deduplicate submitted messages',()=>{
  const bots=['one','two'].map(id=>({id,name:id,brief:id+' buyers'}));
  const sampleLeads=bots.map(({id})=>({id:'person-'+id,botId:id,company:'Example '+id,person:'Buyer '+id,role:'Buyer',linkedin:'Draft '+id}));
  const original={bots,leads:[],messages:[],events:[],sampleLead:sampleLeads[0],sampleLeads};
  const at='2026-11-27T15:00:00Z';
  const search={id:'two',requestId:'test-search',message:'Run sample research'};
  const result=sampleMessage(original,search,at);
  assert.deepEqual(result.leads.map(lead=>lead.botId),['two']);
  assert.equal(result.bots[1].lastRun.sampleSteps.length,3);
  assert.ok(result.messages.every(message=>message.botId==='two'));
  assert.equal(sampleMessage(result,search,at).messages.length,result.messages.length);
  const drafted=sampleMessage(result,{id:'two',requestId:'test-draft',message:'Draft an introduction for Buyer two'},at);
  assert.equal(drafted.messages.at(-1).details.linkedin,'Draft two');
  assert.equal(drafted.leads[0].reviewDrafts[0].linkedin,'Draft two');
  const newThread=sampleMessage(drafted,{message:'Find footwear buyers in Scotland',requestId:'new'},at);
  assert.equal(newThread.bots.length,3);
  assert.equal(newThread.bots.at(-1).brief,'Find footwear buyers in Scotland');
  assert.equal(newThread.agentId,'demo-new');assert.equal(newThread.leads.length,1);
});

test('new sample threads wait for explicit source and never simulate a signed-in computer',()=>{
  const sampleLead={id:'fixture',botId:'one',company:'Fixture Co',person:'Fixture Buyer',role:'Buyer',linkedin:'Draft'};
  const initial={bots:[{id:'one',name:'Footwear',searchSource:'web'}],leads:[],messages:[],events:[],sampleLead};
  const at='2026-11-27T15:35:00Z';
  let workspace=sampleMessage(initial,{message:'Find buyers at Barbour',requestId:'a'},at);
  assert.equal(workspace.messages.at(-1).details.type,'sourceChoice');
  assert.equal(workspace.leads.length,0);
  const id=workspace.agentId;
  workspace=sampleMessage(workspace,{id,message:'Search LinkedIn.',searchSource:'linkedin',requestId:'b'},at);
  assert.equal(workspace.messages.at(-1).details.type,'browserConnection');
  assert.equal(workspace.leads.length,0);
  workspace=sampleMessage(workspace,{id,message:'Search the public web.',searchSource:'web',requestId:'c'},at);
  assert.equal(workspace.bots.find(agent=>agent.id===id).searchSource,'web');
  assert.equal(workspace.leads.length,1);
});
