import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {attributedProfile,profileResults} from '../lib/research-profiles.mjs';
import {research} from '../lib/agent.mjs';
import {candidateRows,validatePlan} from '../lib/research.mjs';

const brief='Find sourcing staff, footwear designers and buyers at Barbour.';
const target='Find named Barbour sourcing staff, footwear designers and buyers.';
const plan={mode:'people',target,employers:['Barbour'],question:''};
const person={company:'Barbour',person:'Sample Person',role:'Footwear Designer',source:'https://example.org/footwear',quote:'Sample Person, Footwear Designer at Barbour'};
const verified=[{status:'verified',lead:person}];

function fixture({answers,checks=verified,clarifications=[],existing=[],profiles=async()=>({results:[],failed:false}),articles=async()=>{throw Error('No raw index in this fixture');}}) {
  const b={id:'sample',name:'UK sourcing',brief,active:false,autoEmail:false,cadence:24,clarifications,researchRequestedAt:'request'};
  const data={bots:[b],leads:existing,messages:[],events:[],suppressed:[]};
  const requests=[],pages=[];
  const services={edit:async fn=>fn(data),model:async(messages,options)=>{
    requests.push({messages,options});const next=answers.shift();
    if(next instanceof Error)throw next;
    return JSON.stringify(next);
  },verify:async(_,rows)=>{pages.push(rows);return typeof checks==='function'?checks(rows):structuredClone(checks);},profileSearch:profiles,articleSearch:articles};
  return {b,data,requests,pages,run:(options={requestedAt:'request'})=>research('sample',options,services)};
}

test('clear named-employer brief finds fellow employees and keeps outreach paused',async()=>{
  const f=fixture({answers:[plan,{candidates:[person]}],
    existing:[{company:'Barbour',person:'Other Person',botId:'sample'}]});
  await f.run();
  assert.equal(f.requests[1].options.tool.type,'vercel:parallel_search');
  for(const request of f.requests)assert.equal(request.options.modelId,process.env.OUTREACH_RESEARCH_MODEL||'openai/gpt-6.2-astra');
  assert.equal(f.b.lastRun.model,f.requests[1].options.modelId);
  const context=JSON.parse(f.requests[1].messages[1].content);
  assert.equal(context.mode,'people');
  assert.deepEqual(context.alreadySaved,[{company:'Barbour',person:'Other Person'}]);
  assert.equal(f.b.active,false);assert.equal(f.b.autoEmail,false);
  assert.equal(f.b.lastRun.status,'added');assert.equal(f.b.lastRun.counts.added,1);
  assert.equal(f.data.leads[0].status,'research');
  assert.equal(f.b.researchRequestedAt,undefined);
});
test('vague brief asks a genuine question before opening a search or VM',async()=>{
  const question='Which company or industry should I look for buyers in?';
  const f=fixture({answers:[{...plan,question}]});
  await f.run();
  assert.equal(f.requests.length,1);assert.equal(f.pages.length,0);
  assert.equal(f.b.lastRun.status,'needs_input');assert.equal(f.b.lastRun.question,question);
  assert.ok(f.data.messages.at(-1).content.includes(question));
});
test('saved clarification is sent to both planner and search',async()=>{
  const clarifications=[{question:'Which employer?',answer:'Barbour only'}];
  const f=fixture({answers:[plan,{candidates:[person]}],clarifications});
  await f.run();
  for(const request of f.requests)assert.deepEqual(JSON.parse(request.messages[1].content).clarifications,clarifications);
});
test('empty search checks another provider, records no matches, and asks before broadening',async()=>{
  const question='Should I also include assistant footwear designers at Barbour?';
  const f=fixture({answers:[plan,{candidates:[]},{candidates:[],question}]});
  await f.run();
  assert.equal(f.requests[2].options.tool.type,'vercel:exa_search');
  assert.equal(f.pages.length,0);assert.equal(f.b.lastRun.status,'no_matches');assert.equal(f.b.lastRun.question,question);
});
test('source rejections are reported, and a provider failure is not an empty success',async()=>{
  const f=fixture({answers:[plan,{candidates:[person]},{candidates:[]}],checks:[{status:'unavailable'}]});
  await f.run();
  assert.equal(f.b.lastRun.status,'unverified');assert.equal(f.b.lastRun.counts.unavailable,1);
  const bad=fixture({answers:[plan,new Error('offline'),new Error('offline')]});
  await bad.run();
  assert.equal(bad.b.lastRun.status,'failed');assert.ok(bad.b.error);assert.ok(bad.data.messages.at(-1).content);
});
test('duplicate person is not called a new verified match',async()=>{
  const f=fixture({answers:[plan,{candidates:[person]}],existing:[{company:'Barbour',person:person.person,identity:'barbour/sampleperson',botId:'sample'}]});
  await f.run();
  assert.equal(f.b.lastRun.status,'already_saved');assert.equal(f.b.lastRun.counts.duplicates,1);
});
test('a stale request or paused timer does not run discovery',async()=>{
  const f=fixture({answers:[]});
  await assert.rejects(f.run({requestedAt:'older'}),/already handled/);
  await assert.rejects(f.run({scheduled:true}),/no longer due/);
  assert.equal(f.requests.length,0);assert.equal(f.b.researchRequestedAt,'request');
});
test('reject company-only and out-of-scope candidates for a fixed-employer people brief',()=>{
  const result=candidateRows(JSON.stringify({candidates:[{...person,person:''},{...person,company:'Supplier Co'},person]}),plan);
  assert.equal(result.total,3);
  assert.equal(result.rows.length,1);
  assert.throws(()=>validatePlan('{"mode":"other","target":"buyers"}'),/interpret/);
});

