import test from 'node:test';
import assert from 'node:assert/strict';
import {rocketReachAction,runRocketReach} from '../lib/rocketreach.mjs';
import {view} from '../lib/store.mjs';

const brief='Find 50 buyers at Example.',agentId='agent-a';
const plan={target:brief,goal:50,roles:['Buyer'],roleTerms:['Buyer'],employers:['Example'],companyContexts:[{company:'Example',domain:'example.test'}]};
const raw=i=>({id:i,name:'Buyer '+i,current_employer:'Example',current_title:'Buyer',linkedin_url:'https://www.linkedin.com/in/buyer-'+i});
const contact=(i=1)=>({id:'lead-'+i,botId:agentId,person:'Buyer '+i,role:'Buyer',company:'Example',email:'',status:'research',stage:0,
  linkedinUrl:raw(i).linkedin_url,linkedinEvidence:'Publicly verified profile '+i,source:'https://example.test/team',fit:'Buyer at Example',
  companyVerification:{name:'Example',domain:'example.test',source:'https://example.test/team',evidence:'Independently verified role and employer.'}});
function fixture(){
  const d={bots:[{id:agentId,name:'Scout',brief,searchSources:['web','rocketreach'],researchJob:{plan,planSignature:JSON.stringify([brief,[]])}}],leads:[],messages:[],events:[],suppressed:[],
    rocketReach:{key:'sealed-key',connection:'instance',state:'connected',accountId:'999'}};
  const calls=[],batches=[];
  const state={reply:()=>({profiles:[]})};
  const deps={plan,read:async()=>({data:structuredClone(d)}),edit:async fn=>{const copy=structuredClone(d),result=fn(copy);Object.assign(d,copy);return result;},
    seal:()=> 'fixture-ciphertext',unseal:()=> 'valid-test-authentication-credential',
    fetch:async(url,opts)=>{calls.push({url,opts});return Response.json(url.pathname.endsWith('/account/')?await (state.account||(()=>({id:999,state:'registered',credit_usage:[]})))(url):await state.reply(url,opts));},
    verifySelections:async(id,rows)=>{batches.push(rows.length);return {verified:rows.map(row=>({record:{...contact(Number(row.id)),...row}})),held:[]};}};
  const action=(action,props={})=>rocketReachAction(agentId,{action,requestId:crypto.randomUUID(),...props},deps);
  return {d,deps,state,calls,batches,action,run:(p={})=>runRocketReach(agentId,{requestId:'one-approved-source-task',...p},deps)};
}

test('manual search submits only a bounded company/current title query and imports only independently qualified IDs',async()=>{
  const f=fixture();f.state.reply=()=>({profiles:[{...raw(1),phone:'private',emails:[{email:'wrong@example.test'}]},raw(2)]});
  const requestId=crypto.randomUUID();
  await f.action('rocketReachSearch',{company:'Example',role:'Buyer',requestId});
  await f.action('rocketReachSearch',{company:'Example',role:'Buyer',requestId});
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].url.href,'https://api.rocketreach.co/api/v2/person/search');
  assert.deepEqual(JSON.parse(f.calls[0].opts.body),{query:{current_title:['Buyer'],current_employer:['Example']},start:1,page_size:5});
  assert.equal(f.calls[0].opts.headers['Api-Key'],'valid-test-authentication-credential');
  assert.equal(f.d.leads.length,0);assert.ok(!JSON.stringify(f.d.bots[0].rocketReach).includes('wrong@example.test'));
  await assert.rejects(f.action('rocketReachImport',{profileIds:['arbitrary']}),/latest/);
  await f.action('rocketReachImport',{profileIds:['1']});await f.action('rocketReachImport',{profileIds:['1']});
  assert.equal(f.calls.length,1);assert.equal(f.d.leads.length,1);
  assert.equal(f.d.leads[0].email,'');assert.equal(f.d.leads[0].status,'research');
  assert.equal(f.d.leads[0].discoverySources[0].source,'rocketreach');
  assert.equal(f.d.bots[0].rocketReach.receipt.existing,1);
});

