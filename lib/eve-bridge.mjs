import {canonicalAnswer} from './eve-turn-receipt.mjs';
import {createHash,createHmac} from 'node:crypto';
import {bot,createBot,text} from './domain.mjs';
import {Fault,edit,read,same,serviceKey,withWorkspace} from './store.mjs';
import {normalizeSearchSource} from './search-source.mjs';
import {setModelPreference,resolveAgentModel,modelUsage} from './agent-models.mjs';

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
  // Vercel team protection can guard the generated deployment URL even when the
  // production site's primary domain is public. Keep previews on their own build.
  if(process.env.VERCEL_ENV==='production')return 'https://oparax.ai';
  if(process.env.VERCEL_URL&&/^[a-z\d.-]+$/i.test(process.env.VERCEL_URL))return 'https://'+process.env.VERCEL_URL;
  if(process.env.VERCEL)throw new Fault('The deployment address for agent sessions is unavailable.',503);
  // next start hosts the web and agent routes together even in production mode.
  return 'http://127.0.0.1:'+(/^\d+$/.test(process.env.PORT||'')?process.env.PORT:'3000');
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
async function isRetired(uid,id,sessionId) {
  try{
    const token=ticket({uid,bot:id,scope:'read',sessionId});
    const response=await fetch(deploymentBase()+'/eve/v1/session/'+encodeURIComponent(sessionId),{method:'POST',headers:internalHeaders(token),redirect:'error',cache:'no-store',body:'{}',signal:AbortSignal.timeout(8000)});
    const body=await response.json();
    return (response.ok&&body?.status==='no_active_session')||([409,410].includes(response.status)&&['session_not_active','session_stranded','session_expired'].includes(body?.code));
  }catch{return false;}
}
function commandInput(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!allowedKeys.includes(k)))throw new Fault('Invalid agent session request.');
  if(raw.id!==undefined&&(!uuid.test(raw.id)||typeof raw.id!=='string'))throw new Fault('Invalid agent id.');
  if(raw.message===undefined&&raw.id)return null;
  if(typeof raw.message!=='string'||!raw.message.trim()||raw.message.trim().length>6000||!requestKey.test(raw.requestId||'')||Object.hasOwn(Object.prototype,raw.requestId))throw new Fault('A message and unique request ID are required.');
  if(raw.searchSources!==undefined&&(!Array.isArray(raw.searchSources)||raw.searchSources.length>5||raw.searchSources.some(s=>!normalizeSearchSource(s))))throw new Fault('Choose valid research sources.');
  if(raw.draftId!==undefined&&(typeof raw.draftId!=='string'||raw.draftId.length>110))throw new Fault('Choose a valid saved draft.');
  if(raw.searchSource&&!normalizeSearchSource(raw.searchSource)||raw.sender&&!['agentmail','mailbox'].includes(raw.sender))throw new Fault('Choose a valid source and sender.');
  const input={message:raw.message.trim(),requestId:raw.requestId};
  for(const k of ['searchSource','searchSources','sender','draftId'])if(raw[k]!==undefined)input[k]=raw[k];
  return input;
}
export async function prepareEveSession(uid,raw,deps={}){
  const command=commandInput(raw),change=deps.edit||edit;
  let prepared=await change(d=>{
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
      else if(old.failure?.key===(old.deliveryKey||command.requestId)&&d.conversationReceipts?.[command.requestId]?.agentId!==b.id){
        // A conclusively failed native attempt never dispatched an action. Domain id remains fixed.
        old.deliveryKey=command.requestId+'-'+crypto.randomUUID();
      }
      b.eveLatestRequestId=command.requestId;
    }
    b.eveBinding||={generation:crypto.randomUUID()};
    return {id:b.id,deliveryKey:command?(b.eveInputs[command.requestId].deliveryKey||command.requestId):undefined,...b.eveBinding};
  });
  // A finished/expired runtime may be replaced while the bot keeps its sales history.
  if(prepared.sessionId&&Date.now()-(prepared.checkedAt||0)>600000){
    const expired=await (deps.retired||isRetired)(uid,prepared.id,prepared.sessionId);
    prepared=await change(d=>{
      const b=bot(d,prepared.id),binding=b.eveBinding;
      if(binding.sessionId===prepared.sessionId){
        if(expired)b.eveBinding={generation:crypto.randomUUID()};
        else binding.checkedAt=Date.now();
      }
      return {id:b.id,deliveryKey:command?(b.eveInputs[command.requestId].deliveryKey||command.requestId):undefined,...b.eveBinding};
    });
  }
  let sessionId=prepared.sessionId;
  if(!sessionId){
    // Native operationId also deduplicates a crash after create but before our CAS.
    // Serialize live starts to avoid publishing a provisional id from a racing create.
    const lease=crypto.randomUUID();
    for(let attempt=0;attempt<18;attempt++){
      const claim=await change(d=>{
        const bound=bot(d,prepared.id).eveBinding;
        if(bound.generation!==prepared.generation)throw new Fault('This session changed. Reopen the bot.',409);
        if(bound.sessionId)return {sessionId:bound.sessionId};
        if(bound.startLease?.until>Date.now())return {waiting:true};
        bound.startLease={id:lease,until:Date.now()+48000};return {start:true};
      });
      if(claim.sessionId){sessionId=claim.sessionId;break;}
      if(claim.waiting){await new Promise(resolve=>setTimeout(resolve,250));continue;}
      try{
        const started=await (deps.start||startNative)(uid,prepared.id,prepared.generation);
        sessionId=await change(d=>{const binding=bot(d,prepared.id).eveBinding;
          if(binding.generation!==prepared.generation||binding.startLease?.id!==lease)throw new Fault('This session changed. Reopen the bot.',409);
          delete binding.startLease;binding.checkedAt=Date.now();return binding.sessionId=started;
        });
      }catch(error){await change(d=>{const binding=bot(d,prepared.id).eveBinding;if(binding.startLease?.id===lease)delete binding.startLease;});throw error;}
      break;
    }
    if(!sessionId)throw new Fault('The bot session is still starting. Retry the same message.',503);
  }
  const scope=command?'turn':'read',deliveryKey=prepared.deliveryKey;
  return {agentId:prepared.id,sessionId,...(deliveryKey?{deliveryKey}:{}),expiresAt:Date.now()+ttl,bearer:ticket({uid,bot:prepared.id,scope,sessionId,...(command?{requestId:command.requestId,deliveryKey}:{})})};
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
          (!value.turnPolicy||value.turnPolicy==='queue')&&value.idempotencyKey===(c.deliveryKey||c.requestId)){
          const stored=await withWorkspace(c.uid,async()=>bot((await (deps.read||read)()).data,c.bot));
          const literal=typeof value.message==='string'?value.message:Array.isArray(value.message)&&value.message.length===1&&value.message[0]?.type==='text'?value.message[0].text:null;
          allowed=(stored.eveInputs?.[c.requestId]?.deliveryKey||c.requestId)===(c.deliveryKey||c.requestId)&&stored.eveBinding?.sessionId===c.sessionId&&typeof literal==='string'&&stored.eveInputs?.[c.requestId]?.command.message===literal.trim();
        }
      }
    }
  }
  if(!allowed)return null;
  return {authenticator:'oparax',principalType:'user',principalId:c.uid+'/'+c.bot,attributes:{workspace:c.uid,bot:c.bot,...(c.scope==='turn'?{requestId:c.requestId,deliveryKey:c.deliveryKey||c.requestId}:{})}};
}
async function turnState(ctx,deps){
  const a=ctx?.session?.auth?.current,init=ctx?.session?.auth?.initiator;
  const {workspace,bot:id,requestId}=a?.attributes||{};
  if(a?.authenticator!=='oparax'||a.principalType!=='user'||a.principalId!==workspace+'/'+id||init?.principalId!==a.principalId||!uuid.test(workspace)||!uuid.test(id)||!requestKey.test(requestId||''))throw new Fault('This turn has no authorized workspace command.',403);
  return withWorkspace(workspace,async()=>{
    const data=(await (deps.read||read)()).data,b=bot(data,id);
    if(b.eveBinding?.sessionId!==ctx.session.id||!b.eveInputs?.[requestId]||(b.eveInputs[requestId].deliveryKey||requestId)!==(a.attributes.deliveryKey||requestId))throw new Fault('This command does not belong to this session.',403);
    return {workspace,id,data,agent:b,command:b.eveInputs[requestId].command};
  });
}
export async function withEveTurn(ctx,action,deps={}) {
  const state=await turnState(ctx,deps);
  return withWorkspace(state.workspace,()=>action(state));
}
export async function eveModelCall(ctx,deps={}){
  const {workspace,id,agent,command}=await turnState(ctx,deps);
  const route=resolveAgentModel(agent,{task:'conversation',message:command.message});
  return {
    modelId:route.modelId,
    async onUsage(value){
      const usage=modelUsage(value,route);
      await withWorkspace(workspace,()=>(deps.edit||edit)(data=>{
        const current=data.bots.find(b=>b.id===id);
        if(current&&!(current.lastModelUsage?.at>usage.at))current.lastModelUsage=usage;
      })).catch(()=>{}); // A failed accounting write must not retry a billed generation.
    }
  };
}
export async function eveModel(ctx,deps={}){return (await eveModelCall(ctx,deps)).modelId;}
export async function runEveSalesTurn(ctx,deps={},proposal){
  const {workspace,id,command}=await turnState(ctx,deps);
  return withWorkspace(workspace,async()=>{
    const {validateCommandProposal}=await import('./conversation-model.mjs');
    const services=proposal===undefined?{}:{plan:args=>validateCommandProposal(args,proposal)};
    const result=await (deps.messageAgent||(await import('./conversation.mjs')).messageAgent)({...command,id},services);
    if(result.work||result.sourceWork?.length){
      try{
        const token=ticket({uid:workspace,bot:id,scope:'work',requestId:command.requestId});
        await (deps.kick||(()=>fetch(deploymentBase()+'/api/eve-session',{method:'POST',headers:internalHeaders(token),body:'{}',signal:AbortSignal.timeout(9000)})))();
      }catch{} // The same committed jobs are recovered by the workspace scheduler.
    }
    const d=(await (deps.read||read)()).data;
    if(d.conversationReceipts?.[command.requestId]?.agentId!==id)throw new Fault('This conversation did not confirm the request.',502);
    return {reply:canonicalAnswer(d,id,command.requestId)||'This request was previously recorded. Its original reply is no longer in the current conversation history.',...(result.outreachReceipt?{deliveryStatus:result.outreachReceipt.status}:{})};
  });
}
