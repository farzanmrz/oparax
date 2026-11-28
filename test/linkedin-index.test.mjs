import assert from 'node:assert/strict';
import test from 'node:test';
import {discoverLinkedInMarket} from '../lib/linkedin-index.mjs';
import {research} from '../lib/agent.mjs';
import {sourceStates} from '../lib/source-states.mjs';
import {discoverySource} from '../lib/search-source.mjs';

test('a market discovery returns only indexed LinkedIn identities with attributable current roles',async()=>{
  const queryLog=[];
  const valid={url:'https://uk.linkedin.com/in/faye-buyer',title:'Faye Buyer - Footwear Buyer at River Shoes | LinkedIn',snippet:'Footwear Buyer at River Shoes in London, UK.'};
  const former={url:'https://www.linkedin.com/in/previous-employee',title:'Previous Employee - Former Buyer at River Shoes | LinkedIn',snippet:''};
  const unrelated={url:'https://example.org/contact',title:'Wrong Website - Buyer at River Shoes',snippet:''};
  const source={url:'https://example.org/industry/footwear',title:'Faye Buyer of River Shoes',snippet:'Faye Buyer buys footwear for River Shoes.'};
  const args={context:{brief:'Find UK footwear buyers.'},plan:{target:'UK footwear buyers',roleTerms:[],roles:['buyer']},modelId:'fixture',
    search:async(q,options)=>{queryLog.push({q,...options});return options.profiles?[valid,former,unrelated]:[source];},
    call:async()=>JSON.stringify({matches:[{index:0,role:'Footwear Buyer',company:'River Shoes'},{index:1,role:'Buyer',company:'River Shoes'},{index:2,role:'Buyer',company:'River Shoes'}]})};
  const result=await discoverLinkedInMarket(args);
  assert.deepEqual(result.rows.map(row=>row.person),['Faye Buyer']);
  assert.equal(result.rows[0].source,source.url);
  assert.ok(queryLog[0].q.every(q=>q.startsWith('site:linkedin.com/in/ ')));
  assert.ok(queryLog[1].q.every(q=>q.includes('"Faye Buyer"')));
  const end=await discoverLinkedInMarket({...args,page:100});
  assert.equal(end.exhausted,true);assert.equal(queryLog.length,2);
});

test('selecting LinkedIn runs one public profile discovery, skips disconnected RocketReach and stops at index exhaustion',async()=>{
  const b={id:'b',name:'Study',brief:'Find buyers at Mango',searchSources:['linkedin','rocketreach'],skillSettings:{public_research:false},researchRequestedAt:'authorized'};
  const d={bots:[b],messages:[],leads:[],events:[]};
  let indexes=0,other=0;
  const plan={mode:'people',target:b.brief,employers:['Mango'],companyContexts:[{company:'Mango'}],roles:['buyer'],question:''};
  await research('b',{requestedAt:'authorized',page:0},{edit:async fn=>fn(d),model:async()=>JSON.stringify(plan),companyProof:async()=>null,
    profilePage:async()=>{indexes++;return {searched:true,exhausted:true,rows:[],successfulQueries:['site:linkedin.com/in Mango buyer']};},
    articleSearch:async()=>{other++;throw Error('Unexpected article discovery');}});
  assert.equal(indexes,1);assert.equal(other,0);assert.equal(b.researchJob.searchSource,'linkedin');assert.equal(b.researchJob.status,'exhausted');
  assert.match(sourceStates(d,b).rocketreach.summary,/skipped/);
  assert.equal(discoverySource({searchSources:['linkedin','web']}),'web');
  assert.equal(discoverySource({searchSources:['sales_navigator','rocketreach']}),'');
});

