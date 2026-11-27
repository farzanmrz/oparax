import assert from 'node:assert/strict';
import test from 'node:test';
import {withWorkspace} from '../lib/store.mjs';
import {queueResearch,ensureResearchJob,advanceResearchJob,continuationRequest,verifyContinuation} from '../lib/research-job.mjs';

test('one job keeps a single quota and counts distinct contacts across batches',()=>{
  const b={};
  const id=queueResearch(b);
  assert.equal(queueResearch(b),id);
  for(let page=0;page<7;page++){
    const job=ensureResearchJob(b,id);
    assert.equal(job.pages,page);
    const first=page*8;
    const ids=Array.from({length:Math.min(8,50-first)},(_,offset)=>'contact-'+(first+offset));
    if(page>0)ids.push('contact-0');
    const result=advanceResearchJob(b,{page,counts:{candidates:ids.length},qualifiedIds:ids,candidates:ids,queries:['industry '+page],status:'added'});
    assert.equal(result.status,page<6?'continuing':'goal_met');
    assert.equal(job.counts.candidates,Math.min(50,(page+1)*8));
  }
  assert.equal(b.researchJob.qualified,50);
  assert.equal(b.researchRequestedAt,undefined);
  assert.throws(()=>advanceResearchJob(b,{page:4}),error=>error.status===409);
});

test('exhaustion requires distinct successful searches and coverage of the requested roles',()=>{
  const b={};queueResearch(b);
  function page(q,covered,failed=false){
    return advanceResearchJob(b,{page:b.researchJob.pages,queries:[q],counts:{profileLookupFailed:failed},status:'no_matches',facetsCovered:covered});
  }
  for(let i=0;i<6;i++)assert.equal(page('only buyers',false).status,'continuing');
  assert.equal(b.researchJob.dryPages,1);
  assert.equal(page('sourcing trade interviews',false).status,'continuing');
  assert.equal(page('design sector directory',false).status,'continuing');
  assert.equal(page('buyers at this company',false).status,'continuing');
  assert.equal(page('designers at this company',true).status,'exhausted');
  const c={};queueResearch(c);
  for(let i=0;i<3;i++){
    const out=advanceResearchJob(c,{page:i,queries:['query'+i],counts:{profileLookupFailed:true},status:'unverified',facetsCovered:true});
    assert.equal(out.status,i<2?'continuing':'failed');
  }
  assert.equal(queueResearch(c),c.researchJob.id);
  assert.equal(c.researchJob.pages,3);
});

test('signed continuation binds the exact agent and expires',()=>{
  process.env.SUPABASE_SECRET_KEY='test-secret';
  const uid='00000000-0000-4000-8000-000000000001',agent='00000000-0000-4000-8000-000000000002',b={};
  queueResearch(b);
  advanceResearchJob(b,{page:0,queries:['Buyer'],status:'no_matches'});
  const request=withWorkspace(uid,()=>continuationRequest(agent,b));
  assert.equal(verifyContinuation(request.payload,'Bearer '+request.signature).workspace,uid);
  assert.throws(()=>verifyContinuation(request.payload.replace(agent,uid),'Bearer '+request.signature),error=>error.status===401);
});

test('a clarifying answer resumes the same quota without recounting previously confirmed identities',()=>{
  const b={};const id=queueResearch(b);
  advanceResearchJob(b,{page:0,status:'needs_input',question:'Which company?',terminalReason:'I need a company.'});
  assert.equal(b.researchRequestedAt,undefined);
  assert.equal(queueResearch(b,{resume:true}),id);
  assert.equal(b.researchJob.goal,50);
});
