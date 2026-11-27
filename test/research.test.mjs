import test from 'node:test';
import assert from 'node:assert/strict';
import {research} from '../lib/agent.mjs';
import {candidateRows,validatePlan} from '../lib/research.mjs';

const brief='Find sourcing staff, footwear designers and buyers at Barbour.';
const target='Find named Barbour sourcing staff, footwear designers and buyers.';
const plan={mode:'people',target,employers:['Barbour'],question:''};
const person={company:'Barbour',person:'Sample Person',role:'Footwear Designer',source:'https://example.org/footwear',quote:'Sample Person, Footwear Designer at Barbour'};
const verified=[{status:'verified',lead:person}];

function fixture({answers,checks=verified,clarifications=[],existing=[]}) {
  const b={id:'sample',name:'UK sourcing',brief,active:false,autoEmail:false,cadence:24,clarifications,researchRequestedAt:'request'};
  const data={bots:[b],leads:existing,messages:[],events:[],suppressed:[]};
  const requests=[],pages=[];
  const services={edit:async fn=>fn(data),model:async(messages,options)=>{
    requests.push({messages,options});const next=answers.shift();
    if(next instanceof Error)throw next;
    return JSON.stringify(next);
  },verify:async(_,rows)=>{pages.push(rows);return checks;}};
  return {b,data,requests,pages,run:(options={requestedAt:'request'})=>research('sample',options,services)};
}

test('clear named-employer brief finds fellow employees and keeps outreach paused',async()=>{
  const f=fixture({answers:[plan,{candidates:[person]}],
    existing:[{company:'Barbour',person:'Other Person',botId:'sample'}]});
  await f.run();
  assert.equal(f.requests[1].options.tool.type,'vercel:parallel_search');
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
