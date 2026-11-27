import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublishedProspect} from '../lib/qualification.mjs';
import {view} from '../lib/store.mjs';
import {canSend} from '../lib/domain.mjs';

const lead={id:'a',botId:'w',person:'Sam Green',role:'Buyer',company:'North Footwear',email:'sam@example.org',stage:0,status:'queued',due:'2020-01-01',linkedinUrl:'https://uk.linkedin.com/in/sam-green',linkedinEvidence:'Sam Green — Buyer, North Footwear',companyVerification:{name:'North Footwear',source:'https://example.org/staff',evidence:'Footwear buyer Sam Green at North Footwear'}};
test('the real ledger and email eligibility both require a person, employer proof, and a matched profile',()=>{
  const pending=[{...lead,linkedinUrl:''},{...lead,person:''},{...lead,companyVerification:null},{...lead,company:'Similar Shoes'},{...lead,linkedinEvidence:''},{...lead,linkedinUrl:'https://linkedin.com/company/north'}];
  const d={leads:[...pending,lead],mailbox:{email:'a@example.org'},suppressed:[]},bot={active:true,autoEmail:true,id:'w'};
  assert.deepEqual(view(d).leads,[lead]);
  assert.equal(isPublishedProspect(lead),true);
  for(const p of pending){ assert.equal(isPublishedProspect(p),false);assert.equal(canSend(d,bot,p),false);}
  assert.equal(canSend(d,bot,lead),true);
});
test('a signed-in dashboard exposes progress but keeps work-in-progress identities and dispatch tokens private',()=>{
  const summary=view({leads:[],bots:[{name:'A',researchWake:{digest:'hidden'},researchJob:{goal:50,qualified:2,pages:1,status:'continuing',seen:['private person'],pending:[{person:'unmatched'}],qualifiedIds:['some-id']}}]});
  assert.equal(summary.bots[0].researchJob.qualified,2);
  assert.doesNotMatch(JSON.stringify(summary),/hidden|private person|unmatched|some-id/);
});
