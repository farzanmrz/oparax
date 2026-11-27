import assert from 'node:assert/strict';
import test from 'node:test';
import {changeBusinessMemory,businessMemoryContext,projectBusinessMemory} from '../lib/business-memory.mjs';
import {GET,PUT} from '../app/api/business-memory/route.js';
import {view} from '../lib/store.mjs';

test('empty memory never infers seller facts from a campaign, account or existing connections',()=>{
  const workspace={mailbox:{address:'fixture@example.test',secret:'private'},bots:[{brief:'Find people at Example'}]};
  const fresh=projectBusinessMemory();
  assert.equal(fresh.version,0);
  assert.equal(fresh.updatedAt,null);
  assert.equal(fresh.company,'');
  assert.deepEqual(businessMemoryContext(workspace),{});
  assert.deepEqual(view(workspace).businessMemory,fresh);
});

test('validated saves preserve unrelated fields, allow explicit clearing, and avoid spurious revisions',()=>{
  const workspace={};
  const saved=changeBusinessMemory(workspace,{expectedVersion:0,fields:{company:'  Example Mfg  ',voice:'Friendly.\r\nDirect.'}});
  assert.equal(saved.version,1);
  assert.equal(new Date(saved.updatedAt).toISOString(),saved.updatedAt);
  assert.deepEqual(businessMemoryContext(workspace),{company:'Example Mfg',voice:'Friendly.\nDirect.'});
  assert.deepEqual(changeBusinessMemory(workspace,{expectedVersion:1,fields:{company:'Example Mfg'}}),saved);
  assert.equal(changeBusinessMemory(workspace,{expectedVersion:1,fields:{voice:''}}).version,2);
  assert.deepEqual(businessMemoryContext(workspace),{company:'Example Mfg'});
});

test('malformed, overlong, secret and unknown input is atomic and private stored fields never project',()=>{
  const workspace={businessMemory:{version:3,company:'Example',proof:'sk_live_'+'X'.repeat(40),secret:'hidden',updatedAt:'untrusted'}};
  for(const input of [
    {expectedVersion:'3',fields:{voice:'New'}},{expectedVersion:3,fields:{}},
    {expectedVersion:3,uid:'another-tenant',fields:{company:'Other'}},
    {expectedVersion:3,fields:{voice:'New',company:1}},
    {expectedVersion:3,fields:{company:'X'.repeat(181)}},{expectedVersion:3,fields:{restrictions:'Bad\u0001'}},
    {expectedVersion:3,fields:{voice:'Bearer '+'x'.repeat(40)}},{expectedVersion:3,fields:{password:'Example'}},
    JSON.parse('{"expectedVersion":3,"fields":{"__proto__":"leak"}}'),
  ])assert.throws(()=>changeBusinessMemory(workspace,input),{status:400});
  const projected=view(workspace).businessMemory;
  assert.deepEqual(businessMemoryContext(workspace),{company:'Example'});
  assert.equal(projected.proof,'');
  assert.equal(projected.updatedAt,null);
  assert.equal(projected.secret,undefined);
  assert.equal(projected.version,3);
  assert.equal(workspace.businessMemory.voice,undefined);
});

test('the authenticated API scopes Supabase edits, rejects stale writes after CAS retry, and caps the body',async t=>{
  const authA='01010101-0101-4101-8101-010101010101',authB='02020202-0202-4202-8202-020202020202';
  const records=new Map([authA,authB].map(id=>[id,{rev:0,data:{}}]));
  const env={NEXT_PUBLIC_SUPABASE_URL:'https://db.example',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture',SUPABASE_SECRET_KEY:'fixture'};
  for(const [name,value] of Object.entries(env)){
    const original=process.env[name];
    process.env[name]=value;
    t.after(()=>{if(original===undefined)delete process.env[name];else process.env[name]=original;});
  }
  let failedSaves=0;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    const path=new URL(url).pathname;
    if(path==='/auth/v1/user'){
      const id=options.headers.authorization.slice(7);
      return records.has(id)?Response.json({id,email:'owner@example.test',email_confirmed_at:'2026-01-01'}):Response.json({},{status:401});
    }
    const {uid,expected,next_data}=JSON.parse(options.body);
    const state=records.get(uid);
    assert.ok(state,'record belongs to a verified tenant');
    if(path.endsWith('/outreach_user_read'))return Response.json(state);
    assert.ok(path.endsWith('/outreach_user_save'));
    if(state.rev!==expected){failedSaves++;return Response.json(false);}
    records.set(uid,{rev:state.rev+1,data:next_data});
    return Response.json(true);
  });
  const request=(uid,input)=>new Request('https://app.example/api/business-memory',{
    method:input===undefined?'GET':'PUT',headers:uid?{authorization:'Bearer '+uid}:{},
    body:input===undefined?undefined:JSON.stringify(input),
  });
  const patch=company=>({expectedVersion:0,fields:{company}});
  for(const response of [await GET(request(null)),await PUT(request(null,patch('Private')))]){
    assert.equal(response.status,401);
    assert.equal(response.headers.get('cache-control'),'private, no-store');
  }
  const first=await GET(request(authA));
  assert.deepEqual((await first.json()).memory,projectBusinessMemory());
  const saves=await Promise.all(['First','Second'].map(company=>PUT(request(authA,patch(company)))));
  assert.deepEqual(saves.map(x=>x.status).sort(),[200,409]);
  assert.ok(failedSaves,'two racing writes challenged the same underlying workspace revision');
  const success=await saves.find(x=>x.status===200).json();
  const conflict=await saves.find(x=>x.status===409).json();
  assert.deepEqual(conflict.memory,success.memory);
  assert.equal(records.get(authA).data.businessMemory.version,1);
  assert.equal((await (await GET(request(authB))).json()).memory.company,'');
  assert.equal((await PUT(request(authA,patch('X'.repeat(100000))))).status,413);
  assert.equal((await PUT(request(authA,{...patch('Other'),workspaceId:authB}))).status,400);
});
