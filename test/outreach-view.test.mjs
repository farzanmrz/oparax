import test from 'node:test';
import assert from 'node:assert/strict';
import {view} from '../lib/store.mjs';

test('a delivery and provider task expose visible evidence while retaining internal dispatch state privately',()=>{
  const secret='PRIVATE_demo_internal_synthetic';
  const b={id:'bot',brief:'Find buyers at Acme',searchSources:['web','email','rocketreach'],sourceTask:{providers:{},requestId:secret},
    agentMailKey:secret,lease:{id:secret,until:'later'},rocketReachRun:{lease:secret},rocketReach:{
      searchKey:secret,resultsSignature:secret,status:'checked',receipt:{status:'checked',saved:1,source:'rocketreach',fingerprint:secret},
      results:[{id:'provider-profile',person:'Example Person',key:secret}]},lastSelectedImport:{source:'linkedin',received:1,saved:0,held:[{person:'Example Person',reason:'Needs evidence',key:secret}]}};
  const l={id:'prospect',botId:'bot',person:'Example Person',role:'Buyer',company:'Acme',linkedinUrl:'https://www.linkedin.com/in/example-person',
    linkedinEvidence:'Example Person, Buyer at Acme',companyVerification:{name:'Acme',source:'https://example.org/company',evidence:'Acme makes shoes'},
    email:'example@example.org',outreachReceipts:[{key:secret,attempt:secret,previous:secret,previousLinkedIn:secret,fingerprint:secret,status:'sent',provider:'agentmail',providerId:'provider-message'}],
    rocketReachLookup:{key:secret,connection:secret,state:'pending'},reviewDrafts:[{id:'draft-1',channel:'linkedin',linkedin:'Could I send a sample?',auth:secret}]};
  const d={bots:[b],leads:[l],internalFutureCredential:secret,rocketReach:{key:secret,state:'connected',ledger:[secret]},
    messages:[{botId:'bot',role:'assistant',details:{type:'delivery',status:'sent',providerId:'provider-message',key:secret}}],events:[]};
  const snapshot=view(d),pub=snapshot.bots[0];
  assert.doesNotMatch(JSON.stringify(snapshot),new RegExp(secret));
  assert.deepEqual(pub.searchSources,b.searchSources);assert.equal(pub.sourceStates.email.status,'needs_connection');
  assert.equal(pub.rocketReach.results[0].person,l.person);assert.equal(pub.lease.until,'later');
  assert.equal(pub.lastSelectedImport.held[0].reason,'Needs evidence');
  assert.equal(snapshot.leads[0].reviewDrafts[0].id,'draft-1');
  assert.deepEqual(snapshot.leads[0].outreachReceipts,[{status:'sent',provider:'agentmail',providerId:'provider-message'}]);
  assert.deepEqual(snapshot.leads[0].rocketReachLookup,{state:'pending'});
  assert.equal(snapshot.messages[0].details.type,'delivery');
  assert.equal(l.outreachReceipts[0].key,secret);assert.equal(b.rocketReachRun.lease,secret);
});