test('an indexed Spanish current role can be checked without turning a co-worker or job listing into a match',async()=>{
  const {discoverProfilePage}=await import('../lib/company-index.mjs');
  const plan={employers:['Example'],target:'Find the footwear supply chain and purchasing team',roles:['supply chain','buyer'],roleCategory:'footwear'};
  const raw=(slug,name,snippet)=>({url:'https://es.linkedin.com/in/'+slug+'/en',title:name+' - Example | LinkedIn',snippet});
  const hits=[
    raw('current','Maria Lopez','Con más de 7 años como Footwear Production Manager en Example, contribuyo a la optimización de la cadena de suministro.'),
    raw('buyer','Amanda Suarez','Compradora de calzado en Example.'),
    raw('former','Luis Ortiz','Antes era comprador de calzado en Example.'),
    raw('post','Mateo Prada','Echa un vistazo a este empleo en Example: comprador de calzado en Example.')
  ];
  const result=await discoverProfilePage({plan,context:{company:'Example'},search:async(q,{profiles})=>profiles?hits:[]});
  assert.deepEqual(result.rows.map(r=>[r.person,r.role]),[['Maria Lopez','Footwear Production Manager'],['Amanda Suarez','Compradora de calzado']]);
});

test('company verification falls back to a catalog search and ranks the actual brand subdomain',async()=>{
  const {resolveCompanyProof}=await import('../lib/company-index.mjs');
  const sources=[],calls=[];
  const url='https://shop.example.com/shoes';
  const proof=await resolveCompanyProof({context:{company:'Example',industry:'footwear'},search:async(q,{provider})=>{
    calls.push(provider);
    if(provider==='perplexity')throw Object.assign(Error('Connection timed out'),{status:504});
    return [{url:'https://example.attacker.com/footwear',title:'Example Footwear',snippet:''},{url,title:'Footwear by Example',snippet:'Shoes by Example'}];
  },verify:async rows=>{
    sources.push(...rows.map(r=>r.source));
    return rows.map(r=>r.source===url?{status:'verified',lead:{companyVerification:{name:'Example',source:url,domain:'example.com',evidence:'Example footwear catalog'}}}:{status:'unsupported'});
  }});
  assert.deepEqual(calls,['perplexity','exa']);assert.equal(sources[0],url);assert.equal(proof.source,url);
});

test('new unverified names do not keep paying for repeated batches with zero verification checks',async()=>{
  const {advanceResearchJob,ensureResearchJob,queueResearch}=await import('../lib/research-job.mjs');
  const bot={brief:'Find footwear buyers'};ensureResearchJob(bot,'example');
  let result;
  for(let page=0;page<3;page++)result=advanceResearchJob(bot,{page,status:'page_complete',candidates:['new name '+page],
    queries:['job facet '+page],counts:{checked:0},coverage:{scopeKey:'firm',scopes:['firm'],uncheckedCandidates:true}});
  assert.equal(result.receipt.reason,'verification_stalled');assert.equal(bot.researchRequestedAt,undefined);
  queueResearch(bot,{resume:true});assert.equal(bot.researchJob.coverage.scopes['scope:firm'].uncheckedRounds,0);
});

test('a failing article provider does not discard a LinkedIn candidate that has employer evidence',async()=>{
  const b={id:'m',name:'Scout',brief:'Find buyers at Example',searchSources:['linkedin','web'],researchRequestedAt:'authorized'};
  const d={bots:[b],messages:[],leads:[],events:[]};
  const plan={mode:'people',target:b.brief,employers:['Example'],companyContexts:[{company:'Example'}],roles:['buyer']};
  const companyVerification={source:'https://example.org/company',name:'Example',evidence:'Example makes footwear.'};
  const profileHit={url:'https://es.linkedin.com/in/ada-gray',title:'Ada Gray - Footwear Buyer at Example | LinkedIn',snippet:'Footwear Buyer at Example.'};
  let paidFallbacks=0;
  await research('m',{requestedAt:'authorized',page:0},{edit:async fn=>fn(d),model:async(msg,opts)=>{if(opts.tool)paidFallbacks++;return JSON.stringify(plan);},
    companyProof:async()=>companyVerification,profilePage:async()=>({searched:true,candidateCount:1,rows:[{company:'Example',person:'Ada Gray',role:'Footwear Buyer',profileHit}]}),
    verify:async(_,rows)=>rows.map(r=>({status:'verified',lead:{...r,companyVerification,evidence:'Ada Gray buys footwear at Example.'}})),
    articleSearch:async()=>{throw Object.assign(Error('upstream timed out'),{status:504});}});
  assert.equal(paidFallbacks,0);assert.equal(b.researchJob.counts.checked,1);assert.equal(b.researchJob.qualified,1);
  assert.equal(b.prospectReviews[0].person,'Ada Gray');assert.equal(b.prospectReviews[0].reviewState,'pending');
});
