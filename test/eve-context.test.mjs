import test from 'node:test';
import assert from 'node:assert/strict';
import {eveSalesContext,evePlaybooks} from '../lib/eve-context.mjs';
import {workspaceId} from '../lib/store.mjs';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',botId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const other='cccccccc-cccc-4ccc-8ccc-cccccccccccc',assigned='11111111-1111-4111-8111-111111111111',unassigned='22222222-2222-4222-8222-222222222222';
const requestId='existing-turn-0001',sessionId='wrun_real-test';
const principal={authenticator:'oparax',principalType:'user',principalId:uid+'/'+botId,attributes:{workspace:uid,bot:botId,requestId}};
const context=()=>({session:{id:sessionId,auth:{current:structuredClone(principal),initiator:structuredClone(principal)}}});
const contact=(id,name,owner,slug)=>({id,botId:owner,person:name,company:'Sample',role:'Designer',source:'https://sample.test/team',
  linkedinUrl:'https://www.linkedin.com/in/'+slug,linkedinEvidence:'PRIVATE EVIDENCE BODY',evidence:'PRIVATE ARTICLE',email:slug+'@sample.test',
  body:'PRIVATE OUTBOUND TEXT',companyVerification:{name:'Sample',source:'https://sample.test/industry',evidence:'PRIVATE COMPANY PROOF'}});
function fixture(message='Write a LinkedIn draft for Jane Cole'){
  const agent={id:botId,name:'Account bot',brief:'Find designers',modelPreference:'grok',customSkillIds:[assigned],searchSources:['rocketreach','web'],
    researchJob:{status:'running',pending:[{person:'PRIVATE_PENDING'}]},lastRun:{summary:'RAW RESEARCH TEXT'},eveBinding:{sessionId},
    eveInputs:{[requestId]:{command:{requestId,message}}}};
  const d={bots:[agent],businessMemory:{company:'Product Studio',productsServices:'Design consulting',secret:'BUSINESS_SECRET'},
    mailbox:{email:'owner-private@sample.test',secret:'MAIL_SECRET'},rocketReach:{key:'ENCRYPTED_KEY'},
    customSkills:[{id:assigned,name:'Short outreach',instructions:'Use one short question.'},{id:unassigned,name:'OTHER_BOT_PLAYBOOK',instructions:'SECRET_OTHER_PLAYBOOK'}],
    messages:[{role:'user',botId,content:'Keep the first drafts short.'},{role:'assistant',botId,content:'PRIVATE OUTBOUND TEXT',details:{type:'prospectDraft',prospectId:'jane',channel:'linkedin',body:'PRIVATE OUTBOUND TEXT'}},
      {role:'assistant',botId:other,content:'OTHER BOT TRANSCRIPT'}, {role:'assistant',botId,content:'https://example.test/ PRIVATE ARTICLE'}],
    leads:[contact('jane','Jane Cole',botId,'jane-cole'),contact('other','Jane Other',other,'jane-other'),{...contact('unverified','Jane Guess',botId,'jane-guess'),companyVerification:null}]};
  const deps={read:async()=>{assert.equal(workspaceId(),uid);return {data:d};}};
  return {agent,d,deps};
}
test('signed turn returns scoped sender, current permission states and minimized named contacts and historical draft references',async()=>{
  const {deps}=fixture(),result=await eveSalesContext(context(),deps);
  assert.equal(result.ownerMessage,'Write a LinkedIn draft for Jane Cole');
  assert.equal(result.businessProfile.company,'Product Studio');assert.equal(result.agent.modelPreference,'grok');
  assert.deepEqual(result.prospects,[{id:'jane',person:'Jane Cole',company:'Sample',role:'Designer',channels:{email:true,linkedin:true}}]);
  assert.deepEqual(result.history,[{role:'user',content:'Keep the first drafts short.'},{role:'assistant',type:'prospectDraft',prospectId:'jane',channel:'linkedin'}]);
  assert.deepEqual(result.playbookNames,['Short outreach']);assert.equal(result.connectors.find(c=>c.id==='rocketreach').status,'connected');
  assert.ok(result.skills.find(s=>s.id==='draft_outreach').enabled);
  assert.doesNotMatch(JSON.stringify(result),/SECRET|PRIVATE|ENCRYPTED|UNVERIFIED|OUTBOUND TEXT|ARTICLE|OTHER_BOT|OTHER BOT|owner-private|@sample.test|one short question|Jane Other|Jane Guess|RAW RESEARCH TEXT/);
  assert.deepEqual(await evePlaybooks(context(),deps),[{id:assigned,name:'Short outreach',instructions:'Use one short question.'}]);
});
test('stale session, missing command or mismatched principal cannot read seller data or assigned playbooks',async()=>{
  const {agent,deps}=fixture();
  for(const lookup of [eveSalesContext,evePlaybooks]){
    const wrong=context();wrong.session.id='wrun_expired';
    await assert.rejects(lookup(wrong,deps),/does not belong/);
    const spoof=context();spoof.session.auth.current.principalId=other+'/'+botId;
    await assert.rejects(lookup(spoof,deps),/authorized/);
    const readOnly=context();delete readOnly.session.auth.current.attributes.requestId;
    await assert.rejects(lookup(readOnly,deps),/authorized/);
  }
  delete agent.eveInputs[requestId];await assert.rejects(eveSalesContext(context(),deps),/does not belong/);
});
test('an unrelated existing-bot request has no prospect rows when no history reference or list was requested',async()=>{
  const {d,deps}=fixture('Tell me about our products');d.messages=[];
  assert.equal((await eveSalesContext(context(),deps)).prospects.length,0);
});
