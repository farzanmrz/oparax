import {withEveTurn} from './eve-bridge.mjs';
import {businessMemoryContext} from './business-memory.mjs';
import {activeCustomSkills,assignedCustomSkillIds} from './custom-skills.mjs';
import {salesSkills,salesConnectors} from './sales-skills.mjs';
import {normalizeModelPreference} from './agent-models.mjs';
import {recipientContext} from './recipient-context.mjs';
import {belongsToCampaign,isPublishedProspect} from './qualification.mjs';
import {sourceStates} from './source-states.mjs';
import {text} from './domain.mjs';

function safeText(value,max){
  return text(value,max*2).replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,'[credential]')
    .replace(/\bBearer\s+[\w.~-]+|\b(?:sk_(?:live|test)_|sk-|sb_secret_|github_pat_|ghp_)[\w-]{12,}/gi,'[credential]')
    .replace(/\b(password|api[ -]?key|access token|client secret)\s*(?:is|[:=])\s*[^\s,;]+/gi,'$1 [redacted]').slice(0,max);
}
const referenceTypes=new Set(['prospectDraft','sendReview','delivery','prospects','status','clarification','sourceChoice','browserConnection','research','teaching']);
function legacyHistory(messages,agentId,requestId){
  const relevant=(messages||[]).filter(m=>m.botId===agentId&&['user','assistant'].includes(m.role));
  const submitted=relevant.findIndex(m=>m.role==='user'&&m.requestId===requestId);
  const prior=submitted<0?relevant:relevant.slice(0,submitted);
  return prior.slice(-10).map(m=>{
    const details=m.details||{},type=referenceTypes.has(details.type)?details.type:'message';
    if(m.role==='user')return {role:'user',content:safeText(m.content,500)};
    const item={role:'assistant',type};
    if(['prospectDraft','sendReview','delivery','prospects'].includes(type)){
      if(typeof details.prospectId==='string')item.prospectId=details.prospectId.slice(0,100);
      if(type==='prospects'&&Array.isArray(details.prospectIds))item.prospectIds=details.prospectIds.filter(id=>typeof id==='string').slice(0,8);
      if(['email','linkedin','both'].includes(details.channel))item.channel=details.channel;
      if(type==='delivery'&&['sent','accepted','failed','unknown','sending'].includes(details.status))item.status=details.status;
      return item;
    }
    // Older assistant messages can contain copied article or private email material.
    // Restore a short clarification, not unstructured source, message or transcript bodies.
    const line=safeText(m.content,400).trim();
    if(type==='clarification'||type==='sourceChoice'||(!details.type&&line.length<=220&&line.endsWith('?')&&!/[\r\n@]|https?:|\b(?:subject|body|evidence|excerpt|quote)\s*:/i.test(line)))item.content=line;
    return item;
  }).filter(row=>row.content||row.type!=='message');
}
function contactList(data,b,command,history){
  const message=command.message;
  const prior=[...history].reverse().find(h=>h.prospectId||h.prospectIds?.length===1);
  const id=prior?.prospectId||prior?.prospectIds?.[0];
  // A new, provisional thread may refer to an already-saved prospect by name;
  // an established conversation reads only its own qualified contacts.
  const scoped=(data.leads||[]).filter(p=>isPublishedProspect(p)&&(b.provisional||belongsToCampaign(p,b.id)));
  const listing=/\b(?:show|list|see)\b.{0,32}\b(?:prospects|results|saved contacts|leads|matches)\b/i.test(message);
  const candidates=recipientContext(scoped,message,id,{limit:12,relevantOnly:!!b.provisional||!listing});
  const byId=new Map(scoped.map(p=>[p.id,p]));
  return candidates.map(p=>({...p,channels:{email:!!byId.get(p.id)?.email,linkedin:!!byId.get(p.id)?.linkedinUrl}}));
}
export async function eveSalesContext(ctx,deps={}){
  return withEveTurn(ctx,({data,agent,command})=>{
    const memory=businessMemoryContext(data),playbooks=activeCustomSkills(data,agent);
    const history=legacyHistory(data.messages,agent.id,command.requestId);
    const sourceStatesForAgent=Object.fromEntries(Object.entries(sourceStates(data,agent)).map(([id,state])=>[id,{status:safeText(state.status,60)}]));
    return {
      ownerMessage:safeText(command.message,6000),
      agent:{id:agent.id,name:safeText(agent.name,65),brief:safeText(agent.brief,2500),provisional:!!agent.provisional,
        modelPreference:normalizeModelPreference(agent.modelPreference),scheduleEnabled:!!agent.active,autoEmailEnabled:!!agent.autoEmail,
        ...(agent.lastRun?.question?{pendingQuestion:safeText(agent.lastRun.question,320)}:{})},
      businessProfile:memory,playbookNames:playbooks.map(p=>safeText(p.name,96)),sourceStates:sourceStatesForAgent,
      skills:salesSkills(data,agent).map(({id,label,enabled,connectorState})=>({id,label,enabled,connectorState})),
      connectors:salesConnectors(data).map(({id,label,status})=>({id,label,status})),
      prospects:contactList(data,agent,command,history),history,
    };
  },deps);
}
export async function evePlaybooks(ctx,deps={}){
  return withEveTurn(ctx,({data,agent})=>{
    const ids=assignedCustomSkillIds(data,agent);
    return activeCustomSkills(data,agent).map((p,i)=>({id:ids[i],name:safeText(p.name,96),instructions:safeText(p.instructions,4000)}));
  },deps);
}
