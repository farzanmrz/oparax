import test from 'node:test';
import assert from 'node:assert/strict';
import {messageAgent} from '../lib/conversation.mjs';
import {research} from '../lib/agent.mjs';
import {releaseReplacedWorker} from '../lib/research-job.mjs';
import {view} from '../lib/store.mjs';

function workspace(uid,plan,draft) {
  let data={bots:[],leads:[],messages:[],events:[],suppressed:[],mailbox:null};
  const read=async()=>({data:structuredClone(data)});
  const edit=async fn=>{const next=structuredClone(data);const result=fn(next);data=next;return result;};
  const services={workspaceId:()=>uid,read,edit,plan,draft};
  return {get data(){return data;},send:raw=>messageAgent(raw,services),services};
}
const researchPlan={action:'research',name:'Barbour team',brief:'Find buyers at Barbour.'};
const req={message:'Find buyers at Barbour.',searchSource:'web',requestId:'first-request'};
function saved(id,botId) {
  return {id,botId,company:'Barbour',person:'Example Person',role:'Buyer',
    companyVerification:{name:'Barbour',source:'https://example.org/teams',evidence:'Example Person is a buyer at Barbour'},
    linkedinUrl:'https://www.linkedin.com/in/example-person',linkedinEvidence:'Example Person - Buyer at Barbour',
    subject:'Existing sequence',body:'Approved automatic copy',linkedin:'Existing LinkedIn note',linkedinState:'draft',status:'queued',stage:0};
}

