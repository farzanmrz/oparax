import test from 'node:test';
import assert from 'node:assert/strict';
import {companyQueries,discoverProfilePage,resolveCompanyProof} from '../lib/company-index.mjs';

const firm='Northwind';
const plan={mode:'people',target:'Find buyers, sourcing staff and designers at Northwind, the footwear company.',employers:[firm],roles:['buyer','designer','sourcing']};
const context={company:firm,industry:'footwear'};
const profile=(slug,title,snippet='')=>({url:'https://uk.linkedin.com/in/'+slug,title,snippet});
const anchor={name:firm,source:'https://northwind.example/about',evidence:'Northwind designs footwear.'};
async function discover(hits,extra={}){
  return discoverProfilePage({plan,context:{...context,companyProof:anchor},timeout:5000,
    search:async(q,opts)=>opts.profiles?hits:[],call:async()=>JSON.stringify({items:[]}),...extra});
}

test('multiple pages cover all requested roles with distinct index queries',()=>{
  const all=[];
  for(let i=0;i<25;i++){const p=companyQueries(plan,context,i); if(p.exhausted)break; all.push(...p.queries);}
  assert.ok(all.length>20);
  assert.equal(all.length,new Set(all).size);
  assert.deepEqual(companyQueries(plan,context,0).queries.map(s=>s.split(' ').at(-1)),['sourcing','buyer','designer']);
  assert.ok(all.every(q=>q.includes(firm)));
  assert.ok(companyQueries(plan,context,200).exhausted);
});

