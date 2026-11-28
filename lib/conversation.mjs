import {cheapIntent} from './local-chat-intent.mjs';
import {ownerLimitInstructions,limitForContext} from './research-limit.mjs';
import {createHash} from 'node:crypto';
import {Fault,edit,event,now,read,workspaceId} from './store.mjs';
import {bot,createBot,note,text} from './domain.mjs';
import {belongsToCampaign,isPublishedProspect} from './qualification.mjs';
import {ensureResearchJob,queueResearch} from './research-job.mjs';
import {discoverySource,normalizeSearchSource,normalizeSearchSources,selectedSearchSources,parseSearchSources} from './search-source.mjs';
import {showSourceGate} from './research-access.mjs';
import {pendingSourceWork,stageSourceTasks} from './source-tasks.mjs';
import {sourceStates,qualifiedForTask} from './source-states.mjs';
import {prepareDelivery,commitDelivery} from './conversation-delivery.mjs';
import {initialSourceGateIntent,planCommand,writeDraft} from './conversation-model.mjs';
import {parseBusinessMemoryCommand,applyBusinessMemoryCommand} from './business-memory-chat.mjs';
import {salesContext,sellerVersion} from './sales-context.mjs';
import {requireSkill} from './sales-skills.mjs';
import {setModelPreference} from './agent-models.mjs';

const fingerprint=s=>createHash('sha256').update(s).digest('base64url');
const currentThreads=new Map();
const activeLease=b=>b.lease&&Date.parse(b.lease.until)>Date.now();
const scoped=(d,b)=>(d.leads||[]).filter(p=>isPublishedProspect(p)&&(belongsToCampaign(p,b?.id)||(!p.approvedAt&&(!b||b.provisional))));
const history=(d,id)=>id?d.messages.filter(m=>m.botId===id).slice(-18):[];
function turnVersion(d,b) {
  return JSON.stringify([sellerVersion(salesContext(d,b)),b?.modelPreference,b?.skillSettings,
    b?.brief,b?.lastRun?.question,b?d.messages.findLast(m=>m.botId===b.id&&m.role==='user')?.id:null]);
}
function choiceOnly(message,choice) {
  if(!choice.mode)return false;
  if(/\b(find|identify|discover|buyers?|designers?|contacts?|prospects?|people|who (?:is|are)|at [A-Z])\b/i.test(message))return false;
  return !!normalizeSearchSource(message)||/^(?:please |also )?(?:use|search|look|switch|change|choose|add|remove|drop|select|all|only|general web|web|public web|linkedin|sales nav|rocket ?reach|e-?mail)\b/i.test(message);
}
export function localTurnIntent(input,agent) {
  const teaching=parseBusinessMemoryCommand(input.message);
  const discussingSources=/^(?:(?:tell me|explain|what if|how (?:do|does|would|should|can)|what (?:does|happens|is|are)|why|should (?:I|we)|would (?:it|you)|if (?:I|we))\b)/i.test(input.message.trim());
  const parsed=teaching||discussingSources?{}:parseSearchSources(input.message);
  const choice=input.searchSources!==undefined?{mode:'replace',sources:input.searchSources}:input.searchSource?{mode:'replace',sources:[input.searchSource]}:parsed;
  const pickedOnly=choiceOnly(input.message,choice)||!!agent&&!!(input.searchSources||input.searchSource)&&!/(?:find|identify|discover|buyer|designer|prospects?|people|contacts?|employer|look for)/i.test(input.message);
  let decision;
  if(teaching)decision={action:'remember',command:teaching};
  else if(pickedOnly)decision=agent&&!agent.provisional?{action:'research',name:agent.name,brief:agent.brief}:
    {action:'clarify',question:'Who should I look for? Give me the employer or market and the roles you want.'};
  else {
    decision=cheapIntent(input.message);
    if(!decision&&(!agent||agent.provisional)&&!choice.mode&&!choice.ambiguous&&!selectedSearchSources(agent).length){
      decision=initialSourceGateIntent(input.message);
    }
  }
  return {choice,pickedOnly,decision};
}
function applyChoice(b,options) {
  const previous=selectedSearchSources(b);
  const sources=options.mode==='replace'?options.sources:options.mode==='remove'?previous.filter(s=>!options.sources.includes(s)):[...new Set([...previous,...options.sources])];
  b.searchSources=sources;if(sources.length)b.searchSource=sources[0];else delete b.searchSource;
}
function pauseWeb(b) {
  if(activeLease(b)&&!b.lease.supersededWorker)b.lease={id:crypto.randomUUID(),until:b.lease.until,supersededWorker:b.lease.id};
  if(b.researchRequestedAt&&b.researchJob)b.researchJob.status='paused_sources';
  delete b.researchRequestedAt;delete b.researchWake;
}
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);

