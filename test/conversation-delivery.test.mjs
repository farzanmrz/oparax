import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareDelivery,commitDelivery} from '../lib/conversation-delivery.mjs';

const company='Example Shoes';
const agent={id:'agent-17'};
const sample={id:'prospect-15',botId:agent.id,person:'Jane Test',company,role:'Buying Director',email:'jane@example.com',
  linkedinUrl:'https://www.linkedin.com/in/jane-test',
  linkedinEvidence:'Jane Test — Buying Director, Example Shoes',
  companyVerification:{name:company,source:'https://example.com/team',evidence:'Jane Test — Buying Director'}};
const fixture=()=>({mailbox:{id:'sender',email:'me@example.org'},messages:[],leads:[structuredClone(sample)]});
const decision={action:'send',prospectId:sample.id,channel:'email',existingDraft:false,concrete:true,purpose:'offer footwear samples'};
const input=(d,props={})=>({decision,message:'Please write and email Jane to offer footwear samples.',agent,history:d.messages,prospect:d.leads[0],requestId:'request-001',...props});
const write=async({channel})=>channel==='email'?{subject:'Footwear samples',body:'Jane, would you like to try the samples?'}:{linkedin:'Jane, would you like to see our samples?'};
const forbidden=()=>{throw Error('Should never draft for this request.');};

test('write-and-send email persists the exact version, sender and recipient in the same transaction',async()=>{
  const d=fixture(),plan=await prepareDelivery(input(d),write);
  const expected={agentId:agent.id,prospectId:sample.id,channel:'email',requestId:'request-001',draftId:'request-001',sender:'mailbox'};
  assert.deepEqual(commitDelivery(d,agent,d.leads[0],plan,'request-001'),{send:expected});
  assert.deepEqual(commitDelivery(d,agent,d.leads[0],plan,'request-001'),{send:expected});
  assert.equal(d.leads[0].reviewDrafts.length,1);assert.equal(d.messages.length,1);
  const saved=d.leads[0].reviewDrafts[0];assert.equal(saved.recipientEmail,sample.email);
  assert.equal(saved.recipientProfile,sample.linkedinUrl);assert.equal(saved.senderEmail,d.mailbox.email);
  assert.equal(d.messages[0].details.body,saved.body);
});
test('new LinkedIn text is reviewed before explicit subsequent delivery; no send on first turn',async()=>{
  const d=fixture(),args=input(d,{decision:{...decision,channel:'linkedin'},message:'DM Jane about footwear samples.'});
  const first=await prepareDelivery(args,write);
  assert.equal(commitDelivery(d,agent,d.leads[0],first,'request-001').send,null);
  assert.equal(d.messages[0].details.requiresConfirmation,true);
  const second=await prepareDelivery(input(d,{decision:{...decision,channel:'linkedin',existingDraft:true},message:'Yes, send this draft.',requestId:'request-002'}),forbidden);
  const {send}=commitDelivery(d,agent,d.leads[0],second,'request-002');
  assert.equal(send.draftId,first.draftId);assert.equal(send.channel,'linkedin');assert.equal(d.messages.length,1);
});
test('unseen, other-agent, stale or edited versions cannot be dispatched',async()=>{
  const d=fixture(),args=input(d,{decision:{...decision,channel:'linkedin'},message:'DM Jane about footwear samples.'});
  commitDelivery(d,agent,d.leads[0],await prepareDelivery(args,write),'request-001');
  const opts={decision:{...decision,channel:'linkedin',existingDraft:true},message:'Send this draft.',requestId:'request-002'};
  assert.ok((await prepareDelivery(input(d,{...opts,history:[]}),forbidden)).question);
  assert.ok((await prepareDelivery(input(d,{...opts,agent:{id:'other'}}),forbidden)).question);
  assert.ok((await prepareDelivery(input(d,{...opts,message:'Send this draft but change the price to $10.'}),forbidden)).question);
  d.leads[0].reviewDrafts[0].linkedin='Tampered';
  assert.ok((await prepareDelivery(input(d,opts),forbidden)).question);
});
test('draft requests, capabilities, conditions, negation and unspecified purpose cannot authorize delivery',async()=>{
  const d=fixture();
  for(const message of ['Draft an email to Jane about samples.','Could the bot email Jane about samples?','If she agrees, email Jane about samples.','Email Jane about samples but do not send it.','Email Jane about samples tomorrow.']){
    assert.equal((await prepareDelivery(input(d,{message}),forbidden)).dispatch,false);
  }
  assert.ok((await prepareDelivery(input(d,{message:'Please email Jane.',decision:{...decision,concrete:false}}),forbidden)).question);
});
test('literal email body and subject survive unchanged, unavailable sender leaves reviewable copy',async()=>{
  const d=fixture();d.mailbox=null;
  const args=input(d,{message:'Email Jane the following message.\nSubject: New trial\nBody: Hi Jane,\nMay I send samples?'});
  const plan=await prepareDelivery(args,write);
  assert.equal(commitDelivery(d,agent,d.leads[0],plan,'request-001').send,null);
  assert.equal(d.leads[0].reviewDrafts[0].subject,'New trial');assert.equal(d.leads[0].reviewDrafts[0].body,'Hi Jane,\nMay I send samples?');
  assert.match(d.messages[0].content,/Connect an outbound mailbox/);
});
test('recipient change after preparation stops commit',async()=>{
  const d=fixture(),p=await prepareDelivery(input(d),write);d.leads[0].email='different@example.com';
  assert.throws(()=>commitDelivery(d,agent,d.leads[0],p,'request-001'),/recipient changed/);assert.equal(d.messages.length,0);
});
test('an ID alone does not resolve an unnamed or ambiguous person or choose the wrong channel',async()=>{
  const d=fixture(),peers=[d.leads[0],{...sample,id:'second',person:'Jane Another',company:'Other Co'}];
  for(const message of ['Email them about footwear samples.','Email Jane about footwear samples.','Email Jane Test and Jane Another about footwear samples.','DM Jane Test about footwear samples.','Email them about Jane Test and footwear samples.']){
    assert.ok((await prepareDelivery(input(d,{prospects:peers,message}),forbidden)).question,message);
  }
  const result={role:'assistant',botId:agent.id,details:{type:'prospects',prospectIds:[sample.id]}};
  let context=input(d,{prospects:peers,history:[result],message:'Please email them about footwear samples.'});
  assert.equal((await prepareDelivery(context,write)).dispatch,true);
  context={...context,history:[result,{...result,details:{...result.details,prospectIds:peers.map(x=>x.id)}}]};
  assert.ok((await prepareDelivery(context,forbidden)).question);
});
test('explicit sender by connected account name or address is respected and never silently substituted',async()=>{
  const d=fixture(),bot={...agent,inbox:{id:'agentmail-id',email:'agent@example.org'}};
  d.agentMailKey='simulated';d.bots=[bot];
  for(const [i,suffix] of ['from my connected mailbox','from agent@example.org','from unknown@example.org'].entries()){
    const args=input(d,{agent:bot,message:'Email Jane '+suffix+' to offer footwear samples.',requestId:'sender-request-'+i});
    const plan=await prepareDelivery(args,write);
    const {send}=commitDelivery(d,bot,d.leads[0],plan,args.requestId);
    if(i===2)assert.equal(send,null);else assert.equal(send.sender,i===0?'mailbox':'agentmail');
  }
});