test('candidate LinkedIn URL and evidence are taken from raw results; separate person source optional',async()=>{
  const h=profile('shoes','Alice Gray - Senior Buyer at Northwind | LinkedIn','Footwear procurement.');
  const page=await discover([h],{articleSearch:async()=>[{url:'https://trade.example/interview',title:'Interview with Alice Gray',snippet:'Alice Gray is Senior Buyer at Northwind.'}]});
  assert.equal(page.rows[0].person,'Alice Gray');assert.equal(page.rows[0].role,'Senior Buyer');
  assert.equal(page.rows[0].linkedinUrl,'https://www.linkedin.com/in/shoes');assert.equal(page.rows[0].source,'https://trade.example/interview');
  assert.equal(page.rows[0].companyVerification,anchor);assert.ok(page.rows[0].linkedinEvidence.includes('Senior Buyer at Northwind'));
  assert.deepEqual((await discover([h],{visited:page.checkedKeys})).rows,[]);
});
test('accepts current employer with local role attribution and punctuation',async()=>{
  const results=await discover([profile('person-b','Hana Liu - Northwind | LinkedIn',
    'Design Manager at Northwind, responsible for womenswear collections.')]);
  assert.equal(results.rows[0].role,'Design Manager');assert.equal(results.rows[0].source,'');
});
test('rejects invented roles, former roles, other employers and unrelated activity',async()=>{
  const rows=[
    profile('alice','Alice Stone - Northwind Capital | LinkedIn','Senior Buyer at Northwind Capital'),
    profile('alan','Alan Blue - Northwind | LinkedIn','## Activity\nCEO Alan Green reposted this. Buyer at Northwind.'),
    profile('jane','Jane Green - Former Designer at Northwind | LinkedIn','Previously designer at Northwind.'),
    {url:'https://linkedin.com/company/northwind',title:'Northwind - Buyer Designer',snippet:'Buyer at Northwind.'},
    profile('sarah','Sarah Brown - Northwind | LinkedIn','Northwind role undisclosed.')
  ];
  const result=await discover(rows,{call:async()=>JSON.stringify({items:rows.map((_,index)=>({index,role:'Designer',person:'Fake',linkedinUrl:'https://linkedin.com/in/fake'}))})});
  assert.deepEqual(result.rows,[]);assert.ok(result.unresolved.length);
});
test('distinct raw-provider fallback and company source provenance',async()=>{
  const h=profile('test-c','Leah Mint - Buyer at Northwind | LinkedIn');
  const result=await discover([], {search:async(_,options)=>{if(options.profiles&&options.provider==='exa')return [h];if(options.profiles)throw Error('rate limited');return [];}});
  assert.deepEqual(result.rows.map(x=>x.person),['Leah Mint']);assert.equal(result.searches,5);
  const checked=[];
  const proof=await resolveCompanyProof({context,timeout:2000,search:async()=>[{title:'Northwind footwear',url:anchor.source,snippet:anchor.evidence}],verify:async rows=>{checked.push(...rows);return [{status:'verified',lead:{companyVerification:anchor}}]}});
  assert.equal(checked[0].kind,'company');assert.equal(proof,anchor);
  assert.equal(await resolveCompanyProof({context,search:async()=>[{title:'Northwind',url:'https://rocketreach.co/northwind',snippet:'Northwind'}],verify:()=>assert.fail()}),null);
});
test('search callbacks separate submitted and provider-reported queries without exposing model output',async()=>{
  const events=[];
  await discover([], {search:async(q,opts)=>{
    if(opts.profiles){
      if(q[0].endsWith('designer'))opts.onExecuted?.(['Northwind fashion designer profiles']);
      return [profile('lee','Amy Lee - Footwear Designer at Northwind | LinkedIn')];
    }return [];
  },onSearch:e=>events.push(e)});
  assert.deepEqual(events.map(e=>[e.provider,e.purpose,e.phase]),[
    ['perplexity','profiles','submitted'],['perplexity','profiles','executed'],['perplexity','corroboration','submitted']]);
  assert.ok(events[1].queries.includes('Northwind fashion designer profiles'));
});
test('thin employer-only search discovers corroborated titles across indexes and keeps uninvestigated profiles eligible',async()=>{
  const names=['Ada','Beth','Cara','Dina','Ella','Fay','Gia','Hope','Ira','Jia','Kim','Lila','Mia','Nia','Opal','Pia','Quinn','Rae','Sara','Tara','Uma','Vera','Wren','Xia','Yana','Zara'];
  const skinny=Array.from({length:45},(_,i)=>profile('prospect-'+i,names[i%26]+' '+(i<26?'Gray':'Green')+' - Northwind | LinkedIn','Northwind · United Kingdom'));
  const calls=[];
  const page=await discover(skinny,{limit:50,search:async(queries,opts)=>{
    calls.push([opts.provider,opts.profiles,queries.length]);
    if(opts.provider==='exa')return [profile('prospect-0','Ada Gray - Footwear Designer at Northwind | LinkedIn','Official shoe designer.')];
    if(!opts.profiles)return [{url:'https://shoe.example/bio',title:'Beth Gray interviewed',snippet:'Beth Gray, Senior Buyer at Northwind, discusses footwear.'}];
    if(queries.length>1)return [profile('prospect-2','Cara Gray - Northwind | LinkedIn','Title: Senior Buyer · Experience: Northwind')];
    return skinny;
  }});
  assert.ok(calls.some(c=>c[0]==='exa'));
  assert.equal(page.rows.find(x=>x.person==='Ada Gray').role,'Footwear Designer');
  assert.equal(page.rows.find(x=>x.person==='Beth Gray').source,'https://shoe.example/bio');
  assert.equal(page.rows.find(x=>x.person==='Cara Gray').role,'Senior Buyer');
  assert.equal(page.diagnostics.thinProfiles,45);assert.equal(page.diagnostics.namedLookups,12);
  assert.ok(page.diagnostics.deferred>20);assert.ok(page.checkedKeys.length<18);
  assert.ok(!page.checkedKeys.includes('https://www.linkedin.com/in/prospect-40'));
  assert.equal(new Set(page.rows.map(r=>r.linkedinUrl)).size,page.rows.length);
});