test('unattended 50-person goal verifies in checkpointed groups without lookups, fetches subsequent source page only for remainder',async()=>{
  const f=fixture();
  f.state.reply=(url,options)=>{
    assert.equal(url.pathname,'/api/v2/person/search');
    const {page_size,start}=JSON.parse(options.body);
    return {pagination:{total:57},profiles:Array.from({length:Math.min(page_size,58-start)},(_,i)=>raw(i+start))};
  };
  const confirm=f.deps.verifySelections;
  f.deps.verifySelections=async(id,rows)=>{
    const good=rows.filter(row=>Number(row.id)>7);const batch=await confirm(id,good);
    return {...batch,held:rows.filter(row=>Number(row.id)<=7)};
  };
  let more=true,n=0;
  while(more&&n++<10)more=(await f.run()).continuing;
  assert.equal(more,false);assert.equal(n,6);assert.equal(f.d.leads.length,50);
  assert.deepEqual(f.calls.map(c=>{const {page_size,start}=JSON.parse(c.opts.body);return [page_size,start];}),[[50,1],[7,51]]);
  assert.ok(f.batches.every(n=>n<=6));assert.equal(f.d.bots[0].rocketReach.receipt.held,7);
  assert.equal(f.d.bots[0].rocketReach.receipt.status,'goal_met');assert.equal((await f.run()).continuing,false);
  assert.equal(f.calls.length,2);assert.ok(f.d.leads.every(l=>!l.email&&l.status==='research'));
});

test('disconnected or unselected sources, reached goals and workspace allowance make no provider call',async()=>{
  const f=fixture();f.d.bots[0].searchSources=['web'];
  await assert.rejects(f.run(),/Select RocketReach/);
  f.d.bots[0].searchSources=['rocketreach'];delete f.d.rocketReach.key;await assert.rejects(f.run(),/Connect a RocketReach/);
  f.d.rocketReach.key='key';assert.equal((await f.run({remaining:0})).continuing,false);
  f.d.rocketReach.ledger=Array.from({length:10},(_,i)=>({kind:'search',at:new Date().toISOString(),key:'k'+i}));
  await assert.rejects(f.action('rocketReachSearch'),/10 RocketReach searches/);assert.equal(f.calls.length,0);
});

test('provider pending lookup resumes by stored ID and only saves an SMTP-valid current professional address on exact verified profile',async()=>{
  const f=fixture();f.d.leads.push(contact());
  f.state.reply=url=>url.pathname.endsWith('lookup')?{id:1,status:'progress'}:[{...raw(1),status:'complete',current_employer_domain:'example.test',emails:[
    {type:'personal',smtp_valid:'valid',email:'private@example.test'},
    {type:'professional',smtp_valid:'accept-all',email:'guessed@example.test'},
    {type:'professional',smtp_valid:'valid',email:'former@old-company.test'},
    {type:'professional',smtp_valid:'valid',email:'buyer@example.test'}]}];
  await f.action('rocketReachEnrich',{leadId:'lead-1'});
  assert.equal(f.d.leads[0].rocketReachLookup.state,'pending');assert.equal(f.d.leads[0].email,'');
  assert.equal(f.calls[1].url.searchParams.get('lookup_type'),'standard');assert.equal(f.calls[1].url.searchParams.get('return_cached_emails'),'false');
  f.d.leads[0].rocketReachLookup.checkedAt='2000-01-01T00:00:00Z';
  await f.action('rocketReachEnrich',{leadId:'lead-1'});
  assert.deepEqual(f.calls.map(c=>c.url.pathname),['/api/v2/account/','/api/v2/person/lookup','/api/v2/person/checkStatus']);
  assert.equal(f.d.leads[0].email,'buyer@example.test');assert.equal(f.d.leads[0].emailEvidence.source,'rocketreach');
  assert.equal(f.d.leads[0].status,'research');assert.equal(f.d.rocketReach.ledger.filter(r=>r.kind==='lookup').length,1);
});

test('wrong employer, mismatched profile, suppression and professional guesses never attach an email',async()=>{
  for(const overrides of [{current_employer:'Example EHS'},{linkedin_url:raw(2).linkedin_url},{name:'Other Person'},
    {emails:[{type:'professional',smtp_valid:'unknown',email:'buyer@example.test'}]},{emails:[{type:'professional',smtp_valid:'valid',email:'hello@example.test'}]}]){
    const f=fixture();f.d.leads.push(contact());f.state.reply=()=>({...raw(1),status:'complete',emails:[{type:'professional',smtp_valid:'valid',email:'buyer@example.test'}],...overrides});
    await f.action('rocketReachEnrich',{leadId:'lead-1'});
    assert.equal(f.d.leads[0].email,'');assert.equal(f.d.bots[0].rocketReach.receipt.status,'no_work_email');
  }
  const f=fixture();const lead=contact();lead.status='stopped';f.d.leads.push(lead);
  await assert.rejects(f.action('rocketReachEnrich',{leadId:'lead-1'}),/stopped/);assert.equal(f.calls.length,0);
});

