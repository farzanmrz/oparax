import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {research,model} from '../lib/agent.mjs';
import {view} from '../lib/store.mjs';
import {queueResearch,continuationRequest} from '../lib/research-job.mjs';
import {candidateRows,validatePlan,outreachDraft} from '../lib/research.mjs';
import {attributedProfile,profileResults} from '../lib/research-profiles.mjs';

const brief='Find sourcing staff, designers and buyers at the footwear company Barbour.';
const target='Named Barbour sourcing staff, designers and buyers across the company.';
const scope={company:'Barbour',industry:'footwear',industryTerms:['shoes','boots'],domain:''};
const plan={mode:'people',target,employers:['Barbour'],roles:['sourcing','design','buying'],companyContexts:[scope],question:''};
const source='https://example.org/barbour-footwear';
const anchor={name:'Barbour',source,evidence:'Barbour designs footwear'};
const fixturePages={[source]:'<p>Barbour designs footwear.</p>'};
function realVerifier(rows,pages=fixturePages) {
  const script=[
    'import json,sys','sys.path.insert(0,"lib")','import verify','payload=json.load(sys.stdin)',
    'def fetched(url):',' page=verify.Page();page.feed(payload["html"][url]);return url,page.finish()',
    'verify.fetch=fetched','print(json.dumps([verify.verify(r) for r in payload["rows"]]))'
  ].join('\n');
  const out=spawnSync('python3',['-B','-c',script],{input:JSON.stringify({rows,html:pages}),encoding:'utf8'});
  assert.equal(out.status,0,out.stderr);return JSON.parse(out.stdout);
}
function fixture(options={}) {
  const b={id:'sample',name:'Sourcing',searchSource:'web',brief:options.brief||brief,active:false,autoEmail:false,cadence:24,researchRequestedAt:'request'};
  const data={bots:[b],leads:[],messages:[],events:[],suppressed:[]},requests=[];
  const services={
    edit:async fn=>fn(data),model:async(messages,setup)=>{requests.push({messages,setup});return JSON.stringify((options.answers||[]).shift()||plan);},
    profilePage:async()=>({searched:true,exhausted:true,query:'first query',rows:[],candidateCount:0}),
    companyProof:async()=>anchor,articleSearch:async()=>[],profileSearch:async()=>({results:[],failed:false}),
    verify:async(_,rows)=>realVerifier(rows),...options.services
  };
  return {b,data,requests,run:(page=0)=>research('sample',{requestedAt:'request',page},services),
    trigger:args=>research('sample',args,services)};
}
const firstNames=['Alex','Charlie','Casey','Dana','Elliot','Frankie','Robin','Taylor','Jamie','Cameron','Riley','Logan','Morgan'];
const lastNames=['Jones','Brown','Green','Smith','Wilson'];
function person(i) {
  const name=firstNames[i%firstNames.length]+' '+lastNames[Math.floor(i/firstNames.length)];
  return {company:'Barbour',person:name,role:'Footwear Buyer',source:'',profileHit:{
    url:'https://uk.linkedin.com/in/'+name.toLowerCase().replace(' ','-'),
    title:name+' - Footwear Buyer at Barbour | LinkedIn',snippet:'Footwear Buyer at Barbour.'
  }};
}
function pageOf(rows,page) {
  return {rows,candidateCount:rows.length,checkedKeys:rows.map(r=>r.profileHit.url),query:'site:linkedin.com/in/ Barbour job group '+page,
    searched:true,exhausted:false};
}