function cached(data,input,hash) {
  if(!hasOwn(data.conversationReceipts,input.requestId))return null;
  const receipt=data.conversationReceipts[input.requestId];
  if(receipt.hash!==hash||(input.id&&receipt.agentId!==input.id))throw new Fault('That message ID already belongs to another message.',409);
  const b=bot(data,receipt.agentId);
  return {agentId:b.id,sourceWork:receipt.taskId?pendingSourceWork(data,b,receipt.taskId):[],send:receipt.send||null,work:receipt.jobId===b.researchRequestedAt&&b.researchRequestedAt&&!activeLease(b)?
    {requestedAt:b.researchRequestedAt,page:b.researchJob?.pages||0}:null};
}

function statusReply(d,b) {
  const job=b.researchJob,leads=scoped(d,b);
  const states=sourceStates(d,b),sources=selectedSearchSources(b);
  const mode=discoverySource(b);
  const others=sources.filter(s=>s!==mode&&!(mode==='web'&&s==='linkedin')).map(s=>states[s].summary).join(' ');
  const joined=()=>qualifiedForTask(d,b).length+' unique verified contacts across the selected sources.';
  if(b.searchGate?.status==='awaiting_source')return b.searchGate.question;
  if(!mode&&sources.length)return others+' '+joined();
  if(!job&&!b.lastRun)return leads.length?leads.length+' verified prospects are available. '+others:'No public research batch has started. '+others;
  const state=b.lastRun||{},summary=state.summary||'Your search is queued.';
  let tally='';
  if(job){
    const found=Number.isFinite(job.counts?.candidates)?job.counts.candidates:(job.candidates?.length||0);
    const surfaced=found+' candidate '+(found===1?'record':'records');
    const ceiling=job.plan?.limitVersion===2?job.goal:limitForContext(b,job.plan?.roles);
    const checks=job.counts?.checked||0;
    tally=' The search has surfaced '+surfaced+' and completed '+checks+' source '+(checks===1?'check.':'checks.')+' This run has qualified '+job.qualified+(ceiling?' of '+ceiling:'')+' contacts.';
  }
  return summary+tally+(state.question?' '+state.question:'')+(others?' '+others+' '+joined():'');
}

function resultsReply(d,b) {
  const currentIds=new Set(qualifiedForTask(d,b));
  const prospects=scoped(d,b).sort((a,c)=>Number(currentIds.has(c.id))-Number(currentIds.has(a.id))),show=prospects.slice(0,12);
  const reviews=(b.prospectReviews||[]).filter(p=>p.reviewState==='pending');
  if(reviews.length){
    const names=reviews.slice(0,12).map(p=>p.person+' — '+p.role+', '+p.company+'\n'+p.linkedinUrl).join('\n\n');
    return {type:'prospects',content:reviews.length+' verified '+(reviews.length===1?'match is':'matches are')+' ready for your decision. Choose Save prospect or Skip in this bot’s review cards. You have '+prospects.length+' saved for this bot.\n\n'+names,prospectIds:show.map(p=>p.id)};
  }
  if(!show.length)return {type:'prospects',content:'There are no verified prospects in this conversation yet.'+(b.researchRequestedAt?' The research is still running.':''),prospectIds:[]};
  const count=show.length===prospects.length?'Here '+(show.length===1?'is the verified contact':'are the '+show.length+' verified contacts'):'Here are the first '+show.length+' of '+prospects.length+' verified contacts';
  return {type:'prospects',content:count+'.\n\n'+show.map(l=>l.person+' — '+l.role+', '+l.company+'\n'+l.linkedinUrl).join('\n\n'),prospectIds:show.map(l=>l.id)};
}

