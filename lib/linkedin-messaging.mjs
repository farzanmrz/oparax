import {createHash,randomBytes} from 'node:crypto';
import {edit,Fault,same,seal,unseal} from './store.mjs';
import {linkedinProfileUrl} from './profile-url.mjs';

export const oauthCallback='https://oparax.ai/api/linkedin-messaging/callback';
export const browserCookie='__Host-oparax-linkedin-connect';
const api='https://api.linkedin.com/v2/';
const digest=value=>createHash('sha256').update(value).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
const cleanId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,150}$/.test(value);
const normalizeName=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]/gu,'');
const blocked=(message,status=409)=>Object.assign(new Fault(message,status),{definite:true});

function config(){
  const id=process.env.LINKEDIN_MESSAGING_CLIENT_ID,secret=process.env.LINKEDIN_MESSAGING_CLIENT_SECRET;
  const sendScope=process.env.LINKEDIN_MESSAGING_SEND_SCOPE;
  if(process.env.LINKEDIN_MESSAGING_APPROVED!=='true'||!id||!secret||!/^\w{2,80}$/.test(sendScope||''))return null;
  if(['openid','profile','email','w_member_social','r_basicprofile','r_1st_connections'].includes(sendScope))return null;
  return {id,secret,scopes:[sendScope,'r_basicprofile','r_1st_connections']};
}
function requireConfig(){
  const result=config();
  if(!result)throw blocked('LinkedIn direct sending requires an approved LinkedIn Messaging partner application.',503);
  return result;
}
export function linkedinMessagingState(data){
  const app=config(),a=data?.linkedinMessagingAccount;
  return {available:!!app,connected:!!(app&&a&&a.appId===app.id&&a.expiresAt>Date.now()&&a.token&&cleanId(a.memberId))};
}
function sessionBinding(req){
  const bearer=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  // The route has already verified this access token against Supabase Auth.
  let id;
  try {id=JSON.parse(Buffer.from(bearer.split('.')[1],'base64url')).session_id;}catch{}
  return digest(typeof id==='string'&&id?id:bearer);
}
export async function startLinkedInConnection(req){
  const {id,scopes}=requireConfig(),state=random(),cookie=random();
  if(new URL(req.url).origin!==new URL(oauthCallback).origin)throw blocked('Open Oparax on its production domain to connect LinkedIn.');
  const pending={state:digest(state),cookie:digest(cookie),session:sessionBinding(req),expiresAt:Date.now()+600000};
  await edit(d=>{d.linkedinMessagingOAuth=pending;});
  const url=new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.search=new URLSearchParams({response_type:'code',client_id:id,scope:scopes.join(' '),redirect_uri:oauthCallback,state});
  return {url:url.href,cookie};
}
function memberName(profile){
  function name(field){const part=profile?.[field],locale=part?.preferredLocale;
    return profile?.['localized'+field[0].toUpperCase()+field.slice(1)]||
      part?.localized?.[[locale?.language,locale?.country].filter(Boolean).join('_')]||Object.values(part?.localized||{})[0]||'';}
  return [name('firstName'),name('lastName')].filter(Boolean).join(' ').trim().slice(0,180);
}
function headers(token){return {Authorization:'Bearer '+token,'X-Restli-Protocol-Version':'2.0.0'};}
export async function finishLinkedInConnection(req,{state,code},request=fetch){
  const app=requireConfig(),binding=sessionBinding(req);
  const cookie=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(browserCookie+'='))?.slice(browserCookie.length+1);
  if(!/^[A-Za-z0-9_-]{43}$/.test(state||'')||!/^[A-Za-z0-9_-]{43}$/.test(cookie||'')||typeof code!=='string'||!code||code.length>4000)throw blocked('The LinkedIn connection request is invalid. Start again.',403);
  const claim=random();
  await edit(d=>{
    const p=d.linkedinMessagingOAuth;
    if(!p||p.claim||p.expiresAt<=Date.now()||!same(p.session,binding)||!same(p.state,digest(state))||!same(p.cookie,digest(cookie)))throw blocked('The connection request expired, was already used, or belongs to another Oparax session.',403);
    d.linkedinMessagingOAuth={claim,expiresAt:p.expiresAt};
  });
  const r=await request('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),
    headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:oauthCallback,client_id:app.id,client_secret:app.secret})});
  if(!r.ok)throw blocked('LinkedIn could not authorize this connection. Reconnect your account.',403);
  const value=await r.json(),granted=typeof value.scope==='string'?value.scope.split(/[ ,]+/):null;
  if(typeof value.access_token!=='string'||!value.access_token||!Number.isFinite(Number(value.expires_in))||Number(value.expires_in)<=0||
    granted&&app.scopes.some(scope=>!granted.includes(scope)))throw blocked('LinkedIn did not grant the permissions required for personal messaging.',403);
  const identity=await request(api+'me?projection=(id,localizedFirstName,localizedLastName)',{headers:headers(value.access_token),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!identity.ok)throw blocked('LinkedIn could not verify the sending member. Check the approved profile permissions.',403);
  const profile=await identity.json(),name=memberName(profile);
  if(!cleanId(profile.id)||!name)throw blocked('LinkedIn did not identify the sending member.',403);
  const account={appId:app.id,memberId:profile.id,name,token:seal(value.access_token),expiresAt:Date.now()+Number(value.expires_in)*1000};
  await edit(d=>{
    if(d.linkedinMessagingOAuth?.claim!==claim||d.linkedinMessagingOAuth.expiresAt<=Date.now())throw blocked('Start a fresh LinkedIn connection.');
    d.linkedinMessagingAccount=account;delete d.linkedinMessagingOAuth;
  });
}
export function prepareLinkedInDM(data,lead){
  requireConfig();
  if(!linkedinMessagingState(data).connected)throw blocked('Connect your LinkedIn messaging account before sending a direct message.');
  const profileUrl=linkedinProfileUrl(lead?.linkedinUrl),to=String(lead?.person||'').trim();
  if(!profileUrl||!to)throw blocked('This person needs a verified personal LinkedIn profile.');
  const a=data.linkedinMessagingAccount;
  return {from:a.name,senderId:a.memberId,to,profileUrl,credential:a.token};
}
async function resolveMember(prepared,token,request){
  const deadline=Date.now()+45000,count=50;
  // Only enumerate the linked sender's own first-degree connections. Data stays in memory.
  for(let start=0;start<30000;start+=count){
    const remaining=deadline-Date.now();
    if(remaining<=0)break;
    const url=new URL(api+'connections');
    url.search=new URLSearchParams({q:'viewer',start:String(start),count:String(count),projection:'(paging,elements*(to,to~(id,vanityName,firstName,lastName)))'});
    const response=await request(url.href,{headers:headers(token),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(Math.min(remaining,8000))});
    if(!response.ok)throw blocked('LinkedIn could not check your first-degree connections and profile permissions.');
    const page=await response.json();
    if(!Array.isArray(page.elements))throw blocked('LinkedIn returned incomplete connection information.');
    for(const edge of page.elements){
      const p=edge?.['to~'];
      if(!cleanId(p?.id)||typeof p.vanityName!=='string'||!p.vanityName)continue;
      const candidate=linkedinProfileUrl('https://www.linkedin.com/in/'+encodeURIComponent(p.vanityName));
      if(candidate.toLowerCase()!==prepared.profileUrl.toLowerCase())continue;
      if(edge.to!=='urn:li:person:'+p.id||p.id===prepared.senderId||!normalizeName(prepared.to)||normalizeName(memberName(p))!==normalizeName(prepared.to)){
        throw blocked('The LinkedIn member identity differs from the reviewed prospect. Check the name and profile.');
      }
      return edge.to;
    }
    const total=page.paging?.total;
    if((Number.isInteger(total)&&start+page.elements.length>=total)||!page.elements.length||
      (page.elements.length<count&&!page.paging?.links?.some(link=>link.rel==='next')))break;
  }
  throw blocked('LinkedIn could not confirm this name and profile as a first-degree connection of the sending account.');
}
export async function deliverLinkedInDM(prepared,body,request=fetch){
  requireConfig();
  if(typeof body!=='string'||!body.trim()||body.length>4000||/<\/?[a-z][^>]*>/i.test(body))throw blocked('Review the plain-text LinkedIn message before sending.');
  let token,urn;
  try{token=unseal(prepared.credential);urn=await resolveMember(prepared,token,request);}
  catch(error){if(error.definite)throw error;throw blocked('LinkedIn recipient verification was unavailable. Your message was not submitted.');}
  let response;
  try {
    response=await request(api+'messages',{method:'POST',headers:{...headers(token),'Content-Type':'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
      body:JSON.stringify({recipients:[urn],body,messageType:'MEMBER_TO_MEMBER'})});
  }catch{throw new Fault('LinkedIn delivery could not be confirmed. Check your messaging history before retrying.',502);}
  if(response.status===201)return {providerId:response.headers.get('x-linkedin-id')||response.headers.get('x-restli-id')||null};
  if([400,401,403,404,422,429].includes(response.status))throw blocked('LinkedIn rejected this message ('+response.status+'). Check your connection and permissions.');
  throw new Fault('LinkedIn returned an uncertain delivery status. Check your messaging history before retrying.',502);
}
