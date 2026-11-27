import {createHash} from 'node:crypto';
import {Fault,edit,event,now,read,workspaceId} from './store.mjs';
import {bot,createBot,note,text} from './domain.mjs';
import {linkedinProfileUrl} from './profile-url.mjs';
import {belongsToCampaign,isPublishedProspect} from './qualification.mjs';
import {ensureResearchJob,queueResearch} from './research-job.mjs';
import {normalizeSearchSource,explicitSearchSource,requestingSourceChoice} from './search-source.mjs';
import {showSourceGate} from './research-access.mjs';
import {planCommand,writeDraft} from './conversation-model.mjs';

const fingerprint=s=>createHash('sha256').update(s).digest('base64url');
const currentThreads=new Map();
const activeLease=b=>b.lease&&Date.parse(b.lease.until)>Date.now();
const scoped=(d,b)=>(d.leads||[]).filter(p=>isPublishedProspect(p)&&(!b||b.provisional||belongsToCampaign(p,b.id)));
const history=(d,id)=>id?d.messages.filter(m=>m.botId===id).slice(-18):[];
const turnVersion=(d,b)=>b?JSON.stringify([b.brief,b.lastRun?.question||'',d.messages.findLast(m=>m.botId===b.id&&m.role==='user')?.id||'']):'';
function choiceOnly(message) {
  return !!normalizeSearchSource(message)||/^(?:please )?(?:use|search|choose|try|switch to|look (?:on|in)|let['’]s use)\s+(?:the )?(?:public (?:web|sources)|open web|linkedin(?: sales navigator)?|sales nav(?:igator)?)(?: (?:this time|instead|please|only))?[.!]?$/i.test(message.trim());
}
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);

function cached(data,input,hash) {
  if(!hasOwn(data.conversationReceipts,input.requestId))return null;
  const receipt=data.conversationReceipts[input.requestId];
  if(receipt.hash!==hash||(input.id&&receipt.agentId!==input.id))throw new Fault('That message ID already belongs to another message.',409);
  const b=bot(data,receipt.agentId);
  return {agentId:b.id,work:receipt.jobId===b.researchRequestedAt&&b.researchRequestedAt&&!activeLease(b)?
    {requestedAt:b.researchRequestedAt,page:b.researchJob?.pages||0}:null};
}

function statusReply(d,b) {
  const job=b.researchJob,leads=scoped(d,b);
  if(b.searchGate){
    const last=b.lastSelectedImport;
    if(b.searchGate.status==='awaiting_selection'&&last&&last.source===b.searchSource){
      const checked=Array.isArray(last.verified)?last.verified.length:0,held=Array.isArray(last.held)?last.held.length:0;
      return 'Your latest selection contained '+last.received+' contacts. '+checked+' passed verification, '+last.saved+' were newly saved, and '+held+' were held for more evidence.';
    }
    return b.searchGate.question;
  }
  if(!job&&!b.lastRun)return leads.length?leads.length+' verified '+(leads.length===1?'prospect is':'prospects are')+' available. No research batch has started in this conversation.':'No search has started in this conversation. Tell me the employer or market and who you want to reach.';
  const state=b.lastRun||{},summary=state.summary||'Your search is queued.';
  let tally='';
  if(job){
    const profiles=Array.isArray(job.candidates)?job.candidates.filter(value=>!!linkedinProfileUrl(value)).length:null;
    const surfaced=profiles===null?(job.counts?.candidates||0)+' candidate records':profiles+' distinct public profile '+(profiles===1?'URL':'URLs');
    const checks=job.counts?.checked||0;
    tally=' The search has surfaced '+surfaced+' and completed '+checks+' source '+(checks===1?'check.':'checks.')+' This run has qualified '+job.qualified+' of '+job.goal+' contacts.';
  }
  return summary+tally+(state.question?' '+state.question:'');
}

function resultsReply(d,b) {
  const prospects=scoped(d,b),show=prospects.slice(0,12);
  if(!show.length)return {type:'prospects',content:'There are no verified prospects in this conversation yet.'+(b.researchRequestedAt?' The research is still running.':''),prospectIds:[]};
  const count=show.length===prospects.length?'Here '+(show.length===1?'is the verified contact':'are the '+show.length+' verified contacts'):'Here are the first '+show.length+' of '+prospects.length+' verified contacts';
  return {type:'prospects',content:count+'.\n\n'+show.map(l=>l.person+' — '+l.role+', '+l.company+'\n'+l.linkedinUrl).join('\n\n'),prospectIds:show.map(l=>l.id)};
}

function replaceTarget(b,brief,allowPublic) {
  // An old VM can finish unwinding, but its writes are fenced by the new lease ID.
  const original=activeLease(b)?b.lease:null;
  if(original&&!original.supersededWorker){b.lease={id:crypto.randomUUID(),until:original.until,supersededWorker:original.id};}
  if(!original)b.lease=null;
  const previous=b.researchRequestedAt||b.researchJob?.id;
  const nextId=new Date(Math.max(Date.now(),(Date.parse(previous)||0)+1)).toISOString();
  b.brief=brief;b.error=null;
  delete b.lastRun;delete b.researchJob;delete b.researchWake;delete b.researchRequestedAt;delete b.clarifications;delete b.provisional;delete b.searchGate;
  if(!allowPublic)return null;
  ensureResearchJob(b,nextId).searchSource='web';
  return {requestedAt:nextId,page:0};
}

function recentDraft(lead,agentId){
  const latest=(lead.reviewDrafts||[]).findLast(d=>d.botId===agentId);
  return latest?{...lead,...latest,id:lead.id}:lead;
}

function reply(d,b,content,details) {
  note(d,b.id,'assistant',content);
  if(details)d.messages.at(-1).details=details;
}

function cheapIntent(message) {
  const prompt=message.trim().toLowerCase().replace(/[?.!]+$/,'');
  if(/^(status|progress|research status|what is the status of this research|what('|’)s the status|how is (it|the search|the research) going|how many (contacts|people|prospects|leads) (have you found|so far))$/.test(prompt))return {action:'status'};
  if(/^(show (me )?(the |my |our )?(results|prospects|matches|qualified leads)|list (the |my )?(results|prospects|qualified leads)|who did you find|results)$/.test(prompt))return {action:'results'};
}

async function processTurn(input,services) {
  const get=services.read||read,change=services.edit||edit,plan=services.plan||planCommand,draft=services.draft||writeDraft;
  const hash=fingerprint(input.searchSource?JSON.stringify([input.message,input.searchSource]):input.message);
  for(let attempt=0;attempt<3;attempt++){
    const {data}=await get();
    const prior=cached(data,input,hash);if(prior)return prior;
    const agent=input.id?bot(data,input.id):null;
    const version=turnVersion(data,agent),thread=history(data,agent?.id);
    const people=scoped(data,agent);
    const requestedSource=input.searchSource||explicitSearchSource(input.message);
    const ambiguousSource=!requestedSource&&requestingSourceChoice(input.message);
    const pickedOnly=!!requestedSource&&choiceOnly(input.message);
    let decision=pickedOnly&&agent&&!agent.provisional?{action:'research',name:agent.name,brief:agent.brief}:
      pickedOnly&&(!agent||agent.provisional)?{action:'clarify',question:'Who should I look for? Give me the employer or market and the roles you want.'}:
      cheapIntent(input.message)||await plan({message:input.message,agent,history:thread,prospects:people});
    if(agent&&!agent.provisional&&(ambiguousSource||requestedSource)&&['answer','clarify'].includes(decision.action)){
      decision={action:'research',brief:agent.brief,name:agent.name};
    }
    let written=null;
    if(decision.action==='draft'){
      const recipient=people.find(l=>l.id===decision.prospectId);
      if(!recipient)throw new Fault('The requested prospect is no longer available. Refresh and try again.',409);
      written=await draft({message:input.message,agent,history:thread,prospect:recentDraft(recipient,agent?.id),channel:decision.channel});
    }

    const result=await change(d=>{
      const replay=cached(d,input,hash);if(replay)return replay;
      let b=input.id?bot(d,input.id):null;
      if(b&&turnVersion(d,b)!==version)return {replan:true};
      const isNew=!b||b.provisional;
      if(!b){
        const bId=createBot(d,{name:decision.name||'Sales conversation',brief:decision.brief||input.message.slice(0,2500)});
        b=bot(d,bId);b.provisional=true;
      }
      const canSee=scoped(d,b),at=now();
      note(d,b.id,'user',input.message);d.messages.at(-1).requestId=input.requestId;
      let work=null;
      const selecting=!!requestedSource&&(['research','refine'].includes(decision.action)||pickedOnly||isNew&&decision.action==='clarify');
      const previousSource=b.searchSource;
      if(ambiguousSource)delete b.searchSource;
      else if(selecting)b.searchSource=requestedSource;
      if(decision.action==='research'||decision.action==='refine'){
        const priorJob=b.researchRequestedAt,previousQuestion=b.lastRun?.question;
        const publicSelected=b.searchSource==='web',existingJob=b.researchJob;
        const sameBrief=pickedOnly||decision.brief.trim()===b.brief.trim();
        const priorPublic=(!previousSource||previousSource==='web')&&(!existingJob?.searchSource||existingJob.searchSource==='web');
        const confirmExisting=!!(publicSelected&&selecting&&existingJob&&priorPublic&&sameBrief);
        const refining=!isNew&&!confirmExisting&&(decision.action==='refine'||b.lastRun?.status==='needs_input');
        const keepTerminal=confirmExisting&&['goal_met','needs_input'].includes(existingJob.status);
        if(isNew||refining||ambiguousSource||selecting&&previousSource!==b.searchSource&&!confirmExisting){
          const answered=refining&&previousQuestion?[...(b.clarifications||[]),{question:previousQuestion,answer:input.message}].slice(-16):null;
          work=replaceTarget(b,decision.brief,publicSelected);
          if(answered)b.clarifications=answered;
          if(isNew)b.name=decision.name||'Sales research';
        }else if(publicSelected){
          delete b.searchGate;
          if(!keepTerminal){
            const requestedAt=queueResearch(b,{resume:confirmExisting||existingJob?.status==='failed'});
            work={requestedAt,page:b.researchJob?.pages||0};
          }
          if(b.researchJob)b.researchJob.searchSource='web';
        }
        const phrase=refining?'I’ve updated the search to this target. ':priorJob&&!isNew||confirmExisting?'I’m continuing this search. ':'I’m starting this search. ';
        if(publicSelected)reply(d,b,keepTerminal?statusReply(d,b):phrase+b.brief+(activeLease(b)&&refining?' The current batch will yield to the revised target.':''),{type:'research',source:'web'});
        else showSourceGate(d,b);
        if(refining)event(d,b.name+' · targeting updated from conversation');
      }else if(decision.action==='status'){
        reply(d,b,statusReply(d,b),{type:'research'});
      }else if(decision.action==='results'){
        const {content,...details}=resultsReply(d,b);reply(d,b,content,details);
      }else if(decision.action==='draft'){
        const recipient=canSee.find(l=>l.id===decision.prospectId);
        if(!recipient)throw new Fault('The requested prospect is no longer published.',409);
        const details={type:'prospectDraft',prospectId:recipient.id,person:recipient.person,company:recipient.company,channel:decision.channel,...written};
        const record={id:input.requestId,botId:b.id,at,channel:decision.channel,...written};
        (recipient.reviewDrafts||=[]).push(record);
        const format=decision.channel==='both'?'email and LinkedIn drafts':decision.channel==='email'?'email draft':'LinkedIn draft';
        reply(d,b,'Your '+format+' '+(decision.channel==='both'?'are':'is')+' ready for review.',details);
        event(d,'Prepared a '+decision.channel+' draft for '+recipient.person);
      }else if(decision.action==='clarify'){
        reply(d,b,decision.question,{type:'clarification'});
      }else{
        reply(d,b,decision.answer);
      }
      (d.conversationReceipts||={})[input.requestId]={hash,agentId:b.id,...(work?{jobId:work.requestedAt}:{})};
      return {agentId:b.id,work:activeLease(b)?null:work};
    });
    if(!result.replan)return result;
  }
  throw new Fault('Another message changed this conversation. Retry to apply yours to its latest state.',409);
}

export async function messageAgent(raw,services={}) {
  const message=typeof raw.message==='string'?raw.message.trim():'';
  if(!message||message.length>6000)throw new Fault('Write a message of 1 to 6,000 characters.');
  if(typeof raw.requestId!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,99}$/.test(raw.requestId)||Object.hasOwn(Object.prototype,raw.requestId))
    throw new Fault('A valid client message ID is required.');
  if(raw.id!=null&&(typeof raw.id!=='string'||!raw.id||raw.id.length>120))throw new Fault('Invalid agent identifier.');
  const searchSource=normalizeSearchSource(raw.searchSource);
  if(raw.searchSource!=null&&!searchSource)throw new Fault('Choose Public web, LinkedIn, or Sales Navigator.');
  const input={id:raw.id||null,requestId:raw.requestId,message,searchSource};
  const key=(services.workspaceId||workspaceId)()+'/'+input.requestId;
  const signature=fingerprint(JSON.stringify([input.id,message,searchSource]));
  const pending=currentThreads.get(key);
  if(pending){
    if(pending.signature!==signature)throw new Fault('That message ID is already in use.',409);
    return pending.result;
  }
  const result=processTurn(input,services);
  currentThreads.set(key,{signature,result});
  try{return await result;}finally{currentThreads.delete(key);}
}
