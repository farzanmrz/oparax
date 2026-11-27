import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mailboxBriefSignature,mailboxScopeSuggestion,workDomain} from '../lib/mailbox-scope.mjs';
import {readAgentMailCorrespondents,readImapCorrespondents,runMailboxResearch,runConsentedMailboxResearch} from '../lib/mailbox-research.mjs';
const day=86400000;
const scope={company:'Northwind',domain:'northwind.example',days:7,mailboxKind:'connected'};
const id='356ee15f-75af-4946-b132-1bb2f1355e2b';
test('scope prefill uses one established employer and domain; consumer/pattern domains cannot be approved',()=>{
  const agent={brief:'Find purchasing staff at Northwind',researchJob:{plan:{employers:['Northwind'],companyContexts:[{company:'Northwind'}]},companyProofs:{x:{name:'Northwind',domain:'northwind.example',source:'https://northwind.example/about'}}}};
  assert.deepEqual(mailboxScopeSuggestion(agent),scope);
  delete agent.researchJob.companyProofs.x.domain;assert.equal(mailboxScopeSuggestion(agent).domain,'northwind.example');
  agent.researchJob.companyProofs.x.source='https://industry-press.example/northwind';assert.equal(mailboxScopeSuggestion(agent).domain,'');
  assert.equal(mailboxScopeSuggestion({brief:'Find buyers at Northwind (northwind.example)'}).domain,scope.domain);
  assert.equal(mailboxScopeSuggestion({brief:'Find buyers at Northwind'}).domain,'');
  for(const x of ['gmail.com','yahoo.co.uk','*@example.com','example.com?q=x','https://a.example:80'])assert.equal(workDomain(x),'');
});
test('IMAP opens a read-only INBOX, bounds matching UIDs, asks only for routing headers, never reads content or changes flags',async()=>{
  const now=Date.now(),trail=[];
  const fake={mailbox:{uidValidity:55},connect:async()=>{},logout:async()=>trail.push('logout'),getMailboxLock:async(...args)=>{trail.push(args);return {release:()=>trail.push('release')}},
    search:async(...args)=>{trail.push(args);return Array.from({length:43},(_,i)=>i+1)},
    async *fetch(ids,fields,opts){
      trail.push([ids,fields,opts]);
      const samples=[
        'From: Ada Stone <ada@northwind.example>', 'From: Ada Stone <ada@northwind.example.evil>',
        'From: An Owner <noreply@northwind.example>','From: Ada Stone <ada@northwind.example>\r\nList-Id: Company mailing list',
        'From: =?UTF-8?Q?Mar=C3=ADa_Garc=C3=ADa?= <maria@northwind.example>'
      ];
      for(let i=0;i<samples.length;i++)yield {uid:ids[i],internalDate:new Date(now-i*10),headers:Buffer.from(samples[i]+'\r\n\r\n')};
    }};
  const result=await readImapCorrespondents({email:'owner@test.example'},scope,{since:now-7*day,until:now},()=>fake);
  assert.deepEqual(trail[0],['INBOX',{readOnly:true}]);assert.equal(trail[1][0].from,'@northwind.example');assert.equal(trail[1][0].to,'owner@test.example');
  assert.deepEqual(trail[2][1],{uid:true,internalDate:true,headers:['From','Auto-Submitted','List-Id','Precedence']});assert.equal(trail[2][0].length,30);
  assert.deepEqual(result.rows.map(r=>r.person),['Ada Stone','María García']);assert.equal(result.examined,30);
  assert.ok(!JSON.stringify(result).includes('ada@'));assert.deepEqual(trail.slice(-2),['release','logout']);
});
test('AgentMail uses only this agent inbox and provider-side domain, recipient and date filters; ignores message text and quarantined senders',async()=>{
  const at=Date.now(),item={inbox_id:'inbox-1',from:'Ada Stone <ada@northwind.example>',labels:['received'],timestamp:new Date(at).toISOString(),message_id:'private-msg-1',preview:'secret body',subject:'secret subject',bcc:['thirdparty@example.test']};
  let url;
  const out=await readAgentMailCorrespondents({agentMailKey:'sealed'},{inbox:{id:'inbox-1',email:'agent@own.example'}},scope,{since:at-day,until:at},{unsealKey:()=>'dummy',
    fetcher:async u=>{url=u;return Response.json({messages:[item,{...item,labels:['received','spam']},{...item,inbox_id:'another'},{...item,headers:{'List-Id':'provider mailing list'}},{...item,authentication_results:{dmarc:'fail'}}]});}});
  assert.equal(url.pathname,'/v0/inboxes/inbox-1/messages');assert.equal(url.searchParams.get('from'),'@northwind.example');
  assert.equal(url.searchParams.get('to'),'agent@own.example');assert.equal(url.searchParams.get('labels'),'received');assert.equal(url.searchParams.get('limit'),'30');
  assert.deepEqual(out.rows.map(x=>x.person),['Ada Stone']);
  assert.ok(!/secret|thirdparty|ada@/.test(JSON.stringify(out)));
});
function setup(){
  const b={id,brief:'Find designers at Northwind',searchSources:['email'],name:'Single sales agent'};
  b.researchJob={planSignature:mailboxBriefSignature(b),plan:{target:b.brief,employers:['Northwind'],companyContexts:[{company:'Northwind',industry:'footwear'}],roles:['designer'],roleTerms:[]}};
  const data={bots:[b],leads:[],messages:[],events:[],mailbox:{id:'owner-mailbox'},suppressed:[]};
  const reads=[],lookups=[];
  const deps={read:async()=>({data}),edit:async fn=>fn(data),readSenders:async s=>{reads.push(s);return {examined:2,rows:['Ada Stone','Jane Moon'].map((person,i)=>({person,at:new Date().toISOString(),reference:'PRIVATE-MESSAGE-'+i,senderKey:person}))}},
    findProfiles:async rows=>{lookups.push(rows);return {results:[{title:'Ada Stone - Design Manager at Northwind | LinkedIn',url:'https://www.linkedin.com/in/ada-stone-123',snippet:'Design Manager at Northwind'}]};},
    verifyCandidates:async(_,people)=>({verified:people.map(p=>({...p,record:{...p,source:'https://northwind.example/team',linkedinEvidence:'Ada Stone, Design Manager at Northwind',companyVerification:{name:'Northwind',source:'https://northwind.example/about',domain:'northwind.example',evidence:'Northwind makes footwear.'},fit:'Design Manager at Northwind',email:'private@neverpublish.example'}}))})};
  return {b,data,reads,lookups,deps};
}
const request=()=>({...scope,source:'email',consent:true,requestId:randomUUID()});
test('one explicit scope publishes independently checked records only, stores private trace, leaves sending off, and replays idempotently',async()=>{
  const {b,data,deps,lookups,reads}=setup(),p=request();
  await assert.rejects(runMailboxResearch(id,{...p,consent:false},deps),/Confirm/);
  await assert.rejects(runConsentedMailboxResearch(id,randomUUID(),deps),/Confirm/);
  await assert.rejects(runMailboxResearch(id,{...p,company:'Wrong employer'},deps),/employer in this campaign/);
  assert.equal(reads.length,0);
  const receipt=await runMailboxResearch(id,p,deps);
  assert.equal(receipt.saved,1);assert.equal(receipt.held,1);assert.equal(b.mailboxPending[0].person,'Jane Moon');
  const lead=data.leads[0];assert.equal(lead.email,'');assert.equal(lead.status,'research');assert.equal(lead.discoverySources[0].source,'email');
  assert.ok(b.mailboxEvidence[0].reference.startsWith('PRIVATE-'));assert.ok(!JSON.stringify(lookups).includes('PRIVATE-'));assert.ok(!JSON.stringify(lead).includes('PRIVATE-'));assert.ok(!JSON.stringify(receipt).includes('Ada'));
  assert.deepEqual(await runMailboxResearch(id,p,deps),receipt);assert.equal(reads.length,1);
  await assert.rejects(runMailboxResearch(id,{...p,domain:'other.example'},deps),/different mailbox scope/);
});
test('remembered scope is private to this mailbox, campaign, brief and provider; revocation blocks later reads',async()=>{
  const {b,data,deps,reads}=setup();
  await runMailboxResearch(id,{...request(),remember:true},deps);
  const again=await runConsentedMailboxResearch(id,randomUUID(),deps);
  assert.equal(again.existing,1);assert.equal(data.leads.length,1);
  b.brief+=' in Brazil';await assert.rejects(runConsentedMailboxResearch(id,randomUUID(),deps),/Confirm/);b.brief='Find designers at Northwind';
  data.mailbox.id='new';await assert.rejects(runConsentedMailboxResearch(id,randomUUID(),deps),/Confirm/);data.mailbox.id='owner-mailbox';
  await runMailboxResearch(id,{...request(),revoke:true},deps);await assert.rejects(runConsentedMailboxResearch(id,randomUUID(),deps),/Confirm/);
  b.searchSources=['web'];await assert.rejects(runMailboxResearch(id,request(),deps),/Choose Email/);assert.equal(reads.length,2);
});
test('a different verified organization domain, and two e-mail identities sharing the same name, are held',async()=>{
  const {b,data,deps}=setup(),original=deps.verifyCandidates;
  deps.verifyCandidates=async(...args)=>{const r=await original(...args);for(const x of r.verified)x.record.companyVerification={name:'Northwind',domain:'unrelated.example',source:'https://unrelated.example',evidence:'A different firm'};return r;};
  assert.equal((await runMailboxResearch(id,request(),deps)).saved,0);
  const previous=deps.readSenders;deps.readSenders=async(...args)=>{const x=await previous(...args);return {...x,rows:[...x.rows,{...x.rows[0],senderKey:'distinct',reference:'new-private'}]};};
  deps.verifyCandidates=original;assert.equal((await runMailboxResearch(id,request(),deps)).saved,0);
  assert.equal(data.leads.length,0);assert.ok(b.mailboxPending.length);
});

test('when another provider filled the requested ceiling a scheduled mailbox task performs no reads',async()=>{
  const {b,data,deps,reads}=setup();
  b.researchLimitInput={brief:b.brief,instructions:['Find up to 1 designer.']};
  b.researchJob.qualifiedIds=['another-verified-person'];
  const out=await runMailboxResearch(id,request(),deps);
  assert.equal(out.status,'goal_met');assert.equal(reads.length,0);assert.equal(data.leads.length,0);
});
