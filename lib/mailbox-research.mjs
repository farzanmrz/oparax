import {qualificationBudget} from './source-states.mjs';
import {resolveAgentModel} from './agent-models.mjs';
import {salesContext,sellerVersion,inferenceSeller} from './sales-context.mjs';
import {findResearchMatch,proposeProspect} from './prospect-review.mjs';
import {requireSkill,skillEnabled} from './sales-skills.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {Fault,edit,now,read,unseal} from './store.mjs';
import {bot,note} from './domain.mjs';
import {selectedSearchSources} from './search-source.mjs';
import {mailboxScopeSuggestion,mailboxBriefSignature,workDomain} from './mailbox-scope.mjs';
import {isPublishedProspect} from './qualification.mjs';
import {findIndexedProfiles,profileKey} from './research-profiles.mjs';
import {currentRequestedRole,requestedRoleMatcher} from './company-index.mjs';
import {linkedinProfileUrl} from './profile-url.mjs';
import {planPrompt,validatePlan,hasRoleScope} from './research.mjs';
import {verifySelections} from './selected-leads.mjs';
import {recordProspectSource} from './provenance.mjs';

const MAX_MESSAGES=30,MAX_CONTACTS=10;
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const generic=/^(?:no[-_.]?reply|do[-_.]?not[-_.]?reply|notifications?|alerts?|mailer(?:daemon)?|postmaster|bounce|press|support|info|sales|customerservice|team|hello|admin|marketing|careers|hiring|newsletter|orders?|service|accounts?|contact|office|billing)(?:[0-9+._-]|$)/i;
const normalize=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const validName=s=>typeof s==='string'&&s.length>=4&&s.length<=95&&/^[\p{L}][\p{L}\p{M}’'.-]*(?:\s+[\p{L}][\p{L}\p{M}’'.-]*){1,5}$/u.test(s)&&! /\b(?:team|office|news|support|customer|communications|recruitment|services|department|marketing|operations|notification)\b/i.test(s);
const safeCompany=s=>typeof s==='string'&&s.trim().length>=2&&s.trim().length<=120&&!/[\r\n<>@]/.test(s)?s.trim():'';
const publicText=s=>String(s||'').trim();
const clockDay=86_400_000;

