import {bot,email,text,verifiedProfileMatch} from './domain.mjs';
import {linkedinProfileUrl} from './profile-url.mjs';
import {belongsToCampaign,isPublishedProspect} from './qualification.mjs';
import {event,Fault,now} from './store.mjs';

const normalized=value=>text(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const identityOf=record=>[normalized(record.company),normalized(record.person)].join('/');

export function researchMatches(d,b) {
  const proposals=(b.prospectReviews||[]).filter(p=>p.botId===b.id);
  const saved=(d.leads||[]).filter(p=>belongsToCampaign(p,b.id)&&isPublishedProspect(p));
  return [...proposals,...saved];
}

export function findResearchMatch(d,b,record) {
  return verifiedProfileMatch(researchMatches(d,b),record);
}

export function proposeProspect(d,b,record) {
  if(!isPublishedProspect(record))return null;
  const matches=researchMatches(d,b);
  const known=verifiedProfileMatch(matches,record);
  if(known)return {prospect:known,created:false};
  const identity=identityOf(record);
  if(matches.some(p=>identityOf(p)===identity))return null;
  const proof=record.companyVerification;
  const {name,source,evidence,domain,identitySource,identityEvidence,matchType}=proof;
  const profileProof=typeof record.linkedinEvidence==='string'?record.linkedinEvidence:record.linkedinEvidence.quote||record.linkedinEvidence.evidence;
  const prospect={
    id:crypto.randomUUID(),botId:b.id,reviewState:'pending',origin:'research',identity,at:now(),
    person:text(record.person,120),company:text(record.company,150),role:text(record.role,200),
    linkedinUrl:linkedinProfileUrl(record.linkedinUrl),linkedinEvidence:text(profileProof,700),
    companyVerification:{name,source,evidence:text(evidence,700),...(domain?{domain}:{}),...(identitySource?{identitySource}:{}),
      ...(identityEvidence?{identityEvidence:text(identityEvidence,700)}:{}),...(matchType?{matchType}:{})},
    source:text(record.source,2000),sourceDate:text(record.sourceDate,10),evidence:text(record.evidence||record.quote,700),
    fit:text(record.fit),email:email(record.email)
  };
  (b.prospectReviews||=[]).unshift(prospect);
  return {prospect,created:true};
}

export function reviewProspect(d,botId,prospectId,decision) {
  const b=bot(d,botId);
  if(!['save','skip'].includes(decision))throw new Fault('Choose Save prospect or Skip.');
  const saved=d.leads.find(p=>p.botId===b.id&&p.id===prospectId&&p.approvedAt);
  if(saved){
    if(decision==='save')return;
    throw new Fault('This prospect has already been saved.',409);
  }
  const candidate=b.prospectReviews?.find(p=>p.id===prospectId&&p.botId===b.id);
  if(!candidate||!isPublishedProspect(candidate))throw new Fault('This match is unavailable for this bot.',404);
  if(candidate.reviewState==='skipped'){
    if(decision==='skip')return;
    throw new Fault('This match has already been skipped.',409);
  }
  if(decision==='skip'){
    candidate.reviewState='skipped';
    event(d,b.name+' · Skipped '+candidate.person);
    return;
  }
  const {reviewState,...lead}=candidate;
  lead.approvedAt=now();
  lead.status=(d.suppressed||[]).includes(lead.email)?'stopped':'research';
  lead.stage=0;
  lead.due=lead.approvedAt;
  d.leads.unshift(lead);
  b.prospectReviews=b.prospectReviews.filter(p=>p.id!==lead.id);
  event(d,b.name+' · Saved '+lead.person+' as a prospect');
}
