import {requireSkill,skillEnabled} from './sales-skills.mjs';
import {prepareCampaignDrafts} from './campaign-drafts.mjs';
import {resolveAgentModel} from './agent-models.mjs';
import {salesContext,sellerVersion,inferenceSeller} from './sales-context.mjs';
import {createHash} from 'node:crypto';
import {Fault,edit,read,seal,unseal,now} from './store.mjs';
import {addLead,associateQualifiedProspect,bot,email,text,verifiedProfileMatch} from './domain.mjs';
import {belongsToCampaign,isPublishedProspect} from './qualification.mjs';
import {recordProspectSource} from './provenance.mjs';
import {linkedinProfileUrl} from './profile-url.mjs';
import {qualifiedForTask} from './source-states.mjs';
import {selectedSearchSources} from './search-source.mjs';
import {verifySelections} from './selected-leads.mjs';
import {outreachDraft,planPrompt,validatePlan} from './research.mjs';

const base='https://api.rocketreach.co/api/v2/';
export const rocketReachLimits=Object.freeze({dailyLookupLimit:3,dailySearchLimit:10,pageSize:5,automaticPageSize:50});
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const signature=b=>JSON.stringify([b.brief,b.clarifications||[]]);
const operationKey=(id,action,requestId)=>createHash('sha256').update(JSON.stringify([id,action,requestId])).digest('hex');
const numericId=v=>/^\d{1,16}$/.test(String(v))?String(v):'';