test('a planner budget block is visible in the desk before any search, waits for cadence, and can resume',async()=>{
  let blocked=true,searches=0;
  const f=fixture({services:{
    model:async()=>{if(blocked)throw {cause:{data:{error:{upstreamStatusCode:402,apiErrorMessage:'Team budget exceeded. Current spend: $51.21 (private trace)'}}}};return JSON.stringify(plan);},
    companyProof:async()=>{searches++;return anchor;},profilePage:async()=>{searches++;return pageOf([person(0)],0);},
    articleSearch:async()=>{searches++;return [];}
  }});
  f.b.active=true;
  await f.run();
  assert.equal(searches,0);assert.equal(f.data.leads.length,0);
  const receipt=view(f.data).bots[0].lastRun.receipt;
  assert.equal(receipt.reason,'model_budget');assert.equal(receipt.distinctQueries,0);
  assert.match(receipt.summary,/Resume research/);assert.doesNotMatch(JSON.stringify(view(f.data)),/private trace|51\.21|no matches/i);
  assert.equal(f.b.researchRequestedAt,undefined);assert.equal(f.b.lease,null);
  assert.equal(continuationRequest('sample',f.b),null);
  assert.ok(Date.parse(f.b.next)-Date.now()>23*3600000);
  await assert.rejects(f.trigger({scheduled:true}),e=>e.status===409);
  await assert.rejects(f.run(),e=>e.status===409);
  blocked=false;
  assert.equal(queueResearch(f.b,{resume:true}),'request');await f.run();
  assert.equal(f.b.researchJob.qualified,1);assert.ok(searches>0);
});

test('retry replays an interrupted verification page and its article query without skipping discovered people',async()=>{
  for(const scheduled of [false,true]){
    let interrupted=true;
    const pages=[];
    const f=fixture({services:{
      profilePage:async({page})=>{pages.push(page);return pageOf([person(page)],page);},
      verify:async(_,rows)=>{
        if(interrupted)throw Error('Verifier temporarily offline');
        return realVerifier(rows);
      }
    }});
    await f.run();
    assert.equal(f.b.lastRun.receipt.reason,'source_error');
    assert.ok(f.b.lastRun.receipt.distinctQueries>0);
    assert.equal(f.b.researchJob.pages,0);
    assert.equal(f.b.researchJob.indexCursors.Barbour,undefined);
    assert.deepEqual(f.b.researchJob.seen,[]);
    interrupted=false;
    if(scheduled){
      f.b.active=true;f.b.next=new Date(0).toISOString();
      await f.trigger({scheduled:true});
    }else{
      assert.equal(queueResearch(f.b,{resume:true}),'request');await f.run();
    }
    assert.equal(f.b.researchJob.id,'request');
    assert.deepEqual(pages,[0,0]);
    assert.deepEqual(f.data.leads.map(p=>p.person),[person(0).person]);
    assert.equal(f.b.researchJob.articleFacets.length,1);
    assert.equal(f.b.researchJob.blockedPages,0);
  }
});

