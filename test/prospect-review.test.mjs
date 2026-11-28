import test from 'node:test';
import assert from 'node:assert/strict';
import {canSend} from '../lib/domain.mjs';
import {findResearchMatch,proposeProspect,reviewProspect} from '../lib/prospect-review.mjs';
import {recordProspectSource} from '../lib/provenance.mjs';
import {qualifiedForTask} from '../lib/source-states.mjs';
import {view} from '../lib/store.mjs';

const source='https://example.org/team';
const verified={person:'Ada Test',company:'Example',role:'Buyer',source,evidence:'Ada Test is a buyer at Example',fit:'Footwear buying',
  linkedinUrl:'https://www.linkedin.com/in/ada-test',linkedinEvidence:'Ada Test — Buyer, Example',
  companyVerification:{name:'Example',source,evidence:'Example footwear team'},email:''};
function workspace(){
  return {bots:['A','B'].map(id=>({id,name:id,brief:'Find buyers',active:true,autoEmail:true})),leads:[],messages:[],events:[],suppressed:[],mailbox:{email:'seller@example.org'}};
}
test('finding a verified person prompts each bot independently; saving is explicit, idempotent and does not queue outreach',()=>{
  const d=workspace(),[a,b]=d.bots;
  assert.equal(proposeProspect(d,a,{...verified,linkedinEvidence:''}),null);
  const one=proposeProspect(d,a,{...verified,subject:'model copy',body:'discard',email:'ada@example.org'});
  recordProspectSource(one.prospect,{source:'web',agentId:a.id,at:one.prospect.at,url:source});
  const again=proposeProspect(d,a,verified),other=proposeProspect(d,b,verified);
  assert.equal(again.created,false);assert.equal(again.prospect.id,one.prospect.id);
  assert.equal(other.created,true);assert.notEqual(other.prospect.id,one.prospect.id);
  assert.equal(view(d).leads.length,0);
  assert.deepEqual(qualifiedForTask(d,a),[one.prospect.id]);
  assert.throws(()=>reviewProspect(d,b.id,one.prospect.id,'save'),{status:404});
  assert.throws(()=>reviewProspect(workspace(),a.id,one.prospect.id,'save'),{status:404});
  reviewProspect(d,a.id,one.prospect.id,'save');reviewProspect(d,a.id,one.prospect.id,'save');
  const desk=view(d);
  assert.equal(desk.bots[0].prospectReviews.length,0);assert.equal(desk.bots[1].prospectReviews.length,1);
  assert.equal(desk.leads.length,1);assert.equal(desk.leads[0].botId,a.id);
  assert.equal(desk.leads[0].body,undefined);assert.equal(desk.leads[0].status,'research');assert.equal(canSend(d,a,d.leads[0]),false);
  assert.equal(findResearchMatch(d,a,verified).id,one.prospect.id);
  assert.equal(desk.leads[0].discoverySources[0].source,'web');
  reviewProspect(d,b.id,other.prospect.id,'skip');reviewProspect(d,b.id,other.prospect.id,'skip');
  assert.equal(proposeProspect(d,b,verified).created,false);
  assert.equal(view(d).bots[1].prospectReviews.length,0);
  assert.throws(()=>reviewProspect(d,b.id,other.prospect.id,'save'),{status:409});
  assert.throws(()=>reviewProspect(d,a.id,one.prospect.id,'skip'),{status:409});
});
test('a previous bot’s saved prospect remains usable; another bot can explicitly save the same person without an email',()=>{
  const d=workspace(),[a,b]=d.bots;
  d.leads.push({...verified,id:'old',botId:a.id,body:'existing draft',linkedin:'existing note'});
  const existing=proposeProspect(d,a,verified),proposal=proposeProspect(d,b,verified);
  assert.equal(existing.created,false);assert.equal(existing.prospect.id,'old');
  assert.equal(proposal.created,true);assert.equal(d.leads[0].matchedBotIds,undefined);
  reviewProspect(d,b.id,proposal.prospect.id,'save');
  assert.deepEqual(d.leads.map(p=>[p.botId,p.email]),[[b.id,''],[a.id,'']]);
  assert.equal(d.leads[1].body,'existing draft');assert.equal(d.leads[0].body,undefined);
});
