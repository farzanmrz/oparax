import {limitForContext} from './research-limit.mjs';
import {sourceSkillEnabled} from './sales-skills.mjs';
import {selectedSearchSources,sourceLabel} from './search-source.mjs';
import {mailboxBriefSignature} from './mailbox-scope.mjs';
import {isPublishedProspect,belongsToCampaign} from './qualification.mjs';

export function mailboxAuthorized(d,b) {
  const c=b.mailboxResearchConsent;
  if(!c||!c.mailboxId||c.signature!==mailboxBriefSignature(b))return false;
  const mailbox=c.mailboxKind==='agentmail'?d.agentMailKey&&b.inbox?.id&&'agentmail/'+b.inbox.id:d.mailbox?.id&&'imap/'+d.mailbox.id;
  return mailbox===c.mailboxId;
}
export function qualifiedForTask(d,b) {
  const task=b.sourceTask;
  const result=new Set(b.researchJob?.qualifiedIds||[]);
  for(const p of d.leads||[]){
    if(!isPublishedProspect(p)||!belongsToCampaign(p,b.id))continue;
    if(!task||[...(p.discoverySources||[]),...(p.selectedSources||[])].some(s=>s.agentId===b.id&&(s.lastVerifiedAt||s.at)>=task.at))result.add(p.id);
  }
  return [...result];
}
export function qualificationBudget(d,b) {
  const ids=new Set(qualifiedForTask(d,b));
  const ceiling=limitForContext(b,b.researchJob?.plan?.roles);
  return {ids,ceiling:ceiling??Infinity};
}
export function sourceStates(d,b) {
  const states={};
  for(const source of selectedSearchSources(b)){
    const task=b.sourceTask?.providers?.[source];
    let status,summary;
    if(!sourceSkillEnabled(b,source)){status='disabled';summary=sourceLabel(source)+' research is disabled in this agent’s skills.';}
    else if(source==='web'){
      status=b.researchJob?.status||(b.researchRequestedAt?'queued':'ready');
      summary=b.lastRun?.summary||(b.researchRequestedAt?'Public web research is queued.':'Public web research is ready.');
    }else if(source==='linkedin'||source==='sales_navigator'){
      const receipt=b.lastSelectedImports?.[source]||b.lastSelectedImport;
      if(receipt?.source===source){status='selection_verified';summary='Your latest '+sourceLabel(source)+' selection included '+receipt.received+' contacts. '+(receipt.saved||0)+' were newly saved.';}
      else {status='awaiting_selection';summary='Open '+sourceLabel(source)+' on the agent computer and select the people to verify.';}
    }else if(source==='email'){
      const receipt=b.lastMailboxResearch;
      if(!d.mailbox?.id&&!(d.agentMailKey&&b.inbox?.id)){status='needs_connection';summary='Connect a mailbox or provision an AgentMail inbox to research email.';}
      else if(receipt&&(!b.sourceTask||receipt.at>=b.sourceTask.at)){status=receipt.status||'completed';summary=receipt.message||'The mailbox search examined '+(receipt.examined||0)+' records and newly saved '+(receipt.saved||0)+' contacts.';}
      else if(!mailboxAuthorized(d,b)){status='needs_consent';summary='Confirm the company, work domain and time window before I search your email.';}
      else {status=task?.status||'ready';summary=task?.summary||'The authorized mailbox search is '+status+'.';}
    }else if(source==='rocketreach'){
      const receipt=b.rocketReach?.receipt;
      if(!d.rocketReach?.key){status='needs_connection';summary='Connect RocketReach to search its professional directory.';}
      else if(receipt&&(!b.sourceTask||receipt.at>=b.sourceTask.at)){status=receipt.status;summary=receipt.message||'RocketReach returned '+(receipt.received||0)+' contacts.';}
      else {status=task?.status||'ready';summary=task?.summary||'The RocketReach search is '+status+'.';}
    }
    states[source]={status,summary};
  }
  return states;
}
