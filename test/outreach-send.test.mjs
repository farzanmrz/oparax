import assert from 'node:assert/strict';
import test from 'node:test';
import {sendOutreach} from '../lib/outreach-send.mjs';
import {initialDraftVersion} from '../lib/draft-version.mjs';
function fixture(){
  const person={id:'lead-1',botId:'bot-1',person:'Ava Test',role:'Buyer',company:'Test Co',source:'https://example.com/team',companyVerification:{name:'Test Co',source:'https://example.com/team',evidence:'Ava is a buyer at Test Co'},linkedinUrl:'https://www.linkedin.com/in/example-buyer',linkedinEvidence:'Buyer at Test Co',email:'ava@example.com',status:'queued',subject:'Samples',body:'Would you review the samples?',linkedin:'Would you review the samples?',linkedinState:'draft',
    reviewDrafts:[{id:'draft-1',botId:'bot-1',subject:'Samples for fall',body:'Can I send two samples?',linkedin:'Can I send two samples?',recipientEmail:'ava@example.com'}]};
  const data={bots:[{id:'bot-1',cap:3},{id:'bot-2',cap:3}],leads:[person],messages:[],events:[],suppressed:[],mailbox:{id:'sender-1',email:'operator@example.org',address:'Business address'}};
  const deliveries=[];
  const deps={workspaceId:()=>'owner-1',leaveToken:()=>'synthetic',read:async()=>({data:structuredClone(data)}),edit:async f=>f(data),smtp:async(m,x)=>{deliveries.push(x);return {providerId:'accepted-1'}}};
  const input={agentId:'bot-1',channel:'email',prospectId:person.id,draftId:'draft-1',requestId:'send-20261127'};
  return {data,person,deps,deliveries,input};
}
test('a specific approved draft is sent only once across concurrent requests and later retries',async()=>{
  const {input,data,deliveries,deps}=fixture();
  const results=await Promise.all([sendOutreach(input,deps),sendOutreach({...input,requestId:'send-new-button'},deps)]);
  const again=await sendOutreach(input,deps);
  assert.equal(again.status,'sent');assert.ok(results.some(r=>r.status==='sent'));
  assert.equal(deliveries.length,1);assert.equal(deliveries[0].to,'ava@example.com');
  assert.match(deliveries[0].text,/Can I send two samples/);assert.match(deliveries[0].text,/Unsubscribe:/);
  assert.equal(data.bots[0].used,1);assert.equal(data.leads[0].status,'complete');
  assert.equal(data.messages[0].details.providerId,'accepted-1');
});
test('cross-bot, stale, opted-out and unconnected sends stop before reaching a provider',async()=>{
  const x=fixture();await assert.rejects(sendOutreach({...x.input,agentId:'bot-2'},x.deps),/Select a verified/);
  const initial=await initialDraftVersion(x.person,'email');x.person.body='Changed text';
  await assert.rejects(sendOutreach({...x.input,draftId:initial},x.deps),/draft has changed/);
  x.data.suppressed.push(x.person.email);await assert.rejects(sendOutreach(x.input,x.deps),/stopped/);
  x.data.suppressed=[];x.data.mailbox=null;await assert.rejects(sendOutreach(x.input,x.deps),/mailbox/);
  assert.equal(x.deliveries.length,0);
});
test('ambiguous provider outcome is held for review and never retried automatically',async()=>{
  const x=fixture();let calls=0;x.deps.smtp=async()=>{calls++;throw Error('connection lost');};
  assert.equal((await sendOutreach(x.input,x.deps)).status,'needs_review');
  assert.equal((await sendOutreach({...x.input,requestId:'send-again-123'},x.deps)).status,'needs_review');
  assert.equal(calls,1);
});
test('bot inbox gets its own sender and an accepted provider id',async()=>{
  const x=fixture();x.data.agentMailKey='synthetic';x.data.bots[0].inbox={id:'inbox-1',email:'bot@example.org'};
  x.deps.agentmail=async(d,id,m)=>{assert.equal(id,'inbox-1');assert.equal(m.from,'bot@example.org');return {providerId:'provider-2'}};
  assert.equal((await sendOutreach(x.input,x.deps)).provider,'agentmail');assert.equal(x.deliveries.length,0);
});
test('direct message must use authorized delivery and a provider acceptance receipt',async()=>{
  const x=fixture();const input={...x.input,channel:'linkedin'};
  x.deps.linkedin={prepareLinkedInDM:()=>{throw Error('LinkedIn messaging is not connected')}};
  await assert.rejects(sendOutreach(input,x.deps),/not connected/);
  assert.equal(x.person.outreachReceipts.length,0);
  x.deps.linkedin={prepareLinkedInDM:()=>({from:'Example sender',senderId:'sender-2'}),deliverLinkedInDM:async(a,body)=>{assert.equal(body,'Can I send two samples?');return {providerId:'official-message-id'}}};
  assert.equal((await sendOutreach(input,x.deps)).status,'sent');assert.equal(x.person.linkedinState,'sent');
});
test('a confirmed provider rejection can be retried by a fresh owner action after correction',async()=>{
 const x=fixture();let attempts=0;
 x.deps.smtp=async()=>{if(++attempts===1)throw Object.assign(Error('Rejected'),{definite:true});return {providerId:'accepted-2'}};
 assert.equal((await sendOutreach(x.input,x.deps)).status,'rejected');
 assert.equal((await sendOutreach(x.input,x.deps)).status,'rejected');assert.equal(attempts,1);
 assert.equal((await sendOutreach({...x.input,requestId:'try-after-reconnect'},x.deps)).status,'sent');
 assert.equal((await sendOutreach({...x.input,requestId:'another-click'},x.deps)).status,'sent');assert.equal(attempts,2);
});
test('owner edits create an immutable draft that is the exact version dispatched',async()=>{
 const {reviseDraft}=await import('../lib/edit-draft.mjs');
 const x=fixture();
 const input={agentId:'bot-1',prospectId:'lead-1',channel:'email',baseId:await initialDraftVersion(x.person,'email'),requestId:'operator-edit-1',subject:'This season',body:'Here is my revised message.'};
 const draft=await reviseDraft(input,x.deps);
 assert.equal((await reviseDraft(input,x.deps)).id,draft.id);
 await assert.rejects(reviseDraft({...input,body:'Different content'},x.deps),/already used/);
 await sendOutreach({...x.input,draftId:draft.id},x.deps);
 assert.equal(x.deliveries[0].subject,input.subject);
 assert.ok(x.deliveries[0].text.startsWith(input.body));
 assert.notEqual(x.person.body,input.body);
});

test('disabled delivery capability blocks the transport and preserves the unsent draft',async()=>{
 const x=fixture();x.data.bots[0].skillSettings={email_delivery:false};
 await assert.rejects(sendOutreach(x.input,x.deps),/disabled/);
 assert.equal(x.deliveries.length,0);assert.equal(x.person.reviewDrafts.length,1);
 assert.equal((x.person.outreachReceipts||[]).length,0);
});
