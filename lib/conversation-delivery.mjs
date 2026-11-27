import {note} from './domain.mjs';
import {Fault,now} from './store.mjs';
import {isPublishedProspect} from './qualification.mjs';

const channels=new Set(['email','linkedin']);
const validSender=value=>value==='agentmail'||value==='mailbox';
const target=(p,c)=>c==='email'?p.email||'':p.linkedinUrl||'';
const includesChannel=(draft,c)=>draft.channel===c||draft.channel==='both';
const sameCopy=(a,b,c)=>c==='email'?a.subject===b.subject&&a.body===b.body:a.linkedin===b.linkedin;
const channelCopy=(record,c)=>c==='email'?{subject:record.subject,body:record.body}:{linkedin:record.linkedin};
const clarify=(question)=>({question,dispatch:false});
const isQuoted=/“[^”]*”|‘[^’]*’|"[^"]*"|`[^`]*`/g;

// A model proposes an action. Only a current delivery instruction can authorize it.
export function explicitlyRequestsDelivery(text) {
  const s=text.replace(isQuoted,' ').toLowerCase().replace(/’/g,"'").trim();
  if(/\b(?:don't|do not|never|not yet|no need to|without|before you|before sending|hold off|wait until|for review|review first|preview first|after (?:my|i) (?:approval|review|approve)|if|unless|when they|tomorrow|next week|schedule|later|hypothetically)\b/.test(s))return false;
  if(/\b(?:how|why|whether|what if)\b.{0,28}\b(?:send|email|dm|message)\b|\b(?:can|could|would|will) (?:it|the (?:agent|bot)|this (?:agent|bot))\b/.test(s))return false;
  return /^(?:(?:yes|ok(?:ay)?|sure|and|then|go ahead(?: and)?|please|now|can you|could you|would you|you can|i want you to)[\s,!.]+)*(?:(?:send|email|e-mail|dm|direct[- ]message|message)\b|(?:compose|write|prepare|draft|revise|update|edit|change|rewrite|shorten|add)\b[\s\S]{0,1300}\b(?:and|then)\s+(?:please\s+)?(?:send|email|dm|message)\b)/i.test(s);
}
function seenVersion(history,agent,prospect,channel,explicitId) {
  const drafts=(prospect.reviewDrafts||[]).filter(v=>v.botId===agent.id&&includesChannel(v,channel));
  for(const m of [...history].reverse()){
    const v=m.details;
    if(m.role!=='assistant'||(m.botId&&m.botId!==agent.id)||!v||!['prospectDraft','sendReview'].includes(v.type)||
      v.prospectId!==prospect.id||!includesChannel(v,channel))continue;
    const record=v.draftId?drafts.find(x=>x.id===v.draftId):drafts.findLast(x=>sameCopy(x,v,channel));
    if(!record||!sameCopy(record,v,channel)||explicitId&&explicitId!==record.id) return null;
    return record;
  }
  return null;
}

const fold=s=>s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function latestRecipient(history,agentId) {
  const m=history.findLast(m=>m.role==='assistant'&&(!m.botId||m.botId===agentId));
  const v=m?.details;
  if(!v)return {};
  if(['sendReview','prospectDraft','delivery'].includes(v.type)&&v.prospectId)return {id:v.prospectId,channel:v.channel};
  if(v.type==='prospects'&&v.prospectIds?.length===1)return {id:v.prospectIds[0]};
  return {};
}
export function deliveryInstructionIssue(message,decision,agent,history,prospect,people) {
  // A third party named in the body/purpose is not the destination.
  const instruction=message.replace(isQuoted,' ').split(/(?:^|\n)\s*(?:subject|body):|\b(?:about|asking|offering|saying|introducing|inviting|explaining|telling|to (?:ask|offer|introduce|discuss|share|propose|invite|explain))\b/i)[0];
  const words=' '+fold(instruction)+' ';
  const named=people.filter(p=>p.person&&words.includes(' '+fold(p.person)+' '));
  const partial=named.length?named:people.filter(p=>fold(p.person||'').split(' ').some(token=>token.length>=2&&words.includes(' '+token+' ')));
  const matched=partial.length<=1?partial:partial.filter(p=>[p.company,p.role].some(q=>q&&words.includes(' '+fold(q)+' ')));
  const prior=latestRecipient(history,agent.id);
  if(new Set(named.map(p=>fold(p.person))).size>1)return 'Which one verified person should receive this message?';
  if(partial.length){
    if(matched.length!==1||matched[0].id!==prospect.id)return 'Which one verified person should receive this? Please include their name and company.';
  }else{
    const refersBack=/\b(?:this|that|the|approved|reviewed|last|latest|previous) (?:(?:email|linkedin|dm) )?(?:draft|email|message|note)\b|\b(?:it|them|him|her|this|that)\b/.test(words);
    const redirects=/\bto\s+(?!(?:him|her|them|the[ -]same|that[ -]person|this[ -]person|offer|ask|send|discuss|share|introduce|schedule|propose|invite|explain)\b)[\p{L}]/iu.test(instruction)||
      /\b(?:email|dm|message)\s+(?!the\b|this\b|that\b|it\b|her\b|him\b|them\b|to\b)(?:[A-Z][\p{L}]+|[a-z][\w.+%-]*@)/u.test(instruction);
    if(!refersBack||redirects||prior.id!==prospect.id)return 'Which verified prospect should receive this message?';
  }
  // Sender references such as “from my own email” do not choose a delivery channel.
  const action=instruction.replace(/\b(?:from|using|via)\s+(?:my|the bot['’]?s|the agent['’]?s|our)\s+(?:connected |own |work )?(?:mailbox|email|inbox)\b/ig,'');
  const email=/\be-?mail\b/i.test(action),linkedin=/\b(?:linkedin|linked in|dm|direct[- ]message)\b/i.test(action);
  if(email&&linkedin||email&&decision.channel!=='email'||linkedin&&decision.channel!=='linkedin'||
    !email&&!linkedin&&(!decision.existingDraft||prior.channel!==decision.channel)&&!(decision.existingDraft&&decision.explicitDraftId))
    return 'Should I use email or LinkedIn for '+prospect.person+'?';
  return '';
}
function concretePurpose(message,decision) {
  if(!decision.concrete)return false;
  const literal=fold(decision.purpose||'');
  return literal.length>=4&&fold(message).includes(literal)||
    /\b(?:about|asking|offering|saying|says?|introducing|inviting|explaining|tell(?:ing)?|invite|to (?:ask|offer|introduce|discuss|schedule|share|propose|invite|explain))\s+\S.{3,}|\bbody:\s*\S.{3,}/is.test(message);
}
function providedBody(message) {
  const marked=message.match(/(?:^|\n)\s*body:[ \t]*([\s\S]+)$/i);
  if(marked)return marked[1].trim();
  const quoted=message.match(/\b(?:verbatim|exactly|saying|that says|with (?:this|the following) (?:text|message|body))\s*[:,]?\s*(?:"([^"]+)"|“([^”]+)”)\s*[.!]?$/i);
  return quoted?.[1]||quoted?.[2]||'';
}

export async function prepareDelivery({decision,message,agent,history=[],prospect,prospects,requestId,sender},draftFn) {
  if(!agent||!prospect||!isPublishedProspect(prospect)||decision.prospectId!==prospect.id)
    return clarify('Which verified prospect should receive this message?');
  const channel=decision.channel;
  if(!channels.has(channel))return clarify('Which channel should I use for '+prospect.person+'?');
  if(sender!==undefined&&sender!==null&&sender!==''&&!validSender(sender))return clarify('Which connected email account should send this message?');
  if(decision.action!=='send'||!explicitlyRequestsDelivery(message))return clarify('Should I prepare a draft for you to review?');
  const issue=deliveryInstructionIssue(message,decision,agent,history,prospect,prospects||[prospect]);
  if(issue)return clarify(issue);
  const destination=target(prospect,channel);
  if(!destination)return clarify('What verified email address should I use for '+prospect.person+'?');
  const plan={agentId:agent.id,prospectId:prospect.id,channel,destination,requestId,dispatch:false};
  if(channel==='email'){
    const prose=message.replace(isQuoted,' ').split(/(?:^|\n)\s*(?:subject|body):/i)[0];
    const personal=/\b(?:from|using|through) (?:my|our|the connected) (?:own |connected |work )?(?:e-?mail|mailbox|inbox)\b/i.test(prose);
    const inbox=/\b(?:from|using|through) (?:the |my |this )?(?:agentmail|(?:agent|bot)(?:['’]s)? (?:address|email|inbox))\b/i.test(prose);
    if(personal&&inbox||sender==='mailbox'&&inbox||sender==='agentmail'&&personal)return clarify('Which sending account should I use for this email?');
    if(validSender(sender)||inbox||personal)plan.sender=sender||(inbox?'agentmail':'mailbox');
    const address=prose.match(/\bfrom\s+(?:the\s+address\s+)?([a-z\d.!#$%&'*+\/=?^_~|-]+@[a-z\d.-]+\.[a-z]{2,})/i);
    if(address)plan.senderAddress=address[1].toLowerCase();
  }
  if(decision.existingDraft){
    if(/\b(?:edit|modify|replace|rewrite|revise|change|add|remove|shorten|instead|except|but)\b/i.test(message.replace(isQuoted,' ')))return clarify('What exact changes should I make for '+prospect.person+' before delivery?');
    const existing=seenVersion(history,agent,prospect,channel,decision.explicitDraftId);
    if(!existing)return clarify('Which draft should I send to '+prospect.person+'? Open its preview or ask me to prepare one here.');
    const previous=channel==='email'?existing.recipientEmail:existing.recipientProfile;
    const changeSender=channel==='email'&&(plan.sender&&existing.sender&&plan.sender!==existing.sender||
      plan.senderAddress&&existing.senderEmail&&plan.senderAddress!==existing.senderEmail.toLowerCase());
    const copy=channelCopy(existing,channel);
    // Older previews may predate recipient snapshots. Show the same copy with the actual destination.
    if(previous!==destination||changeSender)return {...plan,draftId:requestId,draft:copy,reason:'Review the destination and sender for this version.'};
    return {...plan,draftId:existing.id,existingCopy:copy,dispatch:true,...(channel==='email'&&validSender(existing.sender)?{sender:existing.sender}:{})};
  }
  if(!concretePurpose(message,decision))return clarify('What should the message to '+prospect.person+' say?');
  const written=await draftFn({message,agent,history,prospect,channel});
  if(written?.question)return clarify(written.question);
  const draft=channelCopy(written||{},channel),literal=providedBody(message);
  if(literal)draft[channel==='email'?'body':'linkedin']=literal;
  if(channel==='email'){
    const subject=message.match(/(?:^|\n)\s*subject:[ \t]*([^\r\n]+)/i);
    if(subject)draft.subject=subject[1].trim();
    if(!draft.subject?.trim()||!draft.body?.trim())throw new Fault('The email draft was incomplete. Please retry.',502);
  }else if(!draft.linkedin?.trim())throw new Fault('The LinkedIn draft was incomplete. Please retry.',502);
  return {...plan,draftId:requestId,draft,dispatch:channel==='email'};
}

function senderState(d,b,requested) {
  const inbox=d.agentMailKey&&b.inbox?.id&&b.inbox.email;
  const provider=requested||(inbox?'agentmail':'mailbox');
  const address=provider==='agentmail'?inbox:d.mailbox?.id&&d.mailbox.email;
  return {sender:provider,senderEmail:address||''};
}

export function commitDelivery(d,b,recipient,plan,requestId) {
  if(plan.question){note(d,b.id,'assistant',plan.question);d.messages.at(-1).details={type:'clarification'};return {send:null};}
  const {channel,draftId}=plan;
  if(!recipient||!isPublishedProspect(recipient)||plan.prospectId!==recipient.id||plan.agentId!==b.id||
    !channels.has(channel)||requestId!==plan.requestId||target(recipient,channel)!==plan.destination)
    throw new Fault('The recipient changed. Review the current prospect before sending.',409);
  const versions=recipient.reviewDrafts||=[];
  let record=versions.find(x=>x.id===draftId&&x.botId===b.id);
  let selected=plan.sender;
  if(channel==='email'&&plan.senderAddress){
    const options=(selected?[selected]:['agentmail','mailbox']).filter(provider=>senderState(d,b,provider).senderEmail.toLowerCase()===plan.senderAddress);
    if(options.length!==1){note(d,b.id,'assistant','Which connected account should send this email? The requested sender is unavailable or ambiguous.');d.messages.at(-1).details={type:'clarification'};return {send:null};}
    selected=options[0];
  }
  const sender=channel==='email'?senderState(d,b,selected):{};
  if(!record){
    if(!plan.draft)throw new Fault('That reviewed draft is no longer available.',409);
    record={id:draftId,botId:b.id,at:now(),channel,...plan.draft,...sender,
      recipientEmail:recipient.email||'',recipientProfile:recipient.linkedinUrl||''};
    versions.push(record);
  }
  if(!includesChannel(record,channel)||!sameCopy(plan.draft||plan.existingCopy,record,channel)||
    (channel==='email'?record.recipientEmail:record.recipientProfile)!==plan.destination)
    throw new Fault('The reviewed draft or destination changed. Review the current version before sending.',409);
  const senderChanged=channel==='email'&&record.senderEmail&&record.senderEmail!==sender.senderEmail;
  if(senderChanged)throw new Fault('The sending account changed. Prepare a new draft with the current sender.',409);
  const missingSender=channel==='email'&&!sender.senderEmail;
  if((plan.draft||missingSender)&&!d.messages.some(m=>m.botId===b.id&&m.details?.requestId===requestId&&m.details?.type==='sendReview')){
    const ready=plan.dispatch&&!missingSender;
    const summary=missingSender?'I saved the email. Connect an outbound mailbox or assign this agent an AgentMail inbox to send it.':
      ready?'I prepared this email for delivery.':(plan.reason?plan.reason+' ':'')+'Review the '+(channel==='linkedin'?'LinkedIn message':'email')+' below, then say “send this draft” to deliver it.';
    note(d,b.id,'assistant',summary);
    d.messages.at(-1).details={type:'sendReview',prospectId:recipient.id,person:recipient.person,company:recipient.company,
      draftId,requestId,channel,to:plan.destination,recipientEmail:record.recipientEmail,recipientProfile:record.recipientProfile,
      ...sender,...channelCopy(record,channel),requiresConfirmation:!ready};
  }
  if(!plan.dispatch||missingSender)return {send:null};
  return {send:{agentId:b.id,prospectId:recipient.id,channel,draftId,requestId,...(channel==='email'?{sender:sender.sender}:{})}};
}
