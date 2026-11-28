import assert from 'node:assert/strict';
import test from 'node:test';
import {loginCallback} from '../lib/login.mjs';
import {withWorkspace,workspaceId} from '../lib/store.mjs';
import {POST} from '../app/api/signin/route.js';

test('mail-template verification and legacy fragment links',()=>{
 assert.deepEqual(loginCallback('?token_hash=fixture&type=email',''),{verification:{token_hash:'fixture',type:'email'}});
 assert.equal(loginCallback('','#access_token=a&refresh_token=b').session.refresh,'b');
 assert.ok(loginCallback('?token_hash=fixture&type=invalid','').error);
});
test('parallel requests retain independent workspaces and missing scope fails closed',async()=>{
 const ids=['01010101-0101-4101-8101-010101010101','02020202-0202-4202-8202-020202020202'];
 assert.throws(workspaceId);
 assert.deepEqual(await Promise.all(ids.map(uid=>withWorkspace(uid,async()=>{await new Promise(done=>setTimeout(done,2));return workspaceId()}))),ids);
 assert.throws(workspaceId);
});
test('new signups use the submitted address and accepted duplicates do not send again',async t=>{
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://db.example';
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='pk-fixture';
 process.env.SUPABASE_SECRET_KEY='secret-fixture';
 let sent=[],accepted=false;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
   const path=new URL(url).pathname;
   if(path.endsWith('outreach_signin_claim'))return Response.json(accepted?'accepted':'claimed');
   if(path.endsWith('outreach_signin_finish')){accepted=JSON.parse(options.body).ok;return new Response(null,{status:204});}
   assert.equal(path,'/auth/v1/otp');
   assert.equal(new URL(url).searchParams.get('redirect_to'),'https://oparax.ai/');
   sent.push(JSON.parse(options.body));
   return Response.json({});
 });
 const submit=email=>POST(new Request('https://oparax.ai/api/signin',{method:'POST',body:JSON.stringify({email})}));
 const first=await submit('Demo+Sales@independent.example');
 assert.equal(first.status,200);
 assert.deepEqual(await first.json(),{ok:true,delivery:'sent',retryAfterSeconds:60});
 const recent=await submit('demo+sales@independent.example');
 assert.equal(recent.status,200);
 assert.deepEqual(await recent.json(),{ok:true,delivery:'recent',retryAfterSeconds:60});
 assert.deepEqual(sent,[{email:'demo+sales@independent.example',create_user:true}]);
 assert.equal((await submit('bad')).status,400);
});

test('a provider cooldown is preserved and a rejected delivery releases the local claim',async t=>{
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://db.example';
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='pk-fixture';
 process.env.SUPABASE_SECRET_KEY='secret-fixture';
 let finish;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
   const path=new URL(url).pathname;
   if(path.endsWith('outreach_signin_claim'))return Response.json('claimed');
   if(path.endsWith('outreach_signin_finish')){finish=JSON.parse(options.body);return new Response(null,{status:204});}
   assert.equal(path,'/auth/v1/otp');
   return Response.json({code:'over_email_send_rate_limit'},{status:429,headers:{'Retry-After':'34'}});
 });
 const response=await POST(new Request('https://oparax.ai/api/signin',{method:'POST',body:JSON.stringify({email:'sales@example.test'})}));
 assert.equal(response.status,429);
 assert.equal(response.headers.get('Retry-After'),'34');
 assert.equal((await response.json()).retryAfterSeconds,34);
 assert.equal(finish.ok,false);
});
