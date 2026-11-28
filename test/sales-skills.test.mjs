import test from 'node:test';
import assert from 'node:assert/strict';
import {setSalesSkill,skillEnabled,salesSkills,requireSkill,salesConnectors} from '../lib/sales-skills.mjs';
import {publicJobAuthorized} from '../lib/research-access.mjs';
import {stageSourceTasks,pendingSourceWork} from '../lib/source-tasks.mjs';
import {sourceStates} from '../lib/source-states.mjs';
import {addLead} from '../lib/domain.mjs';
test('capabilities are per-bot and preserve source selection and journal while stopping a public job',()=>{
  const b={id:'a',searchSources:['web','rocketreach'],researchRequestedAt:'existing',researchJob:{id:'existing',pages:12},lease:{id:'inflight',until:new Date(Date.now()+60000).toISOString()}};
  const d={rocketReach:{key:'private-example'},bots:[b],events:[],leads:[]};
  assert.ok(publicJobAuthorized(b));assert.equal(skillEnabled({},'public_research'),true);
  setSalesSkill(d,b,'public_research',false);
  assert.equal(publicJobAuthorized(b),false);assert.equal(b.researchRequestedAt,undefined);assert.equal(b.researchJob.pages,12);
  assert.equal(b.lease.supersededWorker,'inflight');assert.deepEqual(b.searchSources,['web','rocketreach']);assert.equal(sourceStates(d,b).web.status,'disabled');
  const work=stageSourceTasks(d,b);assert.equal(work.length,1);
  setSalesSkill(d,b,'rocketreach_research',false);assert.deepEqual(pendingSourceWork(d,b),[]);
  setSalesSkill(d,b,'rocketreach_research',true);assert.deepEqual(pendingSourceWork(d,b),work);
  assert.equal(skillEnabled({},'public_research'),true);
  assert.throws(()=>requireSkill(b,'public_research'),/disabled/);
  assert.throws(()=>setSalesSkill(d,b,'__proto__',true),/built-in/);
  assert.ok(!JSON.stringify([salesConnectors(d),salesSkills(d,b)]).includes('private-example'));
});
test('research keeps verified contacts without generating or queuing copy when drafting is disabled',()=>{
  const d={leads:[],suppressed:[]},b={id:'agent',skillSettings:{draft_outreach:false}};
  addLead(d,b,{company:'Example',person:'A Person',email:'a@example.org',source:'https://example.org/team',fit:'Buyer',subject:'Subject',body:'Body',linkedin:'Message',followUp:'Followup'});
  assert.equal(d.leads[0].subject,'');assert.equal(d.leads[0].body,'');assert.equal(d.leads[0].linkedin,'');assert.equal(d.leads[0].followUp,undefined);assert.equal(d.leads[0].status,'research');
});

test('changing active discovery skills fences the old worker and respects the remaining source',()=>{
  const active={id:'2026-01-01T00:00:00.000Z',pages:2,status:'continuing',pending:[{person:'Old result'}],searchSource:'web'};
  const b={id:'bot',brief:'Find footwear buyers',searchSources:['web','linkedin'],researchRequestedAt:active.id,researchJob:active,
    lease:{id:'web-worker',until:new Date(Date.now()+60000).toISOString()}};
  setSalesSkill({},b,'public_research',false);
  assert.equal(b.lease.supersededWorker,'web-worker');
  assert.notEqual(b.researchRequestedAt,active.id);
  assert.equal(b.researchRequestedAt,b.researchJob.id);
  assert.equal(b.researchJob.searchSource,'linkedin');
  assert.deepEqual(b.researchJob.pending,[]);
  const pending=b.researchRequestedAt;
  setSalesSkill({},b,'draft_outreach',false);
  assert.equal(b.researchRequestedAt,pending);
  setSalesSkill({},b,'linkedin_research',false);
  assert.equal(b.researchRequestedAt,undefined);
  assert.equal(b.researchJob.status,'paused_skill');
  assert.equal(b.lease.supersededWorker,'web-worker');
});