test('an HTTP 402 from the model returns an actionable safe failure',async t=>{
  const original=process.env.AI_GATEWAY_API_KEY;process.env.AI_GATEWAY_API_KEY='test';
  t.after(()=>{if(original===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=original;});
  t.mock.method(globalThis,'fetch',async()=>new Response('private billing account detail',{status:402}));
  await assert.rejects(model([]),error=>error.status===402&&/AI Gateway budget/.test(error.message)&&!error.message.includes('private'));
});

test('budget rejection while drafting preserves verified people and holds their outreach',async()=>{
  const f=fixture({services:{model:async(_,run)=>{
    if(run.task==='draft')throw {statusCode:402};
    return JSON.stringify(plan);
  },profilePage:async()=>pageOf([person(0)],0)}});
  f.data.businessMemory={salesProposition:'We supply materials to footwear brands.'};
  await f.run();
  const lead=f.data.leads[0],receipt=view(f.data).bots[0].lastRun.receipt;
  assert.equal(receipt.reason,'model_budget');assert.equal(receipt.uniqueQualified,1);assert.equal(f.b.researchRequestedAt,undefined);
  assert.equal(lead.body,'');assert.equal(lead.status,'research');assert.match(lead.draftQuestion,/AI Gateway budget/);
  assert.equal(f.b.researchJob.indexCursors.Barbour,undefined);
});

test('one request qualifies and saves exactly fifty unique named profiles across four durable batches',async()=>{
  let plans=0;
  const f=fixture({brief:'Find up to 50 buyers at the footwear company Barbour.',services:{
    model:async()=>{plans++;return JSON.stringify(plan);},
    profilePage:async({page})=>pageOf(Array.from({length:13},(_,i)=>person(page*13+i)),page)
  }});
  for(let page=0;page<4;page++){
    await f.run(page);
    assert.equal(f.b.researchJob.pages,page+1);assert.equal(f.b.researchJob.qualified,Math.min((page+1)*13,50));
    if(page<3)assert.equal(f.b.lastRun.status,'continuing');
  }
  assert.equal(plans,1);assert.equal(f.b.lastRun.status,'goal_met');assert.equal(f.b.researchRequestedAt,undefined);
  assert.equal(f.data.leads.length,50);assert.equal(new Set(f.data.leads.map(l=>l.linkedinUrl)).size,50);
  for(const l of f.data.leads){
    assert.equal(l.companyVerification.source,source);assert.match(l.companyVerification.evidence,/Barbour designs footwear/i);
    assert.ok(l.linkedinEvidence.includes(l.person));assert.equal(l.source,source);
  }
  assert.equal(f.b.active,false);assert.equal(f.b.autoEmail,false);
});

test('an explicitly requested quota is fulfilled without publishing overflow',async()=>{
  const f=fixture({brief:'Find 2 buyers at the footwear company Barbour.',
    answers:[{...plan,requestedCount:2,countPhrase:'2 buyers'}],services:{profilePage:async()=>pageOf([person(0),person(1),person(2)],0)}});
  await f.run();assert.equal(f.b.researchJob.goal,2);assert.equal(f.data.leads.length,2);assert.equal(f.b.lastRun.status,'goal_met');
  assert.equal(validatePlan(JSON.stringify({...plan,requestedCount:2026,countPhrase:'2026 buyers'}),{brief}).goal,null);
});

test('exact employer, role and a real personal profile are required before automatic publication',async()=>{
  const good=person(0),wrong=person(1);
  wrong.profileHit.title=wrong.person+' - Footwear Buyer at Barbour EHS | LinkedIn';
  wrong.profileHit.snippet='Footwear Buyer at Barbour EHS.';
  const companyOnly={...person(2),profileHit:{url:'https://www.linkedin.com/company/barbour',title:'Barbour | LinkedIn',snippet:'Footwear.'}};
  const f=fixture({services:{profilePage:async()=>pageOf([good,wrong,companyOnly],0)}});
  await f.run();assert.equal(f.data.leads.length,1);assert.equal(f.data.leads[0].person,good.person);
  assert.equal(f.b.researchJob.qualified,1);assert.ok(f.b.researchJob.pending.some(p=>p.person===wrong.person));
});

test('article-first candidates lacking a matched LinkedIn stay pending, including during a profile index outage',async()=>{
  const article={company:'Barbour',person:'Morgan Green',role:'Buyer',source:'https://example.org/staff',quote:'Morgan Green, Buyer at Barbour',linkedinUrl:'https://www.linkedin.com/in/model-guess'};
  const f=fixture({answers:[plan,{candidates:[article]}],services:{
    articleSearch:async()=>[{url:article.source,title:'Staff',snippet:article.quote}],
    profileSearch:async()=>{throw Error('offline');},
    verify:async(_,rows)=>realVerifier(rows,{[article.source]:'<p>Barbour designs footwear.</p><p>Morgan Green, Buyer at Barbour.</p>'})
  }});
  await f.run();assert.equal(f.data.leads.length,0);assert.equal(f.b.researchJob.pending[0].person,article.person);
  assert.equal(f.b.lastRun.counts.profileLookupFailed,true);
});
test('independent article can establish employer and a separate indexed title can establish matched profile',async()=>{
  const article={company:'Barbour',person:'Morgan Green',role:'Buyer',source:'https://example.org/staff',quote:'Morgan Green, Buyer at Barbour'};
  const f=fixture({answers:[plan,{candidates:[article]}],services:{
    articleSearch:async()=>[{url:article.source,title:'Staff',snippet:article.quote}],
    profileSearch:async()=>({results:[{title:'Morgan Green - Buyer at Barbour | LinkedIn',snippet:'Footwear buyer.',url:'https://www.linkedin.com/in/morgan-green'}],failed:false}),
    verify:async(_,rows)=>realVerifier(rows,{[article.source]:'<p>Barbour designs footwear.</p><p>Morgan Green, Buyer at Barbour.</p>'})
  }});
  await f.run();assert.equal(f.data.leads[0].linkedinUrl,'https://www.linkedin.com/in/morgan-green');assert.equal(f.b.researchJob.qualified,1);
});
test('genuinely ambiguous brief asks the question before any discovery',async()=>{
  const question='Which company or industry should I look for buyers in?';
  const f=fixture({answers:[{...plan,question}],services:{profilePage:async()=>assert.fail('unexpected search')}});
  await f.run();assert.equal(f.b.lastRun.status,'needs_input');assert.equal(f.b.lastRun.question,question);
});
test('stale page and paused timer do not run research',async()=>{
  const f=fixture();await assert.rejects(f.trigger({requestedAt:'different'}),/already handled/);
  await assert.rejects(f.trigger({scheduled:true}),/no longer due/);await assert.rejects(f.run(3),/batch was already handled/);
  assert.equal(f.requests.length,0);assert.equal(f.b.researchRequestedAt,'request');
});
test('genuine exhaustion is distinct from provider failures and follows varied scope-preserving attempts',async()=>{
  const f=fixture({services:{profilePage:async()=>({searched:false,exhausted:true,rows:[]})}});
  for(let i=0;i<10&&f.b.researchRequestedAt;i++)await f.run(i);
  assert.equal(f.b.lastRun.status,'exhausted');assert.equal(f.b.lastRun.receipt.reason,'diminishing_returns');assert.ok(f.b.researchJob.queries.length>1);assert.equal(f.data.leads.length,0);
  const outage=fixture({services:{profilePage:async()=>{throw Error('offline');},articleSearch:async()=>{throw Error('down');},model:async(messages,options)=>{if(options.tool)throw Error('down');return JSON.stringify(plan);}}});
  await outage.run();assert.equal(outage.b.lastRun.status,'failed');assert.equal(outage.b.researchJob.dryPages,0);
});
test('raw profile metadata only, with grounded identity and no employer or person lookalikes',()=>{
  const p={company:'Barbour',person:'Lorenzo Brunetti',role:'Footwear Designer',researchTarget:scope};
  const hit={url:'https://www.linkedin.com/in/actual-01',title:'Lorenzo Giovanni Brunetti - Footwear Designer at Barbour | LinkedIn'};
  assert.equal(attributedProfile(p,[hit]).linkedinUrl,hit.url);
  for(const title of ['Lorenzo Giovanni Brunetti - Barbour | LinkedIn','Lorenzo Brunetti - Finance Director at Barbour | LinkedIn','Lorenzo Brunetti - Footwear Designer at Barbour EHS | LinkedIn'])assert.equal(attributedProfile(p,[{...hit,title}]),null);
  assert.equal(attributedProfile(p,[hit,{...hit,url:'https://www.linkedin.com/in/another'}]),null);
  assert.throws(()=>profileResults([{toolResults:[{toolName:'perplexity_search',providerExecuted:false,output:{results:[hit]}}]}]));
  const row={...p,source,quote:'Quote about the target',linkedinUrl:hit.url,profileHit:hit,companyVerification:anchor};
  const batch=candidateRows(JSON.stringify({candidates:[row,{...row,person:''},{...row,company:'Supplier Co'}]}),plan);
  assert.equal(batch.rows.length,1);assert.equal(batch.rows[0].profileHit,undefined);assert.equal(batch.rows[0].companyVerification,undefined);
});

test('a provider replaying one query for every article route reports incomplete search rather than audience exhaustion',async()=>{
  const f=fixture({services:{profilePage:async()=>({searched:false,exhausted:true,rows:[]}),
    articleSearch:async()=>Object.assign([],{executedQueries:['same search for every route']})}});
  for(let page=0;page<8&&f.b.researchRequestedAt;page++)await f.run(page);
  assert.equal(f.b.lastRun.status,'failed');assert.equal(f.b.lastRun.receipt.reason,'source_error');
  assert.equal(f.b.lastRun.receipt.distinctQueries,1);assert.equal(f.b.lastRun.receipt.sourceFamilies.length,1);
});
test('real verifier publishes beyond the retired 50 limit while fresh evidence keeps arriving',async()=>{
  const f=fixture({services:{profilePage:async({page})=>pageOf(Array.from({length:13},(_,i)=>person(page*13+i)),page)}});
  for(let page=0;page<4;page++)await f.run(page);
  assert.equal(f.b.researchJob.qualified,52);assert.equal(f.b.researchJob.goal,null);assert.equal(f.b.lastRun.status,'continuing');
});

test('market research follows fresh evidence past its initial source survey, then stops after distinct dry searches',async()=>{
  let rounds=0;
  const marketPlan={...plan,target:'Footwear buyers in the UK',employers:[],companyContexts:[]};
  const records=Array.from({length:8},(_,i)=>{
    const p=person(i);
    return {...p,source:'https://example.org/team/'+i,quote:p.person+', Footwear Buyer at Barbour.'};
  });
  const pages=Object.fromEntries(records.map(p=>[p.source,'<p>Barbour designs footwear.</p><p>'+p.quote+'</p>']));
  const f=fixture({brief:'Find buyers at UK footwear companies.',services:{
    profilePage:async()=>({searched:false,exhausted:true}),
    articleSearch:async context=>{
      if(rounds>=6)assert.ok(context.previousQueries.length);
      const row=records[rounds++];
      const hits=row?[{url:row.source,title:row.person,snippet:row.quote}]:[];
      hits.executedQueries=['distinct credible source query '+rounds];return hits;
    },
    model:async messages=>{
      const payload=JSON.parse(messages.at(-1).content);
      if(!payload.articles)return JSON.stringify(marketPlan);
      return JSON.stringify({candidates:records.filter(r=>payload.articles.some(h=>h.url===r.source))});
    },
    verify:async(_,rows)=>realVerifier(rows,pages),
    profileSearch:async()=>({failed:false,results:records.map(r=>r.profileHit)})
  }});
  for(let page=0;page<12&&f.b.researchRequestedAt;page++)await f.run(page);
  assert.equal(rounds,10);
  assert.equal(f.b.researchJob.qualified,8);
  assert.equal(f.b.lastRun.receipt.reason,'diminishing_returns');
  assert.equal(f.b.researchRequestedAt,undefined);
});

test('a billing interruption between verification and drafting saves the person without a sendable template',()=>{
  const verified={person:'Test Contact',role:'Buyer',company:'Example firm',linkedinUrl:'https://www.linkedin.com/in/test-contact'};
  const draft=outreachDraft(verified,'The service budget is exhausted.');
  assert.equal(draft.linkedinUrl,verified.linkedinUrl);
  assert.equal(draft.body,'');
  assert.equal(draft.linkedin,'');
  assert.ok(draft.draftQuestion);
  const complete={...verified,subject:'Reviewed subject',body:'Reviewed offer',linkedin:'Reviewed DM'};
  assert.equal(outreachDraft(complete,'The service budget is exhausted.').body,complete.body);
});