function decodeDisplay(value) {
  return value.replace(/(\?=)\s+(?==\?)/g,'$1').replace(/=\?([^?\s]{1,40})\?([bq])\?([^?]{1,400})\?=/gi,(_,charset,encoding,data)=>{
    try {
      const bytes=encoding.toLowerCase()==='b'?Buffer.from(data,'base64'):Buffer.from(data.replace(/_/g,' ').replace(/=([0-9a-f]{2})/gi,(_m,n)=>String.fromCharCode(parseInt(n,16))),'latin1');
      return new TextDecoder(charset,{fatal:true}).decode(bytes);
    }catch{return '';}
  });
}
function sender(value,domain) {
  if(typeof value!=='string'||value.length>1200)return null;
  const m=/^\s*(?:"([^"\r\n]*)"|([^<>"\r\n]*))\s*<([^<>\s@,]+)@([a-z0-9.-]+)>\s*$/i.exec(value);
  if(!m||m[4].toLowerCase()!==domain||generic.test(m[3]))return null;
  let person=decodeDisplay((m[1]??m[2]).trim());
  if(/^([^,]+),\s*([^,]+)$/.test(person))person=person.replace(/^([^,]+),\s*([^,]+)$/,'$2 $1');
  person=person.normalize('NFKC').replace(/\s+/g,' ').trim();
  return validName(person)?{person,senderKey:createHash('sha256').update(m[3].toLowerCase()+'@'+domain).digest('hex')}:null;
}
function headersOnly(raw) {
  if(!raw||raw.length>32768)return '';
  const lines=Buffer.from(raw||'').toString('utf8').split(/\r?\n\r?\n/)[0].replace(/\r?\n[ \t]+/g,' ').split(/\r?\n/);
  const headers={};
  for(const line of lines){const i=line.indexOf(':');if(i<1)continue;const key=line.slice(0,i).toLowerCase();headers[key]=(headers[key]?headers[key]+', ':'')+line.slice(i+1).trim();}
  if(headers['list-id']||headers['auto-submitted']&&!/^no$/i.test(headers['auto-submitted'])||/bulk|list|junk/i.test(headers.precedence||''))return '';
  return headers.from||'';
}
function sourceIdentity(d,b,kind) {
  if(kind==='agentmail')return d.agentMailKey&&b.inbox?.id?'agentmail/'+b.inbox.id:'';
  return d.mailbox?.id?'imap/'+d.mailbox.id:'';
}
export function validMailboxConsent(d,b) {
  const c=b.mailboxResearchConsent;
  return !!(c&&c.signature===mailboxBriefSignature(b)&&c.mailboxId===sourceIdentity(d,b,c.mailboxKind)&&selectedSearchSources(b).includes('email'));
}
function chooseScope(d,b,p) {
  requireSkill(b,'mailbox_research');
  if(!selectedSearchSources(b).includes('email'))throw new Fault('Choose Email as a research source for this campaign.',409);
  if(p.useSavedScope===true){
    if(!validMailboxConsent(d,b))throw new Fault('Confirm the mailbox search scope for this campaign.',409);
    return {...b.mailboxResearchConsent};
  }
  if(p.consent!==true)throw new Fault('Confirm this scoped, read-only mailbox search.');
  const suggested=mailboxScopeSuggestion(b);
  const company=safeCompany(p.company??suggested.company),domain=workDomain(p.domain??suggested.domain);
  const days=p.days??suggested.days,mailboxKind=p.mailboxKind??suggested.mailboxKind??'connected';
  if(!company||!domain||![7,14,30].includes(days)||!['connected','agentmail'].includes(mailboxKind))throw new Fault('Choose a company, its work email domain and a 7, 14 or 30 day window.');
  const currentPlan=b.researchJob?.planSignature===mailboxBriefSignature(b)?b.researchJob.plan:null;
  if(currentPlan?.employers?.length&&!currentPlan.employers.some(e=>normalize(e)===normalize(company)))throw new Fault('Choose an employer in this campaign’s brief.',409);
  const mailboxId=sourceIdentity(d,b,mailboxKind);
  if(!mailboxId)throw new Fault(mailboxKind==='agentmail'?'Connect and provision this agent’s AgentMail inbox first.':'Connect your mailbox first.',409);
  return {company,domain,days,mailboxKind,mailboxId,signature:mailboxBriefSignature(b)};
}

const imapHosts={gmail:'imap.gmail.com',yahoo:'imap.mail.yahoo.com',icloud:'imap.mail.me.com'};
export async function readImapCorrespondents(m,scope,{since,until},clientFactory) {
  if(!clientFactory&&!Object.hasOwn(imapHosts,m.provider))throw new Fault('This mailbox provider is unsupported.',400);
  const c=clientFactory?await clientFactory():new (await import('imapflow')).ImapFlow({host:imapHosts[m.provider],port:993,secure:true,
    auth:{user:m.email,pass:unseal(m.secret)},logger:false,connectionTimeout:10000,socketTimeout:18000});
  let lock;
  const rows=[];
  try {
    await c.connect();lock=await c.getMailboxLock('INBOX',{readOnly:true});
    const hits=await c.search({since:new Date(since),from:'@'+scope.domain,to:m.email},{uid:true});
    if(!Array.isArray(hits))throw Error('Search unavailable');
    const ids=hits.filter(Number.isSafeInteger).sort((a,b)=>b-a).slice(0,MAX_MESSAGES);
    if(!ids.length)return {examined:0,rows};
    for await(const msg of c.fetch(ids,{uid:true,internalDate:true,headers:['From','Auto-Submitted','List-Id','Precedence']},{uid:true})){
      const time=new Date(msg.internalDate).getTime();
      if(!ids.includes(msg.uid)||!Number.isFinite(time)||time<since||time>until)continue;
      const candidate=sender(headersOnly(msg.headers),scope.domain);
      if(candidate)rows.push({...candidate,at:new Date(time).toISOString(),reference:'INBOX/'+String(c.mailbox.uidValidity)+'/'+msg.uid});
    }
    return {examined:ids.length,rows};
  }catch{throw new Fault('The mailbox could not complete the read-only sender search. Check the connection and retry.',502);}
  finally{try{lock?.release();}finally{await c.logout().catch(()=>{});}}
}