async function api(key,path,{params={},body}={},deps={}) {
  const url=new URL(path,base);
  for(const [name,value] of Object.entries(params))url.searchParams.set(name,value);
  let response;
  try {
    response=await (deps.fetch||fetch)(url,{method:body?'POST':'GET',redirect:'error',cache:'no-store',
      headers:{'Api-Key':key,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  } catch {throw new Fault('RocketReach did not confirm the request. Check its activity before trying another lookup.',503);}
  if(!response.ok){
    const errors={401:'RocketReach rejected this API key. Reconnect your account.',402:'RocketReach reports insufficient credits.',
      403:'RocketReach declined access. Check your plan permissions and credits.',404:'RocketReach could not find this record.',
      429:'RocketReach rate-limited this request. Wait before trying again.'};
    throw new Fault(errors[response.status]||(response.status>=500?'RocketReach is temporarily unavailable.':'RocketReach declined the request. Check the search filters or your API plan.'),response.status>=400&&response.status<500?response.status:503);
  }
  try{return await response.json();}catch{throw new Fault('RocketReach returned an unreadable result.',502);}
}

function validAgent(d,id){
  const b=bot(d,id);requireSkill(b,'rocketreach_research');
  if(!selectedSearchSources(b).includes('rocketreach'))throw new Fault('Select RocketReach as a source for this agent first.',409);
  if(!d.rocketReach?.key)throw new Fault('Connect a RocketReach account with API access first.',409);
  return b;
}
function setReceipt(b,status,message,counts={}){
  const stage=b.rocketReach||={};
  stage.status=status;
  stage.receipt={source:'rocketreach',status,at:now(),message,...counts};
  return stage.receipt;
}
function assertRequestId(value){
  if(typeof value!=='string'||value.length<8||value.length>160||/[\x00-\x1f]/.test(value))throw new Fault('A request identifier is required.');
}
function claim(d,id,kind,requestId){
  assertRequestId(requestId);
  const b=validAgent(d,id),provider=d.rocketReach,key=operationKey(id,kind,requestId);
  const ledger=provider.ledger||=[];
  if(ledger.some(o=>o.key===key))return null;
  const at=now(),today=at.slice(0,10);
  const limit=kind==='lookup'?rocketReachLimits.dailyLookupLimit:rocketReachLimits.dailySearchLimit;
  if(ledger.filter(o=>o.kind===kind&&o.at.startsWith(today)).length>=limit)throw new Fault('The workspace has used its '+limit+' RocketReach '+(kind==='lookup'?'lookups':'searches')+' for today. The limit resets at 00:00 UTC.',429);
  // Keep a month of operation IDs across reconnects and UTC day changes. A submitted lookup also has a permanent per-profile receipt.
  provider.ledger=ledger.filter(o=>Date.parse(o.at)>Date.now()-32*86400000);
  provider.ledger.push({key,kind,at});
  return {key,sealed:provider.key,signature:signature(b),connection:provider.connection};
}
function stillCurrent(d,b,ticket){return skillEnabled(b,'rocketreach_research')&&!!d.rocketReach?.key&&d.rocketReach.connection===ticket.connection&&selectedSearchSources(b).includes('rocketreach')&&signature(b)===ticket.signature;}
function invalidateRejectedKey(d,ticket,error){
  if(error instanceof Fault&&error.status===401&&d.rocketReach?.key===ticket.sealed){
    delete d.rocketReach.key;
    d.rocketReach.state='invalid_key';
  }
}
async function planFor(b,deps,seller) {
  if(deps.plan)return deps.plan;
  if(b.rocketReachRun?.signature===signature(b)&&(b.rocketReachRun.sellerVersion||'')===sellerVersion(seller)&&b.rocketReachRun.plan)return b.rocketReachRun.plan;
  const context={brief:b.brief,clarifications:b.clarifications||[],seller:inferenceSeller(seller)};
  const model=deps.model||((...args)=>import('./agent.mjs').then(m=>m.model(...args)));
  const raw=await model([{role:'system',content:planPrompt+' For a sector-wide brief add industryFilter, a literal industry phrase present in the user’s text, and geographyFilter, a literal location if requested. Otherwise use empty strings.'},{role:'user',content:JSON.stringify(context)}],
    {...resolveAgentModel(b,{task:'planning',message:b.brief}),agentId:b.id,effort:'low',timeout:25000,maxTokens:1500});
  const plan=validatePlan(raw,context);
  const extra=JSON.parse(String(raw).replace(/^\s*`{3}(?:json)?\s*|\s*`{3}\s*$/gi,''));
  const supplied=[b.brief,...context.clarifications.map(c=>c.answer)].join(' ').toLowerCase();
  for(const name of ['industryFilter','geographyFilter']){
    const term=text(extra[name],100);
    if(term&&supplied.includes(term.toLowerCase()))plan[name]=term;
  }
  return plan;
}
function queryFor(plan,p){
  const company=text(p.company,150),role=text(p.role,150);
  if(company&&plan.employers.length&&!plan.employers.some(v=>norm(v)===norm(company)))throw new Fault('The RocketReach employer must match this research brief.');
  const companies=company?[company]:plan.employers.slice(0,8);
  const roles=role?[role]:plan.roles.slice(0,10);
  if(plan.question)throw new Fault(plan.question);
  if(!companies.length&&!plan.industryFilter)throw new Fault('Name an employer or industry in the brief to run RocketReach.');
  if(!roles.length)throw new Fault('Name the roles to search for in the brief.');
  return {current_title:roles,...(companies.length?{current_employer:companies}:{company_industry_keywords:[plan.industryFilter]}),
    ...(plan.geographyFilter?{geo:[plan.geographyFilter]}:{})};
}
function candidates(raw,limit=rocketReachLimits.pageSize){
  if(!Array.isArray(raw?.profiles))throw new Fault('RocketReach did not return a completed list of profiles.',502);
  const rows=[],seen=new Set();
  for(const rr of raw.profiles.slice(0,limit)){
    if(rr?.suppressed===true||String(rr?.suppressed).toLowerCase()==='true')continue;
    const person=text(rr?.name,120),company=text(rr?.current_employer,150),role=text(rr?.current_title,160),linkedinUrl=linkedinProfileUrl(rr?.linkedin_url);
    const id=numericId(rr?.id)||linkedinUrl;
    if(!id||seen.has(id))continue;
    seen.add(id);rows.push({id,person,company,role,linkedinUrl});
  }
  return rows;
}
async function qualify(id,rows,plan,anchors,deps) {
  const contexts=[...plan.companyContexts];
  if(plan.industryFilter)for(const row of rows)if(!contexts.some(c=>c.company===row.company)){
    contexts.push({company:row.company,industry:plan.industryFilter,industryTerms:[plan.industryFilter],domain:''});
  }
  return (deps.verifySelections||verifySelections)(id,rows,{...plan,companyContexts:contexts},anchors||{},deps);
}
function publish(d,b,batch){
  let saved=0,existing=0,held=batch.held.length;
  for(const {record} of batch.verified){
    if(!isPublishedProspect(record)){held++;continue;}
    const added=addLead(d,b,outreachDraft({...record,email:''}));
    const prospect=verifiedProfileMatch(d.leads,record);
    if(!isPublishedProspect(prospect)){held++;continue;}
    associateQualifiedProspect(prospect,b.id);
    recordProspectSource(prospect,{source:'rocketreach',agentId:b.id,at:now(),url:record.linkedinUrl,detail:'RocketReach search matched the independently verified role, employer and personal profile.'});
    if(added)saved++;else existing++;
  }
  return {saved,existing,held};
}
async function search(id,p,deps){
  const change=deps.edit||edit,get=deps.read||read;
  const d=(await get()).data,b=validAgent(d,id),original=signature(b);
  const seller=salesContext(d,b),plan=await planFor(b,deps,seller);
  const query=queryFor(plan,p);
  const ticket=await change(d=>{
    const live=validAgent(d,id);
    if(signature(live)!==original)throw new Fault('The brief changed. Reopen this agent.',409);
    const ticket=claim(d,id,'search',p.requestId);
    if(ticket){live.rocketReach={...(live.rocketReach||{}),results:[],searchKey:ticket.key};setReceipt(live,'searching','Searching RocketReach for up to five people.');}
    return ticket;
  });
  if(!ticket)return;
  try{
    const result=await api((deps.unseal||unseal)(ticket.sealed),'person/search',{body:{query,start:1,page_size:rocketReachLimits.pageSize}},deps);
    const rows=candidates(result);
    await change(d=>{
      const b=bot(d,id);
      if(!stillCurrent(d,b,ticket)||b.rocketReach?.searchKey!==ticket.key)return;
      b.rocketReach.results=rows;b.rocketReach.resultsSignature=original;
      setReceipt(b,rows.length?'awaiting_selection':'no_matches',rows.length?'Choose RocketReach candidates to verify.':'RocketReach returned no usable candidates for these filters.',{received:rows.length});
    });
  }catch(error){
    await change(d=>{const b=bot(d,id);if(stillCurrent(d,b,ticket)&&b.rocketReach?.searchKey===ticket.key)setReceipt(b,'failed',error instanceof Fault?error.message:'RocketReach verification was interrupted. You can verify the listed candidates again.');invalidateRejectedKey(d,ticket,error);});
    throw error;
  }
}
function recordImport(d,b,batch,received){
  const counts=publish(d,b,batch);
  return setReceipt(b,'checked','RocketReach checked '+received+' candidates. '+counts.saved+' saved, '+counts.existing+' already verified, '+counts.held+' held for evidence.',{received,...counts});
}
function nextIndex(payload,start,size){
  const pagination=payload.pagination||{};
  const count=Math.min(size,payload.profiles.length);
  if(!count)return null;
  const total=pagination.total??pagination.total_results;
  if(Number.isFinite(Number(total))&&total!==null&&start+count>Number(total))return null;
  if(Object.hasOwn(pagination,'next')&&pagination.next===null)return null;
  for(const candidate of [pagination.next_start,pagination.next]){
    const n=Number(candidate);
    if(Number.isSafeInteger(n)&&n>=start+count&&n<=10000)return n;
  }
  return count>=size&&start+count<=10000?start+count:null;
}
const remainingGoal=(goal,qualified)=>Number.isSafeInteger(goal)&&goal>0?Math.max(0,goal-qualified):Infinity;
function autoResult(b,run,totalQualified){
  const goalMet=remainingGoal(run.goal,totalQualified)===0;
  const numbers={received:run.received,checked:run.checked,saved:run.saved,existing:run.existing,held:run.held,goal:run.goal,qualified:totalQualified};
  const prefix='RocketReach checked '+run.checked+' of '+run.received+' candidates, with '+run.saved+' saved and '+run.held+' held. ';
  const finished=goalMet||(!run.pending.length&&(!run.next||run.pages>=rocketReachLimits.dailySearchLimit));
  run.complete=finished;
  if(!finished){
    setReceipt(b,'continuing',prefix+'The remaining candidates and next page are queued.',numbers);
    return {continuing:true};
  }
  const status=goalMet?'goal_met':run.next?'budget_limited':run.unavailable?'verification_incomplete':'exhausted';
  const endings={goal_met:'The research brief has reached its target.',budget_limited:'This run reached its ten-page search budget. More directory results may remain.',verification_incomplete:'The directory returned its final page. Public verification was unavailable for '+run.unavailable+' candidates.',exhausted:'The directory returned its final page for these filters.'};
  setReceipt(b,status,prefix+endings[status],numbers);
  return {continuing:false};
}
// The source worker reuses its durable request id. Each tick checks two small
// batches; only a new page can make a directory call. Enrichment is a separate action.
export async function runRocketReach(id,p={},deps={}){
  assertRequestId(p.requestId);
  const change=deps.edit||edit,get=deps.read||read,lease=crypto.randomUUID();
  const snapshot=(await get()).data,initial=validAgent(snapshot,id),original=signature(initial);
  const requested=agent=>agent.sourceTask?.providers?.rocketreach?.requestId;
  if(requested(initial)&&requested(initial)!==p.requestId)return {continuing:false};
  const seller=salesContext(snapshot,initial),plan=await planFor(initial,deps,seller);
  const query=queryFor(plan,p);
  const task=await change(d=>{
    const b=validAgent(d,id);
    if(requested(b)&&requested(b)!==p.requestId)return {done:true};
    if(signature(b)!==original)throw new Fault('The research brief changed before the RocketReach search.',409);
    let run=b.rocketReachRun;
    if(run?.requestId!==p.requestId||run.signature!==original||run.connection!==d.rocketReach.connection){
      run=b.rocketReachRun={requestId:p.requestId,signature:original,connection:d.rocketReach.connection,plan,sellerVersion:sellerVersion(seller),goal:plan.goal??null,
        next:1,pending:[],seen:[],pages:0,received:0,checked:0,saved:0,existing:0,held:0};
    }
    if(b.sourceTask)b.sourceTask.goal=plan.goal??null;
    if(run.complete)return {done:true};
    if(run.lease&&Date.parse(run.lease.until)>Date.now())return {busy:true};
    // A crashed provider request is ambiguous. Never issue the same page twice.
    if(run.inFlight){
      run.complete=true;setReceipt(b,'failed','RocketReach did not confirm delivery of the previous search page. Completed verification remains saved.');
      return {done:true};
    }
    const total=qualifiedForTask(d,b).length;
    const remaining=Math.min(remainingGoal(run.goal,total),Number.isSafeInteger(p.remaining)&&p.remaining>=0?p.remaining:Infinity);
    if(remaining===0){run.complete=true;setReceipt(b,'goal_met','The research brief has reached its target.',{goal:run.goal,qualified:total,checked:run.checked,saved:run.saved,held:run.held});return {done:true};}
    const ticket={signature:original,connection:run.connection};
    run.lease={id:lease,until:new Date(Date.now()+280000).toISOString()};
    if(run.pending.length)return {ticket};
    if(!run.next||run.pages>=rocketReachLimits.dailySearchLimit){delete run.lease;return {done:true,result:autoResult(b,run,total)};}
    const start=run.next,size=Math.min(remaining,rocketReachLimits.automaticPageSize),pageId=p.requestId+'.page.'+start;
    let paid;
    try{paid=claim(d,id,'search',pageId);}catch(error){
      if(!(error instanceof Fault)||error.status!==429)throw error;
      delete run.lease;run.complete=true;
      setReceipt(b,'budget_limited',error.message+' '+run.checked+' candidates checked, '+run.saved+' saved.',{checked:run.checked,saved:run.saved,held:run.held});
      return {done:true};
    }
    if(!paid){delete run.lease;run.complete=true;setReceipt(b,'failed','This RocketReach page was already requested. Check its status before starting another search.');return {done:true};}
    run.inFlight=start;run.pages++;
    setReceipt(b,'searching','Searching RocketReach for up to '+size+' candidates, starting at result '+start+'.');
    return {ticket:paid,start,size};
  });
  if(task.done)return task.result||{continuing:false};
  if(task.busy)return {continuing:true};
  try{
    if(task.start){
      const result=await api((deps.unseal||unseal)(task.ticket.sealed),'person/search',{body:{query,start:task.start,page_size:task.size}},deps);
      const rows=candidates(result,task.size);
      await change(d=>{
        const b=bot(d,id),run=b.rocketReachRun;
        if(!stillCurrent(d,b,task.ticket)||run?.lease?.id!==lease)return;
        const seen=new Set(run.seen),fresh=rows.filter(row=>!seen.has(row.linkedinUrl||row.id));
        run.seen=[...new Set([...run.seen,...fresh.map(row=>row.linkedinUrl||row.id)])];
        run.pending=fresh;run.received+=fresh.length;run.next=nextIndex(result,task.start,task.size);delete run.inFlight;
        b.rocketReach={...b.rocketReach,searchKey:operationKey(id,'auto',p.requestId),resultsSignature:original,results:rows};
      });
    }
    const state=(await get()).data,b=bot(state,id),run=b.rocketReachRun;
    if(!stillCurrent(state,b,task.ticket)||run?.lease?.id!==lease)return {continuing:false};
    const chunks=[run.pending.slice(0,6),run.pending.slice(6,12)].filter(group=>group.length);
    await Promise.all(chunks.map(async group=>{
      const batch=await qualify(id,group,plan,b.researchJob?.companyProofs,{...deps,seller});
      await prepareCampaignDrafts(batch.verified.map(item=>item.record),seller,{brief:b.brief,gateway:deps.model});
      return change(d=>{
        const live=bot(d,id),progress=live.rocketReachRun;
        if(!stillCurrent(d,live,task.ticket)||progress?.lease?.id!==lease)return;
        const remaining=remainingGoal(progress.goal,qualifiedForTask(d,live).length);
        const counts=publish(d,live,{held:batch.held,verified:batch.verified.slice(0,remaining)});
        const ids=new Set(group.map(r=>r.id));progress.pending=progress.pending.filter(r=>!ids.has(r.id));
        for(const key of ['held','saved','existing'])progress[key]+=counts[key];
        progress.unavailable=(progress.unavailable||0)+batch.held.filter(r=>r.evidenceUnavailable).length;
        progress.checked+=group.length;
        setReceipt(live,'verifying','RocketReach has checked '+progress.checked+' of '+progress.received+' candidates.',{checked:progress.checked,saved:progress.saved,held:progress.held});
      });
    }));
    return await change(d=>{
      const live=bot(d,id),run=live.rocketReachRun;
      if(!stillCurrent(d,live,task.ticket)||run?.lease?.id!==lease)return {continuing:false};
      delete run.lease;return autoResult(live,run,qualifiedForTask(d,live).length);
    });
  }catch(error){
    await change(d=>{
      const b=bot(d,id),run=b.rocketReachRun;
      if(!stillCurrent(d,b,task.ticket)||run?.lease?.id!==lease)return;
      delete run.lease;
      if(run.inFlight)run.complete=true;
      invalidateRejectedKey(d,task.ticket,error);
      setReceipt(b,'failed',error instanceof Fault?error.message:'RocketReach verification was interrupted. Completed matches remain saved.',{checked:run.checked,saved:run.saved,held:run.held});
    });
    throw error;
  }
}
async function importPeople(id,p,deps){
  const get=deps.read||read,change=deps.edit||edit;
  const d=(await get()).data,b=validAgent(d,id),original=signature(b),key=b.rocketReach?.searchKey;
  if(!key||b.rocketReach.resultsSignature!==original)throw new Fault('Run a new RocketReach search for this brief first.',409);
  if(!Array.isArray(p.profileIds)||!p.profileIds.length||p.profileIds.length>rocketReachLimits.pageSize)throw new Fault('Choose up to five RocketReach profiles.');
  const ids=new Set(p.profileIds.map(String)),rows=(b.rocketReach.results||[]).filter(row=>ids.has(row.id));
  if(rows.length!==ids.size)throw new Fault('Choose profiles returned by this agent’s latest RocketReach search.',409);
  const seller=salesContext(d,b),plan=await planFor(b,deps,seller);
  const batch=await qualify(id,rows,plan,b.researchJob?.companyProofs,{...deps,seller});
  await prepareCampaignDrafts(batch.verified.map(item=>item.record),seller,{brief:b.brief,gateway:deps.model});
  return change(d=>{
    const b=validAgent(d,id);
    if(b.rocketReach?.searchKey!==key||signature(b)!==original)throw new Fault('The search changed before verification finished.',409);
    return recordImport(d,b,batch,rows.length);
  });
}

function workAddress(profile,lead){
  if(profile?.status!=='complete'||norm(profile.name)!==norm(lead.person)||norm(profile.current_employer)!==norm(lead.company)
      ||linkedinProfileUrl(profile.linkedin_url)!==linkedinProfileUrl(lead.linkedinUrl))return '';
  const companyDomain=text(lead.companyVerification?.domain,253).toLowerCase()||text(profile.current_employer_domain,253).toLowerCase();
  if(!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(companyDomain))return '';
  const generic=/^(?:admin|billing|careers|contact|hello|help|hr|info|jobs|marketing|office|press|sales|support|team)@/i;
  const free=/(^|\.)(gmail|googlemail|outlook|hotmail|live|yahoo|aol|icloud|protonmail|proton)\.[a-z.]+$/i;
  for(const data of Array.isArray(profile.emails)?profile.emails:[]){
    const address=email(data?.email),domain=address.split('@')[1];
    if(profile.current_work_email&&email(profile.current_work_email)!==address)continue;
    if(data?.type==='professional'&&data.smtp_valid==='valid'&&address&&!generic.test(address)&&!free.test(domain)&&
       (domain===companyDomain||domain.endsWith('.'+companyDomain)))return address;
  }
  return '';
}
function checkLookupAllowance(account){
  const usage=Array.isArray(account?.credit_usage)?account.credit_usage:[];
  const exhausted=row=>row.remaining!==null&&row.remaining!==undefined&&Number(row.remaining)===0;
  const standard=usage.find(row=>['standard','standard_lookup','person_lookup_standard','lookup_standard','person_lookup'].includes(row.credit_type));
  const exportCredit=usage.find(row=>row.credit_type==='person_export'&&Number(row.allocated)>0);
  if(standard&&exhausted(standard))throw new Fault('RocketReach reports no standard lookup credits remaining.',402);
  if(exportCredit&&exhausted(exportCredit))throw new Fault('RocketReach reports no person-export credits remaining for this account.',402);
}
function existingPerson(d,id,leadId){
  const lead=d.leads.find(l=>l.id===leadId&&belongsToCampaign(l,id));
  if(!isPublishedProspect(lead))throw new Fault('Choose a verified prospect for this agent first.',409);
  return lead;
}
async function enrich(id,p,deps){
  const change=deps.edit||edit;
  const ticket=await change(d=>{
    const b=validAgent(d,id),lead=existingPerson(d,id,p.leadId),lookup=lead.rocketReachLookup;
    if(lead.email||lookup?.state==='complete'||lookup?.state==='no_work_email')throw new Fault('This prospect already has a completed lookup or email address.',409);
    if(d.suppressed?.includes(lead.email)||['stopped','replied','unsubscribed'].includes(lead.status))throw new Fault('This prospect is stopped or suppressed.',409);
    if(lookup?.providerId&&lookup.connection===d.rocketReach.connection){
      if(lookup.checkedAt&&Date.now()-Date.parse(lookup.checkedAt)<3000)throw new Fault('RocketReach is still checking this person. Try the status again in a few seconds.',429);
      lookup.checkedAt=now();
      return {key:lookup.key,providerId:lookup.providerId,sealed:d.rocketReach.key,connection:d.rocketReach.connection,signature:signature(b)};
    }
    if(lookup&&['started','unknown','pending'].includes(lookup.state))throw new Fault('A lookup was submitted for this person. Check its status in the original RocketReach account before starting another.',409);
    const ticket=claim(d,id,'lookup',p.requestId);
    if(!ticket)return null;
    lead.rocketReachLookup={key:ticket.key,state:'started',at:now(),connection:ticket.connection};
    setReceipt(b,'looking_up','One standard RocketReach email lookup was requested.');
    return {...ticket,linkedinUrl:linkedinProfileUrl(lead.linkedinUrl)};
  });
  if(!ticket)return;
  let submitted=false;
  try{
    const key=(deps.unseal||unseal)(ticket.sealed);
    if(!ticket.providerId){
      checkLookupAllowance(await api(key,'account/',{},deps));
      const state=(await (deps.read||read)()).data,agent=bot(state,id);
      if(!stillCurrent(state,agent,ticket))throw new Fault('The RocketReach connection or targeting changed before the lookup.',409);
      submitted=true;
    }
    const raw=ticket.providerId?await api(key,'person/checkStatus',{params:{ids:ticket.providerId}},deps):
      await api(key,'person/lookup',{params:{linkedin_url:ticket.linkedinUrl,lookup_type:'standard',return_cached_emails:'false'}},deps);
    const profile=Array.isArray(raw)?raw.find(p=>numericId(p?.id)===ticket.providerId):raw;
    if(!profile||!numericId(profile.id)||(ticket.providerId&&numericId(profile.id)!==ticket.providerId))throw new Fault('RocketReach did not confirm the lookup record. Check your RocketReach account.',502);
    return change(d=>{
      const b=bot(d,id),lead=existingPerson(d,id,p.leadId),lookup=lead.rocketReachLookup;
      if(!stillCurrent(d,b,ticket)||lookup?.key!==ticket.key)return;
      lookup.providerId=numericId(profile.id);lookup.checkedAt=now();
      if(['progress','pending','searching','queued'].includes(profile.status)){
        lookup.state='pending';return setReceipt(b,'lookup_pending','RocketReach is still checking this person. Check the lookup status again to retrieve the result.');
      }
      const address=workAddress(profile,lead);
      if(!address||d.suppressed?.includes(address)||['stopped','replied','unsubscribed'].includes(lead.status)||
        d.leads.some(other=>other.id!==lead.id&&other.email===address)){
        lookup.state='no_work_email';return setReceipt(b,'no_work_email','RocketReach did not establish an eligible verified work email for this person.');
      }
      if(lead.email&&lead.email!==address)throw new Fault('A different address was saved while this lookup was running.',409);
      // Attaching a contact address must never activate the outbound queue.
      if(!lead.email&&lead.status==='research')lead.email=address;
      lookup.state='complete';lead.emailEvidence={source:'rocketreach',email:address,personId:lookup.providerId,at:now(),validation:'smtp_valid',type:'professional'};
      recordProspectSource(lead,{source:'rocketreach',agentId:id,at:now(),url:lead.linkedinUrl,detail:'RocketReach returned a validated professional email for the matched employer and personal profile.'});
      return setReceipt(b,'enriched','RocketReach verified a professional email for '+lead.person+'.');
    });
  }catch(error){
    await change(d=>{
      const b=bot(d,id),lead=d.leads.find(l=>l.id===p.leadId);
      if(!stillCurrent(d,b,ticket)||lead?.rocketReachLookup?.key!==ticket.key)return;
      if(!ticket.providerId){
        lead.rocketReachLookup.state=!submitted||error instanceof Fault&&[400,401,402,403,404,429].includes(error.status)?'declined':'unknown';
        if(!submitted)d.rocketReach.ledger=d.rocketReach.ledger.filter(row=>row.key!==ticket.key);
      }
      invalidateRejectedKey(d,ticket,error);
      setReceipt(b,'failed',error instanceof Fault?error.message:'The RocketReach lookup could not be confirmed.');
    });
    throw error;
  }
}
export async function rocketReachAction(id,p={},deps={}){
  const change=deps.edit||edit;
  if(p.action==='rocketReachConnect'){
    const key=text(p.apiKey,600);
    if(!key||key.length<8||/\s/.test(key))throw new Fault('Enter your RocketReach API key.');
    const account=await api(key,'account/',{},deps);
    if(!account?.id||account.state==='anonymous')throw new Fault('RocketReach could not confirm an API-enabled account.',403);
    const sealed=(deps.seal||seal)(key);
    return change(d=>{
      const previous=d.rocketReach||{};
      const accountId=String(account.id);
      d.rocketReach={...previous,key:sealed,connection:previous.accountId===accountId&&previous.connection?previous.connection:crypto.randomUUID(),
        accountId,state:'connected',dailyLookupLimit:rocketReachLimits.dailyLookupLimit,dailySearchLimit:rocketReachLimits.dailySearchLimit};
    });
  }
  if(p.action==='rocketReachDisconnect')return change(d=>{if(d.rocketReach){delete d.rocketReach.key;d.rocketReach.state='not_connected';}});
  const agentId=p.agentId||id;
  if(p.action==='rocketReachSearch')return search(agentId,p,deps);
  if(p.action==='rocketReachImport')return importPeople(agentId,p,deps);
  if(p.action==='rocketReachEnrich')return enrich(agentId,p,deps);
  throw new Fault('Unknown RocketReach action.');
}