test('uncertain provider response cannot double-charge a concurrent or retried prospect lookup',async()=>{
  const f=fixture();f.d.leads.push(contact());f.state.reply=()=>{throw Error('sensitive API error string');};
  const call=()=>f.action('rocketReachEnrich',{leadId:'lead-1'});
  await Promise.allSettled([call(),call()]);
  await assert.rejects(call(),/was submitted/);
  assert.equal(f.calls.length,2);assert.equal(f.d.leads[0].rocketReachLookup.state,'unknown');assert.doesNotMatch(JSON.stringify(f.d.bots),/sensitive API/);
});

test('account-only key validation excludes provider payload; reconnect preserves daily limits',async()=>{
  const f=fixture();f.state.account=()=>({id:999,state:'registered',email:'private@example.test',credit_usage:[]});
  f.d.rocketReach.ledger=[{kind:'search',key:'internal-ledger',at:new Date().toISOString()}];
  await f.action('rocketReachConnect',{apiKey:'user-secret-for-test'});
  assert.equal(f.calls[0].url.pathname,'/api/v2/account/');assert.equal(f.d.rocketReach.key,'fixture-ciphertext');
  assert.doesNotMatch(JSON.stringify(f.d),/user-secret-for-test|private@example.test/);
  await f.action('rocketReachDisconnect');assert.ok(!f.d.rocketReach.key);
  await f.action('rocketReachConnect',{apiKey:'user-secret-for-test'});assert.equal(f.d.rocketReach.ledger.length,1);
  const safe=view(f.d);
  assert.equal(safe.rocketReach.connected,true);assert.doesNotMatch(JSON.stringify(safe),/fixture-ciphertext|internal-ledger|user-secret-for-test/);
});

test('provider credit, rate and permission errors are actionable and never cause an automatic retry or web search',async()=>{
  for(const [status,expected] of [[402,/insufficient credits/],[403,/plan permissions/],[429,/rate-limited/]]){
    const f=fixture();let calls=0;
    f.deps.fetch=async()=>{calls++;return Response.json({error:'sensitive provider data'},{status});};
    await assert.rejects(f.run(),expected);assert.equal(calls,1);assert.equal(f.d.bots[0].rocketReach.receipt.status,'failed');
    assert.doesNotMatch(f.d.bots[0].rocketReach.receipt.message,/sensitive/);
    assert.equal((await f.run()).continuing,false);assert.equal(calls,1);assert.equal(f.d.leads.length,0);
  }
});

test('a credit preflight cannot trigger a paid lookup when a required allowance is exhausted',async()=>{
  for(const credit of [{credit_type:'standard',allocated:5,remaining:0},{credit_type:'person_export',allocated:10,remaining:0}]){
    const f=fixture();f.d.leads.push(contact());f.state.account=()=>({id:999,credit_usage:[credit]});
    await assert.rejects(f.action('rocketReachEnrich',{leadId:'lead-1'}),/credits remaining/);
    assert.deepEqual(f.calls.map(c=>c.url.pathname),['/api/v2/account/']);
    assert.equal(f.d.rocketReach.ledger.length,0);assert.equal(f.d.leads[0].rocketReachLookup.state,'declined');
  }
});

test('invalidated keys are disconnected and an exhausted workspace allowance yields a visible partial receipt',async()=>{
  const f=fixture();f.deps.fetch=async()=>Response.json({}, {status:401});
  await assert.rejects(f.run(),/rejected this API key/);
  assert.equal(view(f.d).rocketReach.connected,false);
  const g=fixture();g.d.rocketReach.ledger=Array.from({length:10},(_,i)=>({kind:'search',key:'k'+i,at:new Date().toISOString()}));
  assert.equal((await g.run()).continuing,false);assert.equal(g.calls.length,0);
  assert.equal(g.d.bots[0].rocketReach.receipt.status,'partial');
  assert.match(g.d.bots[0].rocketReach.receipt.message,/00:00 UTC/);
});

test('industry and geography filters are grounded in the owner brief and a superseded task cannot submit a page',async()=>{
  const f=fixture(),b=f.d.bots[0];delete f.deps.plan;
  b.brief='Find three buyers at footwear manufacturers in Philadelphia.';
  f.deps.model=async()=>JSON.stringify({mode:'people',target:b.brief,roles:['Buyer'],employers:[],countPhrase:'three buyers',requestedCount:3,
    industryFilter:'footwear',geographyFilter:'Philadelphia'});
  await f.run();const body=JSON.parse(f.calls[0].opts.body);
  assert.equal(body.page_size,3);assert.deepEqual(body.query,{company_industry_keywords:['footwear'],current_title:['Buyer'],geo:['Philadelphia']});
  const g=fixture();g.d.bots[0].sourceTask={id:'current',providers:{rocketreach:{requestId:'different-request'}}};
  assert.equal((await g.run()).continuing,false);assert.equal(g.calls.length,0);
});