export async function readAgentMailCorrespondents(d,b,scope,{since,until},{fetcher=fetch,unsealKey=unseal}={}) {
  const url=new URL('https://api.agentmail.to/v0/inboxes/'+encodeURIComponent(b.inbox.id)+'/messages');
  const params={from:'@'+scope.domain,to:b.inbox.email,labels:'received',after:new Date(since).toISOString(),before:new Date(until).toISOString(),limit:String(MAX_MESSAGES),
    include_spam:'false',include_blocked:'false',include_unauthenticated:'false',include_trash:'false'};
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
  const res=await fetcher(url,{headers:{Authorization:'Bearer '+unsealKey(d.agentMailKey)},cache:'no-store',signal:AbortSignal.timeout(16000)});
  if(!res.ok)throw new Fault('AgentMail could not complete the scoped sender search.',502);
  const result=await res.json(),rows=[];
  if(!Array.isArray(result.messages))throw new Fault('AgentMail returned an incomplete response.',502);
  const messages=result.messages.slice(0,MAX_MESSAGES);
  for(const item of messages){
    if(item.inbox_id!==b.inbox.id||!item.labels?.includes('received')||item.labels.some(l=>['spam','blocked','unauthenticated','trash','quarantined'].includes(l)))continue;
    const routing={};
    for(const [field,value] of Object.entries(item.headers||{})){
      const name=field.toLowerCase();
      if(['list-id','precedence','auto-submitted'].includes(name))routing[name]=String(value);
    }
    if(routing['list-id']||routing['auto-submitted']&&!/^no$/i.test(routing['auto-submitted'])||/bulk|list|junk/i.test(routing.precedence||'')||item.authentication_results?.dmarc==='fail')continue;
    const candidate=sender(String(item.from||''),scope.domain),time=Date.parse(item.timestamp);
    if(candidate&&typeof item.message_id==='string'&&item.message_id.length<=500&&time>=since&&time<=until)rows.push({...candidate,at:new Date(time).toISOString(),reference:item.message_id});
  }
  return {examined:messages.length,rows};
}

