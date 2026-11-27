import assert from 'node:assert/strict';
import test from 'node:test';
import {withWorkspace} from '../lib/store.mjs';
import {queueResearch,ensureResearchJob,advanceResearchJob,continuationRequest,verifyContinuation,dispatchContinuation} from '../lib/research-job.mjs';

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

test('a result on the last new query cannot trap a completed search in an endless loop',()=>{
  const b={};queueResearch(b);
  for(let page=0;page<4;page++){
    advanceResearchJob(b,{page,queries:['role facet '+page],candidates:['person '+page],
      qualifiedIds:page===3?['last-person']:[],status:'added',facetsCovered:page===3});
  }
  assert.equal(b.researchJob.dryPages,0);
  assert.equal(advanceResearchJob(b,{page:4,queries:['role facet 0'],candidates:['person 0'],status:'no_matches',facetsCovered:true}).status,'exhausted');
});

test('normal production continuation uses one independent dispatch even if another worker claimed it',async()=>{
  const prior=process.env.VERCEL_ENV;
  process.env.VERCEL_ENV='production';
  try{
    const req={payload:JSON.stringify({workspace:'owner',agent:'agent',requestedAt:'start',page:4}),signature:'stub'};
    for(const dbReply of [2,null]){
      const calls=[];
      await dispatchContinuation(req,{rpc:async(name,params)=>{calls.push([name,params]);return dbReply;},fetch:()=>{throw Error('Unexpected HTTP fallback');}});
      assert.deepEqual(calls,[['outreach_wake_research_page',{uid:'owner',agent_id:'agent',requested_at:'start',batch_index:4}]]);
    }
  }finally{if(prior===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=prior;}
});
