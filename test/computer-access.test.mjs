import assert from 'node:assert/strict';
import test from 'node:test';
import {POST} from '../app/api/agent-computer/route.js';

const owner='6b0c8b2b-ab6e-4676-9274-807005c9c73c';
const requestId='7d495233-422a-4252-bd93-99073e235748';
const agent='54930d0c-16dc-4268-8f1d-ce51ed7bc0ce';
function launch(provider,token='test-bearer'){
  return POST(new Request('https://oparax.example/api/agent-computer',{
    method:'POST',headers:token?{authorization:'Bearer '+token}:{},body:JSON.stringify({agentId:agent,provider,requestId})
  }));
}
test('desktop issuance requires an authenticated owner, their agent, the selected source and an available provision slot',async t=>{
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://db.example';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='example-public';
  process.env.SUPABASE_SECRET_KEY='example-secret';
  const data={bots:[]};
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    const path=new URL(url).pathname;
    if(path==='/auth/v1/user'){
      assert.equal(options.headers.authorization,'Bearer test-bearer');
      return Response.json({id:owner,email:'agent-test@example.com',email_confirmed_at:'2026-01-01'});
    }
    if(path==='/rest/v1/rpc/outreach_user_save'){assert.equal(JSON.parse(options.body).uid,owner);return Response.json(true);}
    assert.equal(path,'/rest/v1/rpc/outreach_user_read');
    assert.equal(JSON.parse(options.body).uid,owner);
    return Response.json({rev:0,data});
  });
  const unauth=await launch('linkedin','');
  assert.equal(unauth.status,401);
  assert.match(unauth.headers.get('cache-control'),/no-store/);
  assert.equal((await launch('arbitrary-site')).status,400);
  assert.equal((await launch('linkedin')).status,404);
  data.bots=[{id:agent,searchSource:'sales_navigator'}];
  assert.equal((await launch('linkedin')).status,409);
  data.computerLaunch={until:Date.now()+60000};
  assert.equal((await launch('sales_navigator')).status,409);
  data.computerLaunch={requestId,agentId:agent,provider:'sales_navigator',deadline:Date.now()+100000,until:Date.now()+10000};
  const waiting=await launch('sales_navigator');
  assert.equal(waiting.status,202);
  assert.equal((await waiting.json()).status,'starting');
  data.computerLaunch.until=0;data.computerLaunch.deadline=Date.now()-1;
  assert.equal((await launch('sales_navigator')).status,408);
  data.computerLaunch={recent:Array(12).fill(Date.now())};
  assert.equal((await launch('sales_navigator')).status,429);
});