test('discover, disambiguate identical employer names from source pages, link and save automatically',async()=>{
  const industryPlan={...plan,companyContexts:[{company:'Barbour',industry:'footwear',industryTerms:['shoes','boots']}]};
  const right={...person,person:'Alex Sample',role:'Buyer',source:'https://example.org/shoes',quote:'Alex Sample, Buyer at Barbour'};
  const wrong={...person,person:'Sam Sample',role:'Buyer',source:'https://example.org/safety-software',quote:'Sam Sample, Buyer at Barbour',
    linkedinUrl:'https://www.linkedin.com/in/fabricated',companyVerification:{name:'Barbour',source:person.source,evidence:'model invented this'}};
  function verifyPages(rows) {
    const script=[
      'import json,sys','sys.path.insert(0,"lib")','import verify',
      'payload=json.load(sys.stdin)',
      'def fetched(url):',' page=verify.Page();page.feed(payload["html"][url]);return url,page.finish()',
      'verify.fetch=fetched','print(json.dumps([verify.verify(row) for row in payload["rows"]]))'
    ].join('\n');
    const html={[right.source]:'<p>Barbour designs footwear.</p><p>Alex Sample, Buyer at Barbour.</p>',[wrong.source]:'<p>Barbour develops workplace safety software.</p><p>Sam Sample, Buyer at Barbour.</p>'};
    const out=spawnSync('python3',['-c',script],{input:JSON.stringify({rows,html}),encoding:'utf8'});
    assert.equal(out.status,0,out.stderr);return JSON.parse(out.stdout);
  }
  const profileHit={url:'https://uk.linkedin.com/in/alex-example',title:'Alex Sample - Buyer at Barbour | LinkedIn',snippet:'Footwear buyer at Barbour.'};
  const f=fixture({answers:[industryPlan,{candidates:[wrong,right]}],checks:verifyPages,
    profiles:async people=>{assert.deepEqual(people.map(p=>p.person),['Alex Sample']);return {failed:false,results:profileResults([{toolResults:[{toolName:'perplexity_search',providerExecuted:true,output:{results:[profileHit]}}]}])};}});
  await f.run();
  assert.equal(f.b.lastRun.counts.unsupported,1);assert.equal(f.b.lastRun.counts.added,1);
  assert.equal(f.b.lastRun.counts.profilesMatched,1);
  assert.equal(f.data.leads[0].linkedinUrl,'https://www.linkedin.com/in/alex-example');
  assert.match(f.data.leads[0].companyVerification.evidence,/Barbour designs footwear/);
  assert.equal(f.data.leads[0].companyVerification.source,right.source);
  assert.equal(f.data.leads[0].person,'Alex Sample');assert.equal(f.b.active,false);
});
test('profile requires attributable index metadata, accepts supported middle names, excludes ambiguity',()=>{
  const p={company:'Barbour',person:'Lorenzo Brunetti',role:'Footwear Designer',researchTarget:{industry:'footwear',industryTerms:['shoes']}};
  const hit={url:'https://www.linkedin.com/in/actual-01',title:'Lorenzo Giovanni Brunetti - Footwear Designer at Barbour | LinkedIn'};
  assert.equal(attributedProfile(p,[hit]).linkedinUrl,hit.url);
  assert.equal(attributedProfile(p,[{...hit,title:'Lorenzo Giovanni Brunetti - Barbour | LinkedIn'}]),null);
  assert.equal(attributedProfile(p,[{...hit,title:'Lorenzo Brunetti - Finance Director at Other Firm | LinkedIn',snippet:'Lorenzo can introduce you to people at Barbour'}]),null);
  assert.equal(attributedProfile(p,[{...hit,title:'Lorenzo Brunetti - Finance Director at Barbour | LinkedIn'}]),null);
  assert.equal(attributedProfile(p,[hit,{...hit,url:'https://www.linkedin.com/in/actual-02'}]),null);
  assert.throws(()=>profileResults([{toolResults:[{toolName:'perplexity_search',providerExecuted:false,output:{results:[hit]}}]}]));
});
test('second raw index pass keeps exact indexed sources and finds new people after duplicates',async()=>{
  const other={...person,person:'Another Person',source:'https://example.org/new'};
  const bogus={...other,person:'Fabricated Person',source:'https://example.org/never-indexed'};
  const f=fixture({existing:[{company:person.company,person:person.person,identity:'barbour/sampleperson',botId:'sample'}],
    answers:[plan,{candidates:[person]},{candidates:[other,bogus]}],
    checks:rows=>rows.map(lead=>({status:'verified',lead})),
    articles:async()=>[{url:other.source,title:'Named footwear staff',snippet:'Another Person, Footwear Designer at Barbour.'}]});
  await f.run();
  assert.equal(f.b.lastRun.counts.added,1);assert.equal(f.b.lastRun.counts.duplicates,1);
  assert.equal(f.data.leads[0].person,'Another Person');
  assert.equal(f.data.leads.some(l=>l.person===bogus.person),false);
});
test('profile index outage preserves the verified prospect without inventing a profile',async()=>{
  const f=fixture({answers:[plan,{candidates:[{...person,linkedinUrl:'https://www.linkedin.com/in/guessed',linkedinEvidence:'fabricated'}]}],
    checks:rows=>rows.map(lead=>({status:'verified',lead})),profiles:async()=>{throw Error('index timeout');}});
  await f.run();assert.equal(f.b.lastRun.status,'added');assert.equal(f.data.leads[0].linkedinUrl,'');
  assert.equal(f.b.lastRun.counts.profileLookupFailed,true);
});
