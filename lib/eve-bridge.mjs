import {createHash,createHmac} from 'node:crypto';
import {bot,createBot,text} from './domain.mjs';
import {Fault,edit,read,same,serviceKey,withWorkspace} from './store.mjs';
import {normalizeSearchSource} from './search-source.mjs';
import {setModelPreference,resolveAgentModel} from './agent-models.mjs';

const ttl=15*60000;
const requestKey=/^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/;
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const allowedKeys=['id','message','requestId','botName','modelPreference','searchSources','searchSource','sender','draftId'];
const signature=payload=>createHmac('sha256',serviceKey()||(()=>{throw new Fault('Agent sessions are unavailable.',503);})()).update('oparax-eve-v1/'+payload).digest('base64url');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function ticket(claims){
  const data=Buffer.from(JSON.stringify({...claims,exp:Date.now()+ttl})).toString('base64url');return data+'.'+signature(data);
}
export function parseTicket(raw) {
  if(typeof raw!=='string'||raw.length>1800)return null;
  const [data,mac,extra]=raw.split('.');
  if(!data||!mac||extra!==undefined||!same(mac,signature(data)))return null;
  try{
    const c=JSON.parse(Buffer.from(data,'base64url').toString());
    return uuid.test(c.uid)&&uuid.test(c.bot)&&c.exp>Date.now()&&['create','read','turn','work'].includes(c.scope)?c:null;
  }catch{return null;}
}
function deploymentBase(){
  if(process.env.VERCEL_URL&&/^[a-z\d.-]+$/i.test(process.env.VERCEL_URL))return 'https://'+process.env.VERCEL_URL;
  if(process.env.NODE_ENV==='production')throw new Fault('The deployment address for agent sessions is unavailable.',503);
  return 'http://localhost:'+(/^\d+$/.test(process.env.PORT||'')?process.env.PORT:'3000');
}
function internalHeaders(token) {
  return {authorization:'Bearer '+token,'content-type':'application/json',...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{})};
}
async function startNative(uid,id,generation){
  const token=ticket({uid,bot:id,scope:'create'});
  const res=await fetch(deploymentBase()+'/eve/v1/session',{method:'POST',cache:'no-store',redirect:'error',headers:internalHeaders(token),
    body:JSON.stringify({operationId:'oparax-'+id+'-'+generation}),signal:AbortSignal.timeout(45000)});
  if(!res.ok)throw new Fault('The agent runtime could not start a session ('+res.status+'). Retry this conversation.',503);
  const result=await res.json();
  if(typeof result.sessionId!=='string'||!/^wrun_[\w-]+$/.test(result.sessionId))throw new Fault('The runtime did not return a valid session.',502);
  return result.sessionId;
}
function commandInput(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!allowedKeys.includes(k)))throw new Fault('Invalid agent session request.');
  if(raw.id!==undefined&&(!uuid.test(raw.id)||typeof raw.id!=='string'))throw new Fault('Invalid agent id.');
  if(raw.message===undefined&&raw.id)return null;
  if(typeof raw.message!=='string'||!raw.message.trim()||raw.message.trim().length>6000||!requestKey.test(raw.requestId||'')||Object.hasOwn(Object.prototype,raw.requestId))throw new Fault('A message and unique request ID are required.');
  if(raw.searchSources!==undefined&&(!Array.isArray(raw.searchSources)||raw.searchSources.length>5||raw.searchSources.some(s=>!normalizeSearchSource(s))))throw new Fault('Choose valid research sources.');
  if(raw.searchSource&&!normalizeSearchSource(raw.searchSource)||raw.sender&&!['agentmail','mailbox'].includes(raw.sender))throw new Fault('Choose a valid source and sender.');
  const input={message:raw.message.trim(),requestId:raw.requestId};
  for(const k of ['searchSource','searchSources','sender','draftId'])if(raw[k]!==undefined)input[k]=raw[k];
  return input;
}
export async function prepareEveSession(uid,raw,deps={}){
  const command=commandInput(raw),change=deps.edit||edit;
  const prepared=await change(d=>{
    let b=raw.id?bot(d,raw.id):null;
    if(!b&&command){const existing=d.eveStartRequests?.[command.requestId];if(existing)b=bot(d,existing);}
    if(!b){
      if(!command)throw new Fault('Choose an agent.');
      const name=text(raw.botName,65).replace(/[\x00-\x1f\x7f]/g,' ').trim();
      b=bot(d,createBot(d,{name:name||'Sales conversation',brief:command.message.slice(0,2500)}));b.provisional=true;
      if(name)b.provisionalNameExplicit=true;
      if(raw.modelPreference!==undefined)setModelPreference(d,b,raw.modelPreference);
      (d.eveStartRequests||={})[command.requestId]=b.id;
    }
    if(command){
      const fingerprint=hash([command,b.id]),old=b.eveInputs?.[command.requestId];
      if(old&&old.hash!==fingerprint)throw new Fault('This message ID was already used for different text.',409);
      if(!old)(b.eveInputs||={})[command.requestId]={hash:fingerprint,at:new Date().toISOString(),command};
    }
    b.eveBinding||={generation:crypto.randomUUID()};
    return {id:b.id,...b.eveBinding};
  });
  let sessionId=prepared.sessionId;
  if(!sessionId){
    const started=await (deps.start||startNative)(uid,prepared.id,prepared.generation);
    sessionId=await change(d=>{const b=bot(d,prepared.id);if(b.eveBinding.generation!==prepared.generation)throw new Fault('This agent session changed. Reopen the conversation.',409);return b.eveBinding.sessionId||=started;});
  }
  const scope=command?'turn':'read';
  return {agentId:prepared.id,sessionId,expiresAt:Date.now()+ttl,bearer:ticket({uid,bot:prepared.id,scope,sessionId,...(command?{requestId:command.requestId}:{})})};
}
export async function eveCaller(req,deps={}){
  const c=parseTicket(req.headers.get('authorization')?.replace(/^Bearer /,''));
  if(!c)return null;
  const path=new URL(req.url).pathname,method=req.method;
  let allowed=false;
  if(c.scope==='create'&&method==='POST'&&path==='/eve/v1/session'){
    const payload=await req.clone().json().catch(()=>null);
    allowed=!!payload&&Object.keys(payload).length===1&&typeof payload.operationId==='string'&&payload.operationId.startsWith('oparax-'+c.bot+'-');
  }
  if(['read','turn'].includes(c.scope)&&c.sessionId){
    const base='/eve/v1/session/'+c.sessionId;
    if(method==='GET'&&path===base+'/stream')allowed=true;
    if(method==='POST'&&path===base){
      const body=await req.clone().text();
      if(body.length>16000)return null;
      let value;try{value=body.trim()?JSON.parse(body):{};}catch{return null;}
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        const keys=Object.keys(value);
        if(!keys.length)allowed=true;
        else if(c.scope==='turn'&&keys.every(k=>['message','turnPolicy','idempotencyKey'].includes(k))&&
          (!value.turnPolicy||value.turnPolicy==='queue')&&(!value.idempotencyKey||value.idempotencyKey===c.requestId)){
          const stored=await withWorkspace(c.uid,async()=>bot((await (deps.read||read)()).data,c.bot));
          const literal=typeof value.message==='string'?value.message:Array.isArray(value.message)&&value.message.length===1&&value.message[0]?.type==='text'?value.message[0].text:null;
          allowed=stored.eveBinding?.sessionId===c.sessionId&&typeof literal==='string'&&stored.eveInputs?.[c.requestId]?.command.message===literal.trim();
        }
      }
    }
  }
  if(!allowed)return null;
  return {authenticator:'oparax',principalType:'user',principalId:c.uid+'/'+c.bot,attributes:{workspace:c.uid,bot:c.bot,...(c.scope==='turn'?{requestId:c.requestId}:{})}};
}
async function turnState(ctx,deps){
  const a=ctx?.session?.auth?.current,init=ctx?.session?.auth?.initiator;
  const {workspace,bot:id,requestId}=a?.attributes||{};
  if(a?.authenticator!=='oparax'||a.principalType!=='user'||a.principalId!==workspace+'/'+id||init?.principalId!==a.principalId||!uuid.test(workspace)||!uuid.test(id)||!requestKey.test(requestId||''))throw new Fault('This turn has no authorized workspace command.',403);
  return withWorkspace(workspace,async()=>{
    const data=(await (deps.read||read)()).data,b=bot(data,id);
    if(b.eveBinding?.sessionId!==ctx.session.id||!b.eveInputs?.[requestId])throw new Fault('This command does not belong to this session.',403);
    return {workspace,id,command:b.eveInputs[requestId].command,model:resolveAgentModel(b,{task:'conversation',message:b.eveInputs[requestId].command.message}).modelId};
  });
}
export async function eveModel(ctx,deps={}){return (await turnState(ctx,deps)).model;}
export async function runEveSalesTurn(ctx,deps={}){
  const {workspace,id,command}=await turnState(ctx,deps);
  return withWorkspace(workspace,async()=>{
    const result=await (deps.messageAgent||(await import('./conversation.mjs')).messageAgent)({...command,id});
    if(result.work||result.sourceWork?.length){
      try{
        const token=ticket({uid:workspace,bot:id,scope:'work',requestId:command.requestId});
        await (deps.kick||(()=>fetch(deploymentBase()+'/api/eve-session',{method:'POST',headers:internalHeaders(token),body:'{}',signal:AbortSignal.timeout(9000)})))();
      }catch{} // The same committed jobs are recovered by the workspace scheduler.
    }
    const d=(await (deps.read||read)()).data;
    const start=d.messages.findIndex(m=>m.botId===id&&m.requestId===command.requestId&&m.role==='user');
    const messages=[];
    for(const m of start<0?[]:d.messages.slice(start+1)){
      if(m.botId!==id)continue;if(m.role==='user')break;
      if(m.role==='assistant')messages.push(m.content);
    }
    return {reply:messages.join('\n\n').slice(0,8500)||'The conversation has been updated.',...(result.outreachReceipt?{deliveryStatus:result.outreachReceipt.status}:{})};
  });
}
