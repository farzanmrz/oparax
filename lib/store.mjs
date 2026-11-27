import {publicTurn} from './eve-turn-receipt.mjs';
import {salesSkills,salesConnectors} from './sales-skills.mjs';
import {createCipheriv,createDecipheriv,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {isPublishedProspect} from './qualification.mjs';
import {linkedinMessagingState} from './linkedin-messaging.mjs';
import {mailboxScopeSuggestion} from './mailbox-scope.mjs';
import {selectedSearchSources} from './search-source.mjs';
import {sourceStates,mailboxAuthorized,qualifiedForTask} from './source-states.mjs';
import {projectBusinessMemory} from './business-memory.mjs';
import {customSkillLibrary,assignedCustomSkillIds} from './custom-skills.mjs';
import {normalizeModelPreference} from './agent-models.mjs';
import {limitForContext} from './research-limit.mjs';

const scope = new AsyncLocalStorage();
export function withWorkspace(uid, action) {
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(uid)) throw new Fault('Invalid workspace.',403);
  return scope.run(uid, action);
}
export function workspaceId() {
  const uid = scope.getStore();
  if(!uid) throw new Fault('A verified workspace is required.',403);
  return uid;
}

export const serviceKey=()=>process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const dbUrl=()=>process.env.NEXT_PUBLIC_SUPABASE_URL;
export const pubKey=()=>process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export class Fault extends Error{constructor(message,status=400){super(message);this.status=status}}
export const now=()=>new Date().toISOString();
export function same(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length && timingSafeEqual(x,y)}
function key(purpose){if(!serviceKey())throw new Fault('Database credential is missing.',503);return createHmac('sha256',serviceKey()).update('oparax-outreach-v1/'+purpose).digest()}
export function seal(value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key('mailbox'),iv),data=Buffer.concat([c.update(value,'utf8'),c.final()]);return [iv,c.getAuthTag(),data].map(v=>v.toString('base64url')).join('.')}
export function unseal(value){const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64url'));const c=createDecipheriv('aes-256-gcm',key('mailbox'),iv);c.setAuthTag(tag);return Buffer.concat([c.update(data),c.final()]).toString()}
export function leaveToken(id){return createHmac('sha256',key('unsubscribe')).update(id).digest('base64url')}
export async function rpc(name,body={}){const secret=serviceKey();if(!secret||!dbUrl())throw new Fault('Database configuration is unavailable.',503);
const res=await fetch(dbUrl()+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:secret,...(secret.startsWith('eyJ')?{Authorization:'Bearer '+secret}:{}),'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)});
if(!res.ok)throw new Fault('Workspace storage is unavailable ('+res.status+').',503);
const payload=await res.text();return payload?JSON.parse(payload):null}
export const read=()=>rpc('outreach_user_read',{uid:workspaceId()});
export async function edit(change){for(let attempt=0;attempt<12;attempt++){const {rev,data}=await read();const result=change(data);if(await rpc('outreach_user_save',{uid:workspaceId(),expected:rev,next_data:data}))return result}throw new Fault('Workspace changed during this action. Try again.',409)}
export function event(d,text){d.events.unshift({id:crypto.randomUUID(),at:now(),text});d.events=d.events.slice(0,350)}
// Project the user's dashboard at its trust boundary. Provider credentials, worker
// claims and verification inputs may all live beside these display fields.
function fields(record,names) {
  return Object.fromEntries(names.split(' ').filter(key=>Object.hasOwn(record||{},key)).map(key=>[key,record[key]]));
}
const items=(values,names)=>Array.isArray(values)?values.map(v=>fields(v,names)):[];
const receiptFields='status from to person at agentId prospectId draftId requestId provider providerId channel';
const personFields='person role company linkedinUrl salesNavigatorUrl sourceUrl reason';
function publicLead(l) {
  const output=fields(l,'id botId matchedBotIds identity origin company person role source sourceDate evidence fit email linkedinUrl linkedinState linkedinSource subject body linkedin followUp draftQuestion status stage due at visual reply replyAt repliedAt replyState lastContactedAt sentAt');
  if(l.companyVerification)output.companyVerification=fields(l.companyVerification,'name source evidence domain identitySource identityEvidence matchType');
  if(l.linkedinEvidence)output.linkedinEvidence=typeof l.linkedinEvidence==='string'?l.linkedinEvidence:fields(l.linkedinEvidence,'source quote evidence title');
  if(l.emailEvidence)output.emailEvidence=fields(l.emailEvidence,'source email at validation type');
  if(l.rocketReachLookup)output.rocketReachLookup=fields(l.rocketReachLookup,'state at');
  if(l.reviewDrafts)output.reviewDrafts=items(l.reviewDrafts,'id botId at channel sender senderEmail subject body linkedin recipientEmail recipientProfile');
  if(l.outreachReceipts)output.outreachReceipts=items(l.outreachReceipts,receiptFields);
  if(l.discoverySources)output.discoverySources=items(l.discoverySources,'source agentId at detail url');
  if(l.selectedSources)output.selectedSources=items(l.selectedSources,'agentId source at salesNavigatorUrl');
  return output;
}
function selectedReceipt(receipt) {
  return {...fields(receipt,'source at received saved existing'),...limitSkips(receipt),held:items(receipt.held,personFields),verified:items(receipt.verified,personFields)};
}
function limitSkips(receipt) {
  return Number.isSafeInteger(receipt.skippedAtLimit)&&receipt.skippedAtLimit>=0?{skippedAtLimit:receipt.skippedAtLimit}:{};
}
function safeCounts(counts) {
  return Object.fromEntries(Object.entries(counts||{}).filter(([,v])=>typeof v==='boolean'||Number.isFinite(v)));
}
function visibleCeiling(b) {
  const job=b.researchJob;
  if(job?.plan?.limitVersion===2)return Number.isSafeInteger(job.goal)&&job.goal>0?job.goal:null;
  // Earlier jobs persisted 50 even when the customer gave no limit.
  return limitForContext(b,Array.isArray(job?.plan?.roles)?job.plan.roles:[]);
}
function researchReceipt(receipt) {
  if(!['limit_reached','sources_exhausted','diminishing_returns','source_error','model_budget'].includes(receipt?.reason))return undefined;
  const output={reason:receipt.reason};
  for(const key of ['uniqueCandidates','uniqueQualified','productiveBatches','successfulBatches','distinctQueries','heldForEvidence']){
    if(Number.isSafeInteger(receipt[key])&&receipt[key]>=0)output[key]=receipt[key];
  }
  output.ceiling=Number.isSafeInteger(receipt.ceiling)&&receipt.ceiling>0?receipt.ceiling:null;
  if(Array.isArray(receipt.sourceFamilies))output.sourceFamilies=receipt.sourceFamilies.filter(value=>typeof value==='string').slice(0,7).map(value=>value.slice(0,90));
  for(const key of ['scope','summary'])if(typeof receipt[key]==='string')output[key]=receipt[key].slice(0,2000);
  return output;
}
function publicAgent(d,b) {
  const agent=fields(b,'id name brief active autoEmail cap cadence delay at last next day used error provisional researchRequestedAt researchActivityJob');
  const ceiling=b.sourceTask||b.researchJob?visibleCeiling(b):null;
  const chatTurn=publicTurn(d,b);if(chatTurn)agent.chatTurn=chatTurn;
  agent.customSkillIds=assignedCustomSkillIds(d,b);
  agent.modelPreference=normalizeModelPreference(b.modelPreference);
  if(b.lastModelUsage)agent.lastModelUsage=fields(b.lastModelUsage,'modelId requestedModel preference task at inputTokens outputTokens costUsd costBasis');
  agent.searchSources=selectedSearchSources(b);
  if(agent.searchSources.length)agent.searchSource=agent.searchSources[0];
  agent.salesSkills=salesSkills(d,b);
  agent.sourceStates=sourceStates(d,b);
  agent.mailboxScopeRemembered=mailboxAuthorized(d,b);
  if(b.sourceTask){
    agent.taskQualified=qualifiedForTask(d,b).length;
    if(ceiling)agent.taskGoal=ceiling;
  }
  agent.mailboxScopeSuggestion=fields(mailboxScopeSuggestion(b),'company domain days mailboxKind');
  if(b.searchGate)agent.searchGate=fields(b.searchGate,'status source sources question');
  if(b.clarifications)agent.clarifications=items(b.clarifications,'question answer');
  if(b.lease)agent.lease=fields(b.lease,'until');
  if(b.researchActivity)agent.researchActivity=items(b.researchActivity,'id at kind text source');
  if(b.researchJob)agent.researchJob={...fields(b.researchJob,'id qualified pages status updatedAt'),goal:ceiling,counts:safeCounts(b.researchJob.counts)};
  if(b.lastRun)agent.lastRun={...fields(b.lastRun,'at model status target summary question'),counts:safeCounts(b.lastRun.counts)};
  const receipt=researchReceipt(b.lastRun?.receipt);
  if(receipt)agent.lastRun.receipt=receipt;
  if(!ceiling&&b.researchJob?.plan?.limitVersion!==2&&b.researchJob?.status==='goal_met'){
    agent.researchJob.status='completed';
    if(agent.lastRun?.status==='goal_met')Object.assign(agent.lastRun,{status:'completed',summary:'This earlier research run stopped after '+(agent.researchJob.qualified||0)+' verified contacts.'});
  }
  if(b.inbox)agent.inbox=fields(b.inbox,'email');
  if(b.inbound)agent.inbound=items(b.inbound,'id from subject preview at');
  if(b.replyState)agent.replyState=Object.fromEntries(Object.entries(b.replyState).filter(([,v])=>['sending','sent','check delivery'].includes(v)));
  if(b.rocketReach){
    agent.rocketReach=fields(b.rocketReach,'status');
    if(b.rocketReach.receipt)agent.rocketReach.receipt=fields(b.rocketReach.receipt,'source status at message received checked goal qualified saved existing held');
    if(b.rocketReach.results)agent.rocketReach.results=items(b.rocketReach.results,'id person company role linkedinUrl');
  }
  if(b.lastMailboxResearch)agent.lastMailboxResearch={...fields(b.lastMailboxResearch,'source mailboxKind company domain days at status examined correspondents saved existing held error message'),...limitSkips(b.lastMailboxResearch)};
  if(b.lastSelectedImport)agent.lastSelectedImport=selectedReceipt(b.lastSelectedImport);
  if(b.lastSelectedImports)agent.lastSelectedImports=Object.fromEntries(Object.entries(b.lastSelectedImports)
    .filter(([provider,v])=>['linkedin','sales_navigator'].includes(provider)&&v)
    .map(([provider,v])=>[provider,selectedReceipt(v)]));
  return agent;
}
function publicMessage(m) {
  const msg=fields(m,'id botId role content at');
  if(!m.details)return msg;
  const x=m.details;
  msg.details=fields(x,receiptFields+' type sources source prospectIds company recipientEmail recipientProfile sender senderEmail subject body linkedin requiresConfirmation');
  if(x.choices)msg.details.choices=items(x.choices,'value label');
  return msg;
}
export function view(d){
  const provider=d.rocketReach||{};
  return {
    businessMemory:projectBusinessMemory(d.businessMemory),customSkills:customSkillLibrary(d),
    salesConnectors:salesConnectors(d),bots:(d.bots||[]).map(b=>publicAgent(d,b)),leads:(d.leads||[]).filter(isPublishedProspect).map(publicLead),
    events:items(d.events,'id at text'),messages:(d.messages||[]).map(publicMessage),agentMailConnected:!!d.agentMailKey,
    mailbox:d.mailbox?fields(d.mailbox,'email address'):null,linkedinMessaging:linkedinMessagingState(d),
    rocketReach:{connected:!!provider.key,...fields(provider,'state dailySearchLimit dailyLookupLimit')},
  };
}
export async function verifiedUser(req){const token=req.headers.get('authorization')||'';if(!/^Bearer [^ ]+$/.test(token))throw new Fault('Sign in to your workspace.',401);
const r=await fetch(dbUrl()+'/auth/v1/user',{headers:{apikey:pubKey(),authorization:token},cache:'no-store'});if(!r.ok)throw new Fault('Please sign in again.',401);const u=await r.json();if(!u.id||!u.email||!u.email_confirmed_at)throw new Fault('Verify your email to open your workspace.',403);return u}
export function failure(e){if(!e.status)console.error('Outreach operation failed',e.name);return Response.json({error:e.status?e.message:'The operation could not finish. Please try again.'},{status:e.status||500})}