function officeDomainMatches(record,domain) {
  const proof=record?.companyVerification;
  function matches(value){const host=workDomain(value);return !!host&&(host===domain||host.endsWith('.'+domain)||domain.endsWith('.'+host));}
  if(matches(proof?.domain))return true;
  try{return matches(new URL(proof?.source).hostname);}catch{return false;}
}
function indexedRole(hit,row,scope,plan) {
  const segments=publicText(hit.title).split(/\s+[-–—|]\s+|\s*\|\s*/);
  if(normalize(segments[0]?.replace(/\s*\([^)]*\)$/,''))!==normalize(row.person))return '';
  const structured=currentRequestedRole(hit,scope.company,plan);
  if(structured)return structured;
  const roleMatch=requestedRoleMatcher(plan,{roles:plan.roles,roleTerms:plan.roleTerms});
  for(const segment of segments.slice(1)){
    const found=/^(.{2,110}?)\s+(?:at|@|chez|bei|presso)\s+(.{2,125}?)$/i.exec(segment.trim());
    if(found&&normalize(found[2])===normalize(scope.company)&&roleMatch(found[1])&&!/\b(?:was|former|formerly|previously|retired)\b/i.test(segment))return found[1].trim();
  }
  return '';
}
async function publicVerification(id,b,rows,scope,deps,seller) {
  if(!rows.length)return [];
  const acceptedCompany=normalize(scope.company);
  const {modelId}=resolveAgentModel(b,{task:'research'});
  const campaignSignature=mailboxBriefSignature(b);
  let plan=hasRoleScope(b.researchJob?.plan)&&b.researchJob.planSignature===campaignSignature&&(b.researchJob.sellerVersion||'')===sellerVersion(seller)?b.researchJob.plan:null;
  if(!plan){
    const context={brief:b.brief,seller:inferenceSeller(seller),clarifications:[...(b.clarifications||[]),{question:'Which named company and website should this mailbox search verify?',answer:scope.company+' '+scope.domain}]};
    const model=deps.model||((...args)=>import('./agent.mjs').then(m=>m.model(...args)));
    plan=validatePlan(await model([{role:'system',content:planPrompt},{role:'user',content:JSON.stringify(context)}],
      {...resolveAgentModel(b,{task:'planning',message:b.brief}),agentId:b.id,effort:'low',timeout:22000,maxTokens:1500}),{...context,researchLimitInput:b.researchLimitInput});
  }
  if(plan.question || (plan.employers?.length&&!plan.employers.some(c=>normalize(c)===acceptedCompany)))return [];
  const prior=plan.companyContexts?.find(c=>normalize(c.company)===acceptedCompany)||{};
  const target={...prior,company:scope.company,domain:scope.domain};
  plan={...plan,companyContexts:[...(plan.companyContexts||[]).filter(c=>normalize(c.company)!==acceptedCompany),target]};
  // Addresses, subjects, message IDs and contents never form part of a search query.
  const names=rows.map(({person})=>({person,company:scope.company,researchTarget:target}));
  const found=await (deps.findProfiles||findIndexedProfiles)(names,modelId,30000);
  if(found.failed)throw new Fault('Public profile search was unavailable. Retry this source to verify these correspondents.',502);
  const hits=found.results||[], candidates=[];
  for(const row of names){
    const matches=new Map();
    for(const hit of hits){
      const linkedinUrl=linkedinProfileUrl(hit.url),role=linkedinUrl&&indexedRole(hit,row,scope,plan);
      if(role)matches.set(linkedinUrl,{person:row.person,company:scope.company,role,linkedinUrl});
    }
    if(matches.size===1)candidates.push([...matches.values()][0]);
  }
  if(!candidates.length)return [];
  const anchors=b.researchJob?.planSignature===campaignSignature?b.researchJob.companyProofs||{}:{};
  const checked=await (deps.verifyCandidates||verifySelections)(id,candidates,plan,anchors,{...deps,seller,findProfiles:async()=>({results:hits})});
  return checked.verified||[];
}
const evidenceKey=(scope,row)=>createHash('sha256').update(JSON.stringify([scope.mailboxId,row.reference])).digest('hex');
function privateEvidence(scope,row) {
  return {key:evidenceKey(scope,row),mailboxKind:scope.mailboxKind,mailboxId:scope.mailboxId,reference:row.reference,at:row.at,domain:scope.domain};
}
export async function runMailboxResearch(id,p,deps={}) {
  if(!uuid.test(id)||!uuid.test(p?.requestId)||p.source!=='email')throw new Fault('Choose a valid campaign email research request.');
  const change=deps.edit||edit,get=deps.read||read;
  if(p.revoke===true){
    await change(d=>{const b=bot(d,id);delete b.mailboxResearchConsent;delete b.mailboxScanLease;});
    return {status:'revoked'};
  }
  const lease=randomUUID(),requestId=p.requestId.toLowerCase();
  const approved=await change(d=>{
    const b=bot(d,id),scope=chooseScope(d,b,p);
    const fingerprint=JSON.stringify([scope.mailboxId,scope.signature,scope.company,scope.domain,scope.days]);
    const prior=(b.mailboxScanHistory||[]).find(r=>r.requestId===requestId);
    if(prior){
      if(prior.fingerprint!==fingerprint)throw new Fault('This request belongs to a different mailbox scope.',409);
      return {prior:prior.receipt};
    }
    if(Date.parse(b.mailboxScanLease?.until)>Date.now())throw new Fault('This agent already has a mailbox review in progress.',409);
    b.mailboxScanLease={lease,requestId,until:new Date(Date.now()+360000).toISOString(),fingerprint};
    if(p.remember===true&&p.consent===true)b.mailboxResearchConsent={...scope,grantedAt:now()};
    const {ids,ceiling}=qualificationBudget(d,b);
    if(ids.size>=ceiling){
      const receipt={source:'email',company:scope.company,domain:scope.domain,mailboxKind:scope.mailboxKind,days:scope.days,
        at:now(),status:'goal_met',examined:0,correspondents:0,proposed:0,saved:0,existing:0,held:0,message:'The requested limit was already reached before checking the mailbox.'};
      b.mailboxScanHistory=[...(b.mailboxScanHistory||[]),{requestId,fingerprint,receipt}].slice(-30);
      b.lastMailboxResearch=receipt;delete b.mailboxScanLease;
      return {prior:receipt};
    }
    return {scope,fingerprint};
  });
  if(approved.prior)return approved.prior;
  const {scope,fingerprint}=approved;
  let examined=0,rows=[];
  const base={source:'email',company:scope.company,domain:scope.domain,mailboxKind:scope.mailboxKind,days:scope.days};
  try{
    const state=(await get()).data,b=bot(state,id);
    if(!skillEnabled(b,'mailbox_research')||b.mailboxScanLease?.lease!==lease||sourceIdentity(state,b,scope.mailboxKind)!==scope.mailboxId||mailboxBriefSignature(b)!==scope.signature||!selectedSearchSources(b).includes('email'))throw new Fault('The campaign or connected mailbox changed before the review began.',409);
    const until=Date.now(),span={until,since:until-scope.days*clockDay};
    const result=deps.readSenders?await deps.readSenders(scope,span):scope.mailboxKind==='agentmail'?
      await readAgentMailCorrespondents(state,b,scope,span):await readImapCorrespondents(state.mailbox,scope,span);
    examined=result.examined;
    const unique=new Map(),ambiguous=new Set();
    const suppressed=new Set((state.suppressed||[]).map(addr=>createHash('sha256').update(String(addr).trim().toLowerCase()).digest('hex')));
    for(const row of result.rows.sort((a,b)=>b.at.localeCompare(a.at))) {
      if(!validName(row.person)||!row.reference||suppressed.has(row.senderKey))continue;
      const name=normalize(row.person),previous=unique.get(name);
      if(previous&&previous.senderKey!==row.senderKey)ambiguous.add(name);
      if(!previous)unique.set(name,row);
    }
    rows=[...unique.values()].slice(0,MAX_CONTACTS);
    const seller=salesContext(state,b);
    const outcomes=await publicVerification(id,b,rows.filter(row=>!ambiguous.has(normalize(row.person))),scope,deps,seller);
    return await change(d=>{
      const agent=bot(d,id);
      if(!skillEnabled(agent,'mailbox_research')||agent.mailboxScanLease?.lease!==lease||sourceIdentity(d,agent,scope.mailboxKind)!==scope.mailboxId||mailboxBriefSignature(agent)!==scope.signature||!selectedSearchSources(agent).includes('email'))throw new Fault('The campaign or mailbox changed before this review could finish.',409);
      const at=now(),receipt={...base,at,status:'completed',examined,correspondents:rows.length,proposed:0,saved:0,existing:0,held:0};
      const {ids,ceiling}=qualificationBudget(d,agent),overLimit=new Set();
      const matchedNames=new Set(),evidence=new Map((agent.mailboxEvidence||[]).map(x=>[x.key,x]));
      for(const outcome of outcomes){
        const {record}=outcome;
        const row=unique.get(normalize(outcome.person));
        if(!row||!record||profileKey(record)!==profileKey({person:outcome.person,company:scope.company})||linkedinProfileUrl(record.linkedinUrl)!==outcome.linkedinUrl||
          !isPublishedProspect(record)||!officeDomainMatches(record,scope.domain)||matchedNames.has(normalize(row.person)))continue;
        const existing=findResearchMatch(d,agent,record);
        if(ids.size>=ceiling&&!ids.has(existing?.id)){overLimit.add(normalize(row.person));continue;}
        const match=proposeProspect(d,agent,{...record,email:''});
        if(!match)continue;
        const {prospect,created}=match;
        ids.add(prospect.id);
        recordProspectSource(prospect,{source:'email',agentId:id,at,detail:(scope.mailboxKind==='agentmail'?'Agent inbox':'Connected mailbox')+' · '+scope.domain+' · received '+row.at.slice(0,10)});
        const evidenceRow=privateEvidence(scope,row);
        evidence.set(evidenceRow.key,{...evidenceRow,leadId:prospect.id});
        matchedNames.add(normalize(row.person));
        if(created)receipt.proposed++;else receipt.existing++;
      }
      const held=rows.filter(r=>!matchedNames.has(normalize(r.person))&&!overLimit.has(normalize(r.person)));
      if(ids.size>=ceiling){receipt.status='goal_met';receipt.skippedAtLimit=overLimit.size;}
      receipt.held=held.length;
      const pending=new Map((agent.mailboxPending||[]).map(x=>[x.key,x]));
      for(const r of rows)pending.delete(evidenceKey(scope,r));
      for(const r of held){const ev=privateEvidence(scope,r);pending.set(ev.key,{...ev,person:r.person,company:scope.company,reason:'Public evidence did not confirm a unique matching current role, employer domain and personal LinkedIn profile.'});}
      agent.mailboxEvidence=[...evidence.values()].slice(-200);agent.mailboxPending=[...pending.values()].slice(-100);
      agent.mailboxScanHistory=[...(agent.mailboxScanHistory||[]),{requestId,fingerprint,receipt}].slice(-30);
      agent.lastMailboxResearch=receipt;delete agent.mailboxScanLease;
      receipt.message='Email research checked '+examined+' recent messages from '+scope.domain+'. '+receipt.proposed+' ready for review, '+receipt.existing+' previously matched, '+receipt.held+' held for evidence.'+(overLimit.size?' The requested maximum was reached before adding '+overLimit.size+' further verified contacts.':'');
      note(d,id,'assistant',receipt.message);
      return receipt;
    });
  }catch(error){
    await change(d=>{const b=bot(d,id);if(b.mailboxScanLease?.lease===lease){delete b.mailboxScanLease;b.lastMailboxResearch={...base,at:now(),status:'failed',examined,correspondents:rows.length,proposed:0,saved:0,existing:0,held:rows.length,error:'The mailbox review could not finish. Retry this source.'};
      if(skillEnabled(b,'mailbox_research')&&selectedSearchSources(b).includes('email')&&sourceIdentity(d,b,scope.mailboxKind)===scope.mailboxId&&mailboxBriefSignature(b)===scope.signature){const held=new Map((b.mailboxPending||[]).map(x=>[x.key,x]));for(const r of rows){const ev=privateEvidence(scope,r);held.set(ev.key,{...ev,person:r.person,company:scope.company,reason:'Public verification was unavailable.'});}b.mailboxPending=[...held.values()].slice(-100);}}});
    if(error instanceof Fault)throw error;
    throw new Fault('The mailbox review could not finish. Retry this source.',502);
  }
}
export function runConsentedMailboxResearch(id,requestId,deps={}) {
  return runMailboxResearch(id,{source:'email',requestId,useSavedScope:true},deps);
}
