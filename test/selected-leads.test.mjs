import test from 'node:test';
import assert from 'node:assert/strict';
import {importSelectedLeads} from '../lib/selected-leads.mjs';
import {reviewProspect} from '../lib/prospect-review.mjs';
import {isPublishedProspect} from '../lib/qualification.mjs';

const person={person:'Jane Ruiz',role:'Footwear Buyer',company:'Example',linkedinUrl:'https://www.linkedin.com/in/jane-ruiz',sourceUrl:'https://example.org/team'};
const data=()=>{
  const brief='Find footwear buyers at Example.';
  const plan={target:brief,roleCategory:'footwear',roles:['Buyer'],roleTerms:['buying'],employers:['Example'],companyContexts:[{company:'Example',industry:'footwear'}]};
  const agent={id:'a',brief,searchSource:'sales_navigator',researchJob:{plan,planSignature:JSON.stringify([brief,[]])}};
  return {bots:[agent],leads:[],events:[],messages:[],suppressed:[]};
};
function fixture(){
  const d=data(),checks=[];
  const deps={workspaceId:()=> 'owner',desktop:async({ownerId,agentId})=>({state:ownerId==='owner'&&agentId==='a'?'owner_opened':'unconfirmed'}),
    read:async()=>({data:d}),edit:async fn=>fn(d),findSources:async()=>[],
    findProfiles:async()=>({results:[{url:person.linkedinUrl,title:'Jane Ruiz - Footwear Buyer at Example | LinkedIn',snippet:'Footwear Buyer at Example'}]}),
    verify:async(id,rows)=>rows.map(row=>{
      checks.push(row);
      return {status:'verified',lead:{...row,source:row.source,evidence:'Jane Ruiz, Footwear Buyer at Example',
        companyVerification:{name:'Example',source:row.source,evidence:'Example footwear'},linkedinUrl:person.linkedinUrl,
        linkedinEvidence:'Jane Ruiz - Footwear Buyer at Example'}};
    })
  };
  return {d,deps,checks,run:(people,source='sales_navigator')=>importSelectedLeads('a',{source,people},deps)};
}

test('user selections require a real owner-opened VM and the exact active source',async()=>{
  const f=fixture();
  await assert.rejects(f.run([person],'linkedin'),/source has changed/);
  f.deps.desktop=async()=>({state:'unconfirmed'});
  await assert.rejects(f.run([person]),/Open your workspace computer/);
  assert.equal(f.checks.length,0);assert.equal(f.d.leads.length,0);
});

test('selected person is independently verified once per bot, retained for an explicit save, and never queued for outreach',async()=>{
  const f=fixture();
  await f.run([{...person,email:'arbitrary@example.test',linkedinEvidence:'caller data',companyVerification:{evidence:'caller data'}}]);
  assert.equal(f.checks.length,1);assert.equal(f.checks[0].profileHit.snippet,'Footwear Buyer at Example');
  assert.equal(f.d.bots[0].lastSelectedImport.proposed,1);assert.equal(f.d.bots[0].lastSelectedImport.saved,0);assert.equal(f.d.leads.length,0);
  const lead=f.d.bots[0].prospectReviews[0];assert.ok(isPublishedProspect(lead));assert.equal(lead.email,'');assert.equal(lead.reviewState,'pending');assert.equal(lead.draft,undefined);
  assert.equal(lead.selectedSources[0].source,'sales_navigator');assert.equal(f.d.messages.length,1);
  await f.run([person]);
  assert.equal(f.d.bots[0].lastSelectedImport.existing,1);assert.equal(f.d.bots[0].prospectReviews.length,1);
  assert.equal(f.d.leads.length,0);
  reviewProspect(f.d,'a',lead.id,'save');
  await f.run([person]);
  assert.equal(f.d.bots[0].lastSelectedImport.existing,1);assert.equal(f.d.bots[0].prospectReviews.length,0);
  assert.equal(f.d.leads.length,1);assert.equal(f.d.leads[0].id,lead.id);assert.equal(f.d.leads[0].status,'research');
});

test('unconfirmed, intake-only, wrong role, and namesake records are held and never trigger a broad fallback',async()=>{
  const f=fixture();
  f.deps.findProfiles=async()=>({results:[{url:'https://www.linkedin.com/in/other-jane',title:'Jane Ruiz - Example | LinkedIn'}]});
  await f.run([person,{...person,company:'Different'}, {...person,role:'HR lead'},
    {person:'Kim',role:'Buyer',company:'Example',salesNavigatorUrl:'https://www.linkedin.com/sales/lead/xyzABC,123?trk=secret'}]);
  const receipt=f.d.bots[0].lastSelectedImport;assert.equal(receipt.received,4);assert.equal(receipt.saved,0);
  assert.equal(receipt.held.length,4);assert.equal(f.checks.length,0);assert.equal(f.d.leads.length,0);
  assert.ok(f.d.bots[0].selectedLeadsPending.some(p=>p.person==='Kim'&&!p.salesNavigatorUrl.includes('?')));
  assert.deepEqual(f.d.bots[0].selectedSourceLeases,{});
});

test('provider failure retains selected rows, and a source change prevents stale publication',async()=>{
  const f=fixture();f.deps.verify=async()=>{throw Error('provider failure');};
  await f.run([person]);
  assert.match(f.d.bots[0].lastSelectedImport.held[0].reason,/unavailable/);assert.equal(f.d.leads.length,0);
  f.deps.verify=async()=>{f.d.bots[0].searchSource='web';return [];};
  await assert.rejects(f.run([person]),/changed/);assert.equal(f.d.leads.length,0);
  assert.deepEqual(f.d.bots[0].selectedSourceLeases,{});
});

test('a private selection can verify while the public search retains its own lease',async()=>{
  const f=fixture(),b=f.d.bots[0];
  b.searchSources=['web','sales_navigator'];b.searchSource='web';
  b.lease={id:'active-web-page',until:new Date(Date.now()+60000).toISOString()};
  await f.run([person]);
  assert.equal(b.lease.id,'active-web-page');
  assert.equal(b.lastSelectedImports.sales_navigator.proposed,1);
  assert.equal(b.prospectReviews[0].discoverySources[0].source,'sales_navigator');
});

test('selection does not publish over a maximum filled concurrently by another source',async()=>{
  const f=fixture(),b=f.d.bots[0],verify=f.deps.verify;
  b.researchLimitInput={brief:b.brief,instructions:['Find only up to 1 buyer.','Find 1 buyer.']};
  f.deps.verify=async(...args)=>{
    const result=await verify(...args);
    b.researchJob.qualifiedIds=['verified-by-another-source'];return result;
  };
  await f.run([person]);
  assert.equal(f.d.leads.length,0);assert.equal(b.lastSelectedImport.skippedAtLimit,1);assert.equal(b.lastSelectedImport.held.length,0);
});
