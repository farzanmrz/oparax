import {skillEnabled} from './sales-skills.mjs';
import {Fault,event,now} from './store.mjs';
import {linkedinProfileUrl} from './profile-url.mjs';
import {belongsToCampaign,isPublishedProspect} from './qualification.mjs';
export const text=(v,n=1000)=>typeof v==='string'?v.trim().slice(0,n):'';
export const email=v=>{const s=text(v,254).toLowerCase();return /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(s)?s:''};
export function source(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!/(^|\.)(linkedin\.com|lnkd\.in)$/.test(u.hostname)&&!u.hostname.endsWith('.local')&&u.hostname.includes('.')?u.href:''}catch{return ''}}
export function bot(d,id){const b=d.bots.find(x=>x.id===id);if(!b)throw new Fault('Agent not found.',404);return b}
export function lead(d,id){const l=d.leads.find(x=>x.id===id);if(!l)throw new Fault('Prospect not found.',404);return l}
const norm=v=>text(v).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function verifiedProfileMatch(leads,person){
 const url=linkedinProfileUrl(person.linkedinUrl),company=norm(person.company);
 if(!url||!company)return undefined;
 return leads.find(l=>linkedinProfileUrl(l.linkedinUrl)===url&&norm(l.company)===company);
}
export function associateQualifiedProspect(lead,botId){
 if(!isPublishedProspect(lead)||belongsToCampaign(lead,botId))return;
 lead.matchedBotIds=[...(Array.isArray(lead.matchedBotIds)?lead.matchedBotIds:[]),botId];
}
export function addLead(d,b,p){
 const company=text(p.company,150),person=text(p.person,120),url=source(p.source),contact=email(p.email),identity=[norm(company),norm(person)].join('/');
 if(!company||!url||!text(p.fit))throw new Fault('A company, source URL and reason for fit are required.');
 const profile=linkedinProfileUrl(p.linkedinUrl);
 const evidence=text(p.linkedinEvidence,700);
 const proof=p.companyVerification;
 const companyVerification=proof && norm(proof.name)===norm(company) && source(proof.source) && text(proof.evidence)
   ? {name:company,source:source(proof.source),evidence:text(proof.evidence,700),
      ...(text(proof.domain,253)?{domain:text(proof.domain,253)}:{}),
      ...(source(proof.identitySource)?{identitySource:source(proof.identitySource)}:{}),
      ...(text(proof.identityEvidence,500)?{identityEvidence:text(proof.identityEvidence,500)}:{}),
      ...(text(proof.matchType,80)?{matchType:text(proof.matchType,80)}:{})}
   : undefined;
 const existing=verifiedProfileMatch(d.leads,p)||d.leads.find(l=>l.identity===identity||(contact&&l.email===contact));
 if(existing){
   if(existing.identity===identity){
     if(profile&&person&&!linkedinProfileUrl(existing.linkedinUrl))existing.linkedinUrl=profile;
     if(evidence&&profile===existing.linkedinUrl&&!existing.linkedinEvidence)existing.linkedinEvidence=evidence;
     if(companyVerification&&!existing.companyVerification)existing.companyVerification=companyVerification;
   }
   return false;
 }
 const l={id:crypto.randomUUID(),botId:b.id,origin:p.origin==='manual'?'manual':'research',identity,company,person,linkedinUrl:person?profile:'',...(person&&profile&&evidence?{linkedinEvidence:evidence}:{}),...(companyVerification?{companyVerification}:{}),role:text(p.role,200),sourceDate:/^\d{4}-\d{2}-\d{2}$/.test(p.sourceDate||'')?p.sourceDate:'',evidence:text(p.evidence||p.quote,650),source:url,fit:text(p.fit),email:contact,subject:text(p.subject,180).replace(/[\r\n]/g,' '),body:text(p.body,3500),linkedin:text(p.linkedin,1500),linkedinState:'draft',status:contact?'queued':'research',stage:0,due:now(),at:now()};
 const draftEnabled=skillEnabled(b,'draft_outreach');
 if(!draftEnabled){l.body='';l.subject='';l.linkedin='';l.status='research';}
 if(draftEnabled&&!text(p.draftQuestion,400)&&(!l.body||!l.subject||!l.linkedin))throw new Fault('Both email and LinkedIn drafts are required.');
 if(draftEnabled&&text(p.followUp,2000))l.followUp=text(p.followUp,2000);
 if(draftEnabled&&text(p.draftQuestion,400)){
   l.draftQuestion=text(p.draftQuestion,400);l.status='research';l.body='';l.subject='';l.linkedin='';delete l.followUp;
   if(b.autoEmail&&b.lastDraftQuestion!==l.draftQuestion){b.lastDraftQuestion=l.draftQuestion;note(d,b.id,'assistant',l.draftQuestion);}
 }
 if(contact&&d.suppressed.includes(contact))l.status='stopped';d.leads.unshift(l);return true}
export function stop(d,l,status){l.status=status;if(l.email&&!d.suppressed.includes(l.email))d.suppressed.push(l.email);for(const other of d.leads)if(other.id!==l.id&&l.email&&other.email===l.email)other.status='stopped';event(d,l.company+' · '+status)}
export function settings(input){const name=text(input.name,65),brief=text(input.brief,2500),cap=Number(input.cap??5),cadence=Number(input.cadence??24),delay=Number(input.delay??5);
 if(!name||!brief)throw new Fault('Give the agent a name and a campaign brief.');if(!Number.isInteger(cap)||cap<1||cap>100||![6,12,24,48,168].includes(cadence)||![3,5,7,14].includes(delay))throw new Fault('Check the campaign schedule and limits.');return {name,brief,cap,cadence,delay}}
export function createBot(d,input){const b={id:crypto.randomUUID(),...settings(input),active:false,autoEmail:false,next:now(),at:now(),last:null,lease:null,error:null};d.bots.push(b);event(d,'Created '+b.name);return b.id}
export function canSend(d,b,l){return !!(skillEnabled(b,'email_delivery')&&(!l.stage||l.followUp||skillEnabled(b,'draft_outreach'))&&isPublishedProspect(l)&&b.active&&b.autoEmail&&d.mailbox&&l.email&&!d.suppressed.includes(l.email)&&['queued','sent'].includes(l.status)&&l.stage<2&&Date.parse(l.due)<=Date.now()&&l.botId===b.id)}
export function claimMail(d,b,l){if(!canSend(d,b,l))return false;const day=now().slice(0,10);if(b.day!==day){b.day=day;b.used=0}if(b.used>=b.cap)return false;b.used++;l.status='sending';l.attempt=crypto.randomUUID();l.claimed=now();return l.attempt}
export function note(d,id,role,content){d.messages.push({id:crypto.randomUUID(),botId:id,role,content:text(content,6000),at:now()});if(d.messages.length>700)d.messages.shift()}
