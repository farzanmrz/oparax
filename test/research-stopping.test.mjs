import assert from 'node:assert/strict';
import test from 'node:test';
import {researchCeiling} from '../lib/research-limit.mjs';
import {ensureResearchJob,advanceResearchJob,queueResearch} from '../lib/research-job.mjs';
import {validatePlan} from '../lib/research.mjs';

test('only a positive instruction about people can bound a search',()=>{
  for(const [clause,n] of [
    ['Find me twenty-five buyers at Acme',25],['Find up to 50',50],
    ['Identify 12 purchasing managers',12],['Limit the search to 20 contacts.',20],
    ['If only 6 exist, stop',null],['e.g. 6',null],["Don't stop at 1",null],
    ['Find all buyers. For example find 6 contacts.',null],['Find companies with 50 employees',null],
    ['We make a 50-person product. Find the buyers.',null],["Don't find 8 directors, find all of them.",null],
    ['Find suppliers with up to 50 employees',null],['Our app serves up to 50 employees',null]
  ]){
    const plan={mode:'people',target:'Relevant buyers',roles:['purchasing managers'],requestedCount:50,countPhrase:'50 employees'};
    assert.equal(validatePlan(JSON.stringify(plan),{brief:clause}).goal,n,clause);
  }
  assert.equal(researchCeiling(['Find 10 buyers at Acme','No cap']),null);
});

function advance(b,{who=[],scope='Acme',scopes=['Acme'],route,baseline=true,issue=false,done=false,pending=[]}) {
  return advanceResearchJob(b,{page:b.researchJob.pages,status:'page_complete',qualifiedIds:who,candidates:who,
    queries:route?[route]:[],coverage:{scopeKey:scope,scopes,scope:'Current buyers',families:['Public profiles','Independent articles'],
      facets:route?[route]:[],baseline,interrupted:issue},pending,facetsCovered:done});
}
test('evidence-led stopping varies with the available people and persists its receipt without a minimum or default ceiling',()=>{
  for(const count of [0,1,9,57]){
    const b={};ensureResearchJob(b,'job');
    advance(b,{who:Array.from({length:count},(_,i)=>'p'+i),route:'professional index'});
    assert.equal(advance(b,{route:'trade interviews'}).status,'continuing');
    assert.equal(advance(b,{route:'trade interviews'}).status,'continuing');
    const last=advance(b,{route:'association directory'});
    assert.equal(last.status,'exhausted');assert.equal(last.receipt.reason,'diminishing_returns');
    assert.equal(last.receipt.uniqueQualified,count);assert.equal(last.receipt.ceiling,null);
    assert.equal(last.receipt.uniqueCandidates,count);assert.equal(last.receipt.heldForEvidence,0);
  }
});
test('all named audiences need independent successful coverage after growth; outages cannot count as exhaustion',()=>{
  const b={},scopes=['Acme','Other'];ensureResearchJob(b,'job');b.researchJob.goal=80;
  for(const route of ['staff','profiles','press'])assert.equal(advance(b,{route,scopes}).status,'continuing');
  assert.equal(advance(b,{scopes,scope:'Other',route:'directors',baseline:false}).status,'continuing');
  assert.equal(advance(b,{scopes,scope:'Other',route:'editorial',baseline:false}).status,'continuing');
  const gained=advance(b,{scopes,scope:'Other',route:'role directory',who:['p']});
  assert.equal(gained.status,'continuing');
  for(const route of ['down 1','down 2','down 3']){
    const result=advance(b,{scopes,scope:'Other',route,issue:true,done:true});
    assert.equal(result.status,route==='down 3'?'failed':'continuing');
    if(result.receipt)assert.equal(result.receipt.reason,'source_error');
  }
  const job=b.researchJob;assert.equal(queueResearch(b,{resume:true}),job.id);
  assert.equal(job.qualified,1);assert.equal(job.pages,9);
});
test('changed scope reopens discovery without inheriting the former result or a stale worker ticket',()=>{
  const b={brief:'Find buyers',clarifications:[]};ensureResearchJob(b,'old');
  b.researchJob.planSignature=JSON.stringify([b.brief,[]]);
  advance(b,{who:['old-person'],route:'old scope',done:true});
  b.clarifications.push({answer:'Look for designers instead.'});
  const next=queueResearch(b,{resume:true});assert.notEqual(next,'old');assert.equal(b.researchJob.pages,0);
  assert.deepEqual(b.researchJob.qualifiedIds,[]);
});