test('natural brief creates one conversation and one durable job across parallel delivery, reload and retry',async()=>{
  let calls=0;
  const w=workspace('u1',async()=>{calls++;await Promise.resolve();return researchPlan;});
  const [a,b]=await Promise.all([w.send(req),w.send(req)]);
  assert.deepEqual(a,b);assert.equal(calls,1);assert.equal(w.data.bots.length,1);
  assert.equal(w.data.bots[0].researchRequestedAt,a.work.requestedAt);
  assert.equal(w.data.bots[0].autoEmail,false);assert.equal(w.data.bots[0].active,false);
  const replay=await w.send(req);assert.deepEqual(replay,a);assert.equal(w.data.messages.length,2);
  assert.equal(view(w.data).conversationReceipts,undefined);
  await assert.rejects(w.send({...req,message:'Send an unrelated command.'}),/already belongs/);
});
test('inference failure is retryable and no partial conversation or action commits',async()=>{
  let first=true;const w=workspace('u2',async()=>{if(first){first=false;throw Error('Gateway interrupted');}return researchPlan;});
  await assert.rejects(w.send(req),/interrupted/);assert.equal(w.data.bots.length,0);
  await w.send(req);assert.equal(w.data.bots.length,1);assert.equal(w.data.messages.length,2);
});
test('one request token has independent scope across tenants',async()=>{
  const a=workspace('tenant-1',async()=>researchPlan),b=workspace('tenant-2',async()=>researchPlan);
  const [x,y]=await Promise.all([a.send(req),b.send(req)]);
  assert.notEqual(x.agentId,y.agentId);
  await assert.rejects(a.send({id:y.agentId,requestId:'missing-thread',message:'Status'}),/not found/);
});
test('saved results and status use live verified records, draft is persisted without changing scheduled mail',async()=>{
  let plan=researchPlan,drafts=0;
  const w=workspace('u3',async()=>plan,async({prospect,channel})=>{drafts++;assert.equal(prospect.person,'Example Person');assert.equal(channel,'email');return {subject:'Footwear samples',body:'Hello, could I send a footwear sample for your review?'};});
  const {agentId}=await w.send(req);
  await w.services.edit(d=>{d.leads.push(saved('lead-real',agentId),{id:'unverified',botId:agentId,person:'Ghost'});d.bots[0].autoEmail=true;});
  await w.send({id:agentId,message:'Show me the prospects',requestId:'give-results'});
  assert.deepEqual(w.data.messages.at(-1).details.prospectIds,['lead-real']);
  await w.send({id:agentId,message:'What is the status of this research?',requestId:'give-status'});
  assert.match(w.data.messages.at(-1).content,/qualified 0 of 50/);
  assert.match(w.data.messages.at(-1).content,/0 distinct public profile URLs and completed 0 source checks/);
  plan={action:'draft',prospectId:'lead-real',channel:'email'};
  const input={id:agentId,message:'Draft a short email for Example Person offering a footwear sample.',requestId:'draft-email'};
  await w.send(input);await w.send(input);
  assert.equal(drafts,1);assert.equal(w.data.leads[0].reviewDrafts.length,1);
  assert.equal(w.data.messages.at(-1).details.body,w.data.leads[0].reviewDrafts[0].body);
  assert.ok(!w.data.messages.at(-1).content.includes(w.data.messages.at(-1).details.body));
  assert.equal(w.data.leads[0].body,'Approved automatic copy');assert.equal(w.data.leads[0].status,'queued');
  assert.equal(w.data.bots[0].autoEmail,true);
});
test('clarification creates a persistent thread and the answer starts actual research in that same thread',async()=>{
  let decision={action:'clarify',question:'Which company should I search?'};
  const w=workspace('u4',async({history})=>{if(history.length)assert.ok(history.some(m=>m.content.includes('Which company')));return decision;});
  const first=await w.send({requestId:'ask-target',message:'Find the buyers'});assert.equal(first.work,null);
  assert.equal(w.data.bots[0].provisional,true);
  decision=researchPlan;
  const resolved=await w.send({id:first.agentId,requestId:'resolve-target',message:'The buyers at Barbour.',searchSource:'web'});
  assert.equal(resolved.agentId,first.agentId);assert.ok(resolved.work);assert.equal(w.data.bots.length,1);
});
test('an in-flight correction fences stale verification and the original worker releases the revised job',async()=>{
  let command=researchPlan;
  const w=workspace('u5',async()=>command),first=await w.send(req);
  let ready,unblock;
  const reached=new Promise(r=>{ready=r;});const block=new Promise(r=>{unblock=r;});
  const old=research(first.agentId,{...first.work,workerId:'worker-one'},{
    edit:w.services.edit,
    model:async()=>JSON.stringify({mode:'people',target:'Find Barbour buyers',employers:['Barbour'],roles:['buying']}),
    companyProof:async()=>null,profilePage:async()=>{ready();await block;return {rows:[],searched:true,exhausted:true,candidateCount:0};},
    articleSearch:async()=>[]
  });
  await reached;
  command={action:'refine',brief:'Find only US-based footwear buyers at Barbour.'};
  const update=await w.send({id:first.agentId,message:'Actually only the US-based footwear buyers.',requestId:'correct-region'});
  assert.equal(update.work,null);assert.equal(w.data.bots[0].lease.supersededWorker,'worker-one');
  const newJob=w.data.bots[0].researchRequestedAt;
  assert.notEqual(newJob,first.work.requestedAt);
  unblock();await old;
  assert.equal(w.data.leads.length,0);assert.equal(w.data.bots[0].researchJob.pages,0);
  await w.services.edit(d=>{assert.equal(releaseReplacedWorker(d.bots[0],'not-owner'),null);assert.deepEqual(releaseReplacedWorker(d.bots[0],'worker-one'),{requestedAt:newJob,page:0});});
  assert.equal(w.data.bots[0].lease,null);assert.equal(w.data.bots[0].brief,command.brief);
  assert.equal(w.data.bots[0].active,false);
});
test('source choice precedes discovery and never switches private agents to public-web research',async()=>{
  const w=workspace('source-user',async()=>researchPlan);
  const start=await w.send({message:'Find buyers at Barbour.',requestId:'source-first'});
  assert.equal(start.work,null);assert.equal(w.data.bots[0].researchRequestedAt,undefined);assert.equal(w.data.bots[0].searchSource,undefined);
  assert.equal(w.data.messages.at(-1).details.type,'sourceChoice');
  const privateStep=await w.send({id:start.agentId,message:'Sales Navigator',requestId:'choose-private',searchSource:'sales_navigator'});
  assert.equal(privateStep.work,null);assert.equal(w.data.bots[0].searchSource,'sales_navigator');assert.equal(w.data.bots[0].researchRequestedAt,undefined);
  assert.equal(w.data.messages.at(-1).details.type,'browserConnection');
  let calls=0;
  await assert.rejects(research(start.agentId,{},{edit:w.services.edit,model:async()=>{calls++;}}),/Private sources/);
  assert.equal(calls,0);
  const web=await w.send({id:start.agentId,message:'Search the public web instead.',requestId:'choose-web'});
  assert.ok(web.work);assert.equal(w.data.bots[0].searchSource,'web');
});
test('an explicit initial source works and output format is not treated as search permission',async()=>{
  const privateAgent=workspace('first-private',async()=>researchPlan);
  const a=await privateAgent.send({message:'Search LinkedIn for designers at Barbour',requestId:'private-initial'});
  assert.equal(a.work,null);assert.equal(privateAgent.data.bots[0].searchSource,'linkedin');
  assert.equal(privateAgent.data.messages.at(-1).details.type,'browserConnection');
  const none=workspace('outputs',async()=>researchPlan);
  const b=await none.send({message:'Find buyers at Barbour and give me LinkedIn profile URLs.',requestId:'output-only'});
  assert.equal(b.work,null);assert.equal(none.data.messages.at(-1).details.type,'sourceChoice');
});
test('private source replaces running web work without starting a new discovery worker',async()=>{
  const w=workspace('switch-private',async()=>researchPlan);const first=await w.send(req);
  await w.services.edit(d=>{d.bots[0].lease={id:'old-worker',until:new Date(Date.now()+30000).toISOString()};});
  const selected=await w.send({id:first.agentId,message:'Use LinkedIn',requestId:'make-private'});
  assert.equal(selected.work,null);assert.equal(w.data.bots[0].researchRequestedAt,undefined);assert.equal(w.data.bots[0].lease.supersededWorker,'old-worker');
  assert.equal(w.data.bots[0].searchSource,'linkedin');assert.equal(w.data.bots[0].searchGate.status,'awaiting_selection');
  await w.services.edit(d=>assert.equal(releaseReplacedWorker(d.bots[0],'old-worker'),null));
  assert.equal(w.data.bots[0].lease,null);
});
test('ambiguous source change on an existing public agent prompts rather than continuing its old source',async()=>{
  const w=workspace('ambiguous-switch',async()=>researchPlan);const first=await w.send(req);
  const pending=await w.send({id:first.agentId,message:'Use LinkedIn or Sales Navigator',requestId:'switch-unsure'});
  assert.equal(pending.work,null);assert.equal(w.data.bots[0].searchSource,undefined);assert.equal(w.data.bots[0].researchRequestedAt,undefined);
  assert.equal(w.data.messages.at(-1).details.type,'sourceChoice');
  const result=await w.send({id:first.agentId,message:'Switch from the public web to LinkedIn',requestId:'switch-clear'});
  assert.equal(result.work,null);assert.equal(w.data.bots[0].searchSource,'linkedin');assert.equal(w.data.messages.at(-1).details.type,'browserConnection');
});
test('confirming the public web resumes a failed legacy job at 12 of 50 without discarding saved IDs or search cursors',async()=>{
  const w=workspace('legacy-resume',async()=>researchPlan);const start=await w.send(req);
  await w.services.edit(d=>{
    const b=d.bots[0];delete b.searchSource;delete b.researchRequestedAt;delete b.researchJob.searchSource;
    b.researchJob.status='failed';b.researchJob.goal=50;b.researchJob.qualified=12;
    b.researchJob.qualifiedIds=Array.from({length:12},(_,i)=>'lead-'+i);b.researchJob.pages=8;b.researchJob.indexCursors={Barbour:8};
    b.lastRun={status:'failed',summary:'Last provider unavailable.'};b.searchGate={status:'awaiting_source'};
  });
  const before=structuredClone(w.data.bots[0].researchJob);
  const picked=await w.send({id:start.agentId,message:'Search the public web',requestId:'pick-legacy-source',searchSource:'web'});
  assert.equal(picked.work.requestedAt,before.id);assert.equal(picked.work.page,8);
  const repeated=await w.send({id:start.agentId,message:'Use public web',requestId:'confirm-public-again'});
  assert.deepEqual(repeated.work,picked.work);
  const after=w.data.bots[0].researchJob;
  assert.equal(after.id,before.id);assert.equal(after.qualified,12);assert.equal(after.goal,50);assert.deepEqual(after.qualifiedIds,before.qualifiedIds);assert.deepEqual(after.indexCursors,before.indexCursors);
  assert.equal(after.searchSource,'web');assert.equal(w.data.bots[0].searchGate,undefined);
  await w.services.edit(d=>{const b=d.bots[0];delete b.researchRequestedAt;b.researchJob.status='goal_met';b.researchJob.qualified=50;b.lastRun={status:'goal_met',summary:'Found 50 contacts.'};});
  const done=await w.send({id:start.agentId,message:'Public web',requestId:'terminal-confirm'});
  assert.equal(done.work,null);assert.equal(w.data.bots[0].researchJob.id,before.id);assert.equal(w.data.bots[0].researchJob.qualified,50);
});
