import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareLinkedInDM,deliverLinkedInDM,linkedinMessagingState,startLinkedInConnection,finishLinkedInConnection,browserCookie} from '../lib/linkedin-messaging.mjs';
import {seal,unseal,withWorkspace} from '../lib/store.mjs';

const owner='44444444-4444-4444-8444-444444444444',lead={person:'Ada Smith',linkedinUrl:'https://uk.linkedin.com/in/ada-smith'};
const connection={to:'urn:li:person:kx9X','to~':{id:'kx9X',vanityName:'ada-smith',localizedFirstName:'Ada',localizedLastName:'Smith'}};
function configure(t){
  const config={LINKEDIN_MESSAGING_APPROVED:'true',LINKEDIN_MESSAGING_CLIENT_ID:'app',LINKEDIN_MESSAGING_CLIENT_SECRET:'test-partner-secret',LINKEDIN_MESSAGING_SEND_SCOPE:'w_messages',SUPABASE_SECRET_KEY:'fixture',NEXT_PUBLIC_SUPABASE_URL:'https://db.example.test'};
  const old=Object.fromEntries(Object.keys(config).map(k=>[k,process.env[k]]));
  Object.assign(process.env,config);t.after(()=>{for(const [k,v] of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;});
  return {linkedinMessagingAccount:{appId:'app',memberId:'sender8',name:'Sales Rep',expiresAt:Date.now()+600000,token:seal('fixture-access')}};
}
test('direct messaging is gated and verified against a first-degree member URN before the reviewed message',async t=>{
  const data=configure(t);
  assert.deepEqual(linkedinMessagingState(data),{available:true,connected:true});
  const prepared=prepareLinkedInDM(data,lead);assert.equal(prepared.senderId,'sender8');assert.equal(prepared.to,'Ada Smith');
  const calls=[];
  const request=async (url,options)=>{
    calls.push(new URL(url).pathname);assert.equal(options.redirect,'error');
    if(new URL(url).pathname.endsWith('/connections'))return Response.json({elements:[connection],paging:{total:1}});
    assert.deepEqual(JSON.parse(options.body),{recipients:['urn:li:person:kx9X'],body:'Hello Ada',messageType:'MEMBER_TO_MEMBER'});
    return new Response(null,{status:201,headers:{'x-linkedin-id':'message-123'}});
  };
  assert.deepEqual(await deliverLinkedInDM(prepared,'Hello Ada',request),{providerId:'message-123'});
  assert.deepEqual(calls,['/v2/connections','/v2/messages']);
  for(const rows of [[],[{...connection,to:'urn:li:person:wrong'}],[{...connection,'to~':{...connection['to~'],localizedFirstName:'Other'}}],
    [{...connection,'to~':{...connection['to~'],vanityName:'someone-else'}}]]){
    let attempts=0;await assert.rejects(deliverLinkedInDM(prepared,'Hello Ada',async()=>{attempts++;return Response.json({elements:rows,paging:{total:rows.length}})}),e=>e.definite===true);
    assert.equal(attempts,1);
  }
  const uncertain=async(url)=>new URL(url).pathname.endsWith('/connections')?Response.json({elements:[connection],paging:{total:1}}):new Response(null,{status:503});
  await assert.rejects(deliverLinkedInDM(prepared,'Hello Ada',uncertain),e=>!e.definite);
  process.env.LINKEDIN_MESSAGING_APPROVED='false';assert.deepEqual(linkedinMessagingState(data),{available:false,connected:false});
  assert.throws(()=>prepareLinkedInDM(data,lead),/approved/);
});

test('OAuth state is bound to the authenticated workspace, browser and session, consumed once, and seals the token',async t=>{
  configure(t);let saved={},rev=0;const originalToken='opaque-test-token';const reads=[];
  t.mock.method(globalThis,'fetch',async(url,opts)=>{
    const args=JSON.parse(opts.body);assert.equal(args.uid,owner);reads.push(args.uid);
    if(url.endsWith('/outreach_user_read'))return Response.json({data:saved,rev});
    assert(url.endsWith('/outreach_user_save'));assert.equal(args.expected,rev);rev++;saved=args.next_data;return Response.json(true);
  });
  const req=(token,cookie='')=>new Request('https://oparax.ai/api/linkedin-messaging/connect',{headers:{authorization:'Bearer '+token,cookie}});
  const issued=await withWorkspace(owner,()=>startLinkedInConnection(req(originalToken)));
  const target=new URL(issued.url),state=target.searchParams.get('state');assert.equal(target.origin,'https://www.linkedin.com');
  assert(!JSON.stringify(saved).includes(state));assert(!JSON.stringify(saved).includes(issued.cookie));
  const fields={state,code:'authorization-code-test'},cookie=browserCookie+'='+issued.cookie;
  const deny=()=>{throw Error('Provider should not receive a request');};
  for(const other of [req('wrong-session',cookie),req(originalToken,browserCookie+'='+'x'.repeat(43))])
    await assert.rejects(withWorkspace(owner,()=>finishLinkedInConnection(other,fields,deny)),/belongs/);
  const responses=[Response.json({access_token:'secret-provider-token',expires_in:1000,scope:'r_1st_connections,w_messages,r_basicprofile'}),Response.json({id:'sender8',localizedFirstName:'Sales',localizedLastName:'Rep'})];
  const endpoints=[];const provider=async url=>{endpoints.push(new URL(url).pathname);return responses.shift();};
  await withWorkspace(owner,()=>finishLinkedInConnection(req(originalToken,cookie),fields,provider));
  assert.deepEqual(endpoints,['/oauth/v2/accessToken','/v2/me']);
  assert.equal(saved.linkedinMessagingOAuth,undefined);assert.equal(unseal(saved.linkedinMessagingAccount.token),'secret-provider-token');
  assert(!JSON.stringify(saved).includes('secret-provider-token'));assert.deepEqual(linkedinMessagingState(saved),{available:true,connected:true});
  await assert.rejects(withWorkspace(owner,()=>finishLinkedInConnection(req(originalToken,cookie),fields,deny)),/belongs/);
  assert(reads.length>1);
});