function replaceTarget(b,brief,source) {
  // An old VM can finish unwinding, but its writes are fenced by the new lease ID.
  const original=activeLease(b)?b.lease:null;
  if(original&&!original.supersededWorker){b.lease={id:crypto.randomUUID(),until:original.until,supersededWorker:original.id};}
  if(!original)b.lease=null;
  const previous=b.researchRequestedAt||b.researchJob?.id;
  const nextId=new Date(Math.max(Date.now(),(Date.parse(previous)||0)+1)).toISOString();
  b.brief=brief;b.error=null;
  delete b.sourceTask;delete b.lastRun;delete b.researchJob;delete b.researchWake;delete b.researchRequestedAt;delete b.clarifications;delete b.provisional;delete b.searchGate;
  if(!source)return null;
  ensureResearchJob(b,nextId).searchSource=source;
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


async function processTurn(input,services) {
  const get=services.read||read,change=services.edit||edit,plan=services.plan||planCommand,draft=services.draft||writeDraft;
  const originalHash=fingerprint(input.searchSources!==undefined||input.botName||input.sender||input.draftId?JSON.stringify([input.message,input.searchSources,input.searchSource,input.botName,input.sender,input.draftId]):input.searchSource?JSON.stringify([input.message,input.searchSource]):input.message);
  const hash=input.modelPreference?fingerprint(originalHash+'/'+input.modelPreference):originalHash;
  for(let attempt=0;attempt<3;attempt++){
    const {data}=await get();
    const prior=cached(data,input,hash);if(prior)return prior;
    const agent=input.id?bot(data,input.id):null;
    const version=turnVersion(data,agent),thread=history(data,agent?.id);
    const people=scoped(data,agent);
    const seller=salesContext(data,agent);
    const modelAgent=agent||(!input.modelPreference?null:{provisional:true,modelPreference:input.modelPreference});
    const usage=[];
    const onUsage=entry=>{if(entry)usage.push(entry);};
    const {choice,pickedOnly,decision:localDecision}=localTurnIntent(input,agent);
    const ambiguousSource=!!choice.ambiguous;
    let decision=localDecision||await plan({message:input.message,agent:modelAgent,history:thread,prospects:people,...seller,onUsage});
    if(!decision.invalidProposal&&agent&&!agent.provisional&&(ambiguousSource||choice.mode)&&['answer','clarify'].includes(decision.action)){
      decision={action:'research',brief:agent.brief,name:agent.name};
    }
    let written=null,delivery=null;
    const makeDraft=args=>{
      requireSkill(agent,'draft_outreach');
      return draft({...args,...seller,onUsage});
    };
    if(decision.action==='send'){
      requireSkill(agent,decision.channel==='email'?'email_delivery':'linkedin_delivery');
      const prospect=people.find(l=>l.id===decision.prospectId);
      delivery=await prepareDelivery({decision:{...decision,explicitDraftId:input.draftId},message:input.message,agent,history:thread,prospect,prospects:people,requestId:input.requestId,sender:input.sender},makeDraft);
    }
    if(decision.action==='draft'){
      const recipient=people.find(l=>l.id===decision.prospectId);
      if(!recipient)throw new Fault('The requested prospect is no longer available. Refresh and try again.',409);
      written=await makeDraft({message:input.message,agent:modelAgent,history:thread,prospect:recentDraft(recipient,agent?.id),channel:decision.channel});
      if(written?.question)decision={action:'clarify',question:written.question};
    }

    const result=await change(d=>{
      const replay=cached(d,input,hash);if(replay)return replay;
      let b=input.id?bot(d,input.id):null;
      if(turnVersion(d,b)!==version)return {replan:true};
      const isNew=!b||b.provisional;
      if(!b){
        const bId=createBot(d,{name:input.botName||decision.name||'Sales conversation',brief:decision.brief||input.message.slice(0,2500)});
        b=bot(d,bId);b.provisional=true;
        if(input.modelPreference)setModelPreference(d,b,input.modelPreference);
      }
      if(usage.length)b.lastModelUsage=usage.at(-1);
      const canSee=scoped(d,b),at=now();
      if(b.eveInputs?.[input.requestId]?.failure)d.messages=d.messages.filter(m=>m.botId!==b.id||m.eveNoAction!==input.requestId);
      note(d,b.id,'user',input.message);d.messages.at(-1).requestId=input.requestId;
      let work=null,sourceWork=[],send=null,taskId=null;
      const selecting=!decision.invalidProposal&&!!choice.mode&&(['research','refine'].includes(decision.action)||pickedOnly||isNew&&decision.action==='clarify');
      if(ambiguousSource&&!decision.invalidProposal){applyChoice(b,{mode:'replace',sources:[]});pauseWeb(b);}
      else if(selecting)applyChoice(b,choice);
      if(decision.action==='research'||decision.action==='refine'){
        const priorJob=b.researchRequestedAt,previousQuestion=b.lastRun?.question;
        const sources=selectedSearchSources(b),source=discoverySource(b),existingJob=b.researchJob;
        const modeChanged=!!(source&&existingJob&&(existingJob.searchSource||'web')!==source);
        const sameBrief=pickedOnly||decision.brief.trim()===b.brief.trim();
        const confirmExisting=!!(source&&selecting&&existingJob&&sameBrief&&!modeChanged);
        const refining=!isNew&&!confirmExisting&&(decision.action==='refine'||b.lastRun?.status==='needs_input'&&!selecting||!sameBrief);
        const keepTerminal=confirmExisting&&['goal_met','needs_input','exhausted'].includes(existingJob.status);
        if(isNew||refining){
          const answered=refining&&previousQuestion?[...(b.clarifications||[]),{question:previousQuestion,answer:input.message}].slice(-16):null;
          const instructions=refining?[...ownerLimitInstructions(b),input.message]:[input.message];
          work=replaceTarget(b,decision.brief,source);
          b.researchLimitInput={brief:b.brief,instructions:instructions.slice(-16)};

          if(answered)b.clarifications=answered;
          if(isNew&&!b.provisionalNameExplicit)b.name=input.botName||decision.name||b.name||'Sales research';
          delete b.provisionalNameExplicit;
        }else if(modeChanged){
          const clarifications=b.clarifications,sourceTask=b.sourceTask;
          work=replaceTarget(b,b.brief,source);
          if(clarifications)b.clarifications=clarifications;
          if(sourceTask)b.sourceTask=sourceTask;
        }else if(source){
          delete b.searchGate;
          if(!keepTerminal){
            const requestedAt=queueResearch(b,{resume:confirmExisting||['failed','paused_sources','paused_skill'].includes(existingJob?.status)});
            work={requestedAt,page:b.researchJob?.pages||0};
          }
          if(b.researchJob)b.researchJob.searchSource=source;
        }else if(selecting||ambiguousSource)pauseWeb(b);
        if(!ambiguousSource){sourceWork=stageSourceTasks(d,b);taskId=b.sourceTask?.id;}
        const phrase=refining?'I’ve updated the search to this target. ':priorJob&&!isNew||confirmExisting?'I’m continuing this search. ':'I’m starting this search. ';
        if(source){
          const states=sourceStates(d,b);
          const notes=[];
          if(source==='linkedin'||sources.includes('linkedin')&&source==='web'&&states.linkedin.status!=='disabled')
            notes.push('I’ll search public LinkedIn profiles and check the evidence for each match.');
          for(const key of sources)if(key!==source&&key!=='linkedin'&&key!=='web')notes.push(states[key].summary);
          reply(d,b,keepTerminal?statusReply(d,b):[phrase+b.brief,...notes,...(activeLease(b)&&refining?['The current batch will yield to the revised target.']:[])].join(' '),{type:'research',source,sources});
        }else showSourceGate(d,b);
        if(refining)event(d,b.name+' · targeting updated from conversation');
      }else if(decision.action==='remember'){
        reply(d,b,applyBusinessMemoryCommand(d,b,decision.command),{type:decision.command.kind==='save'?'businessMemory':'clarification'});
      }else if(decision.action==='send'){
        ({send}=commitDelivery(d,b,canSee.find(p=>p.id===decision.prospectId),delivery,input.requestId));
      }else if(decision.action==='status'){
        reply(d,b,statusReply(d,b),{type:'research'});
      }else if(decision.action==='results'){
        const {content,...details}=resultsReply(d,b);reply(d,b,content,details);
      }else if(decision.action==='draft'){
        const recipient=canSee.find(l=>l.id===decision.prospectId);
        if(!recipient)throw new Fault('The requested prospect is no longer published.',409);
        const details={type:'prospectDraft',draftId:input.requestId,prospectId:recipient.id,person:recipient.person,company:recipient.company,channel:decision.channel,...written};
        const record={id:input.requestId,botId:b.id,at,channel:decision.channel,recipientEmail:recipient.email||'',recipientProfile:recipient.linkedinUrl||'',...(input.sender?{sender:input.sender}:{}),...written};
        (recipient.reviewDrafts||=[]).push(record);
        const format=decision.channel==='both'?'email and LinkedIn drafts':decision.channel==='email'?'email draft':'LinkedIn draft';
        reply(d,b,'Your '+format+' '+(decision.channel==='both'?'are':'is')+' ready for review.',details);
        event(d,'Prepared a '+decision.channel+' draft for '+recipient.person);
      }else if(decision.action==='clarify'){
        reply(d,b,decision.question,{type:'clarification'});
      }else{
        reply(d,b,decision.answer);
      }
      (d.conversationReceipts||={})[input.requestId]={hash,agentId:b.id,...(send?{send}:{}),...(taskId?{taskId}:{}),...(work?{jobId:work.requestedAt}:{})};
      return {agentId:b.id,work:activeLease(b)?null:work,sourceWork,send};
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
  let searchSources;
  if(raw.searchSources!==undefined){
    if(!Array.isArray(raw.searchSources)||raw.searchSources.some(value=>!normalizeSearchSource(value)))throw new Fault('Choose recognized research sources.');
    searchSources=normalizeSearchSources(raw.searchSources);
  }
  const modelPreference=!raw.id&&raw.modelPreference!=null?raw.modelPreference:undefined;
  if(modelPreference!==undefined)setModelPreference(null,{},modelPreference);
  const botName=raw.id?'':text(raw.botName,65).replace(/[\x00-\x1f\x7f]/g,' ').trim();
  const sender=raw.sender||'';
  if(sender&&!['mailbox','agentmail'].includes(sender))throw new Fault('Choose a connected sender.');
  const draftId=text(raw.draftId,110);
  const input={id:raw.id||null,requestId:raw.requestId,message,searchSource,searchSources,botName,sender,draftId,modelPreference};
  const key=(services.workspaceId||workspaceId)()+'/'+input.requestId;
  const signature=fingerprint(JSON.stringify(input));
  const pending=currentThreads.get(key);
  if(pending){
    if(pending.signature!==signature)throw new Fault('That message ID is already in use.',409);
    return pending.result;
  }
  const result=processTurn(input,services).then(async outcome=>{
    if(!outcome.send)return outcome;
    try{
      const transport=services.sendOutreach||(await import('./outreach-send.mjs')).sendOutreach;
      const outreachReceipt=await transport(outcome.send);
      return {...outcome,outreachReceipt};
    }catch(e){
      if(!e.status)throw e;
      await (services.edit||edit)(d=>{
        const prior=d.conversationReceipts?.[input.requestId];
        if(prior&&!prior.deliveryError){prior.deliveryError=true;reply(d,bot(d,outcome.agentId),String(e.message).slice(0,500),{type:'deliveryStatus',status:'blocked'});}
      });
      return {...outcome,outreachReceipt:{status:'blocked',message:e.message}};
    }
  });
  currentThreads.set(key,{signature,result});
  try{return await result;}finally{currentThreads.delete(key);}
}
