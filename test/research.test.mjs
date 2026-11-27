import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {research} from '../lib/agent.mjs';
import {candidateRows,validatePlan} from '../lib/research.mjs';
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

test('one request qualifies and saves exactly fifty unique named profiles across four durable batches',async()=>{
  let plans=0;
  const f=fixture({services:{
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
  assert.equal(validatePlan(JSON.stringify({...plan,requestedCount:2026,countPhrase:'2026 buyers'}),{brief}).goal,50);
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
  for(let i=0;i<6;i++)await f.run(i);
  assert.equal(f.b.lastRun.status,'exhausted');assert.equal(f.b.researchJob.queries.length,6);assert.equal(f.data.leads.length,0);
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
