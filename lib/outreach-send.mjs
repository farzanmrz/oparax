import {createHash,randomUUID} from 'node:crypto';
import {Fault,read,edit,now,event,leaveToken,workspaceId} from './store.mjs';
import {bot,lead,note,email} from './domain.mjs';
import {belongsToCampaign,isPublishedProspect} from './qualification.mjs';
import {initialDraftVersion} from './draft-version.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const channels=['linkedin','email'];
const requestKey=/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,99}$/;
const permitted=(b,l,draft)=>belongsToCampaign(l,b.id)||!!draft&&draft.botId===b.id;
function deliveryContext(d,id,prospectId,draftId,channel){
  const b=bot(d,id),l=lead(d,prospectId);
  const initial=/^initial-[a-f0-9]{64}$/.test(draftId);
  const draft=initial?null:l.reviewDrafts?.find(r=>r.id===draftId&&r.botId===id);
  if(!isPublishedProspect(l)||!permitted(b,l,draft)||!initial&&!draft)throw new Fault('Select a verified prospect and a saved draft from this bot.',404);
  if(draft&&((channel==='email'&&draft.recipientEmail&&draft.recipientEmail!==l.email)||
     (channel==='linkedin'&&draft.recipientProfile&&draft.recipientProfile!==l.linkedinUrl)))throw new Fault('The recipient changed. Review a new draft before sending.',409);
  const content=draft||l,body=channel==='email'?content.body:content.linkedin;
  if(!body?.trim()||(channel==='email'&&!content.subject?.trim()))throw new Fault('Prepare this channel’s draft before sending.',409);
  return {b,l,initial,body,subject:content.subject||'',to:channel==='email'?email(l.email):l.linkedinUrl};
}
function checkContact(d,l){
  if(['stopped','replied'].includes(l.status)||(l.email&&d.suppressed?.includes(l.email)))throw new Fault('Outreach to this contact is stopped.',409);
}
function emailSender(d,b,sender){
  const hasInbox=d.agentMailKey&&b.inbox?.id&&b.inbox.email;
  if(sender==='agentmail'||!sender&&hasInbox){
    if(!hasInbox)throw new Fault('Connect AgentMail and assign this bot an inbox first.',409);
    return {provider:'agentmail',from:b.inbox.email,senderId:b.inbox.id};
  }
  if(!d.mailbox?.email||!d.mailbox.id)throw new Fault('Connect an outbound mailbox or give this bot an AgentMail inbox.',409);
  return {provider:'smtp',from:d.mailbox.email,senderId:d.mailbox.id};
}
function limit(b){
  const day=now().slice(0,10);
  if(b.day!==day){b.day=day;b.used=0;}
  if((b.used||0)>=Number(b.cap||5))throw new Fault('This bot has reached its daily outreach limit.',429);
  b.used=(b.used||0)+1;
}
function receiptView(r){
  const {requestId,status,provider,providerId,channel,at,from,to,person,reason}=r;
  return {requestId,status,provider,providerId,channel,at,from,to,person,...(reason?{reason}:{})};
}

export async function sendOutreach(input,deps={}){
  const {agentId,prospectId,draftId,channel,requestId,sender}=input;
  if(![agentId,prospectId,draftId].every(v=>typeof v==='string'&&v.length>0&&v.length<150)||
    !channels.includes(channel)||typeof requestId!=='string'||!requestKey.test(requestId)||!['agentmail','mailbox',undefined].includes(sender))throw new Fault('Choose the saved draft, recipient and channel.');
  const get=deps.read||read,change=deps.edit||edit;
  const initial=(await get()).data,ctx=deliveryContext(initial,agentId,prospectId,draftId,channel);
  if(ctx.initial&&await initialDraftVersion(ctx.l,channel)!==draftId)throw new Fault('This draft has changed. Review its current text before sending.',409);
  const contentHash=hash([ctx.to,ctx.subject,ctx.body]);
  const key=hash([agentId,prospectId,draftId,channel]);
  let prep;
  const provider=channel==='linkedin'?(deps.linkedin||await import('./linkedin-messaging.mjs')):null;
  const attempt=randomUUID();
  const result=await change(d=>{
    const {b,l,body,subject,to}=deliveryContext(d,agentId,prospectId,draftId,channel);
    const list=l.outreachReceipts||=[];
    const old=list.findLast(r=>r.key===key);
    const replay=d.leads.flatMap(person=>person.outreachReceipts||[]).find(r=>r.requestId===requestId);
    if(replay&&replay.key!==key)throw new Fault('This send request belongs to a different draft.',409);
    if(replay&&replay!==old)return {receipt:receiptView(replay)};
    if(old&&(old.status!=='rejected'||replay)){
      if(old.status==='sending'&&Date.now()-Date.parse(old.at)>120000)old.status='needs_review';
      return {receipt:receiptView(old)};
    }
    if(hash([to,subject,body])!==contentHash)throw new Fault('The recipient or message changed. Review the current draft.',409);
    checkContact(d,l);
    if(channel==='email'&&(!to||l.status==='sending'||l.status==='needs review'))throw new Fault(!to?'This prospect needs a verified email address.':'Check the previous email delivery before sending.',409);
    if(channel==='linkedin'&&['sending','needs review'].includes(l.linkedinState))throw new Fault('Check the previous LinkedIn delivery before sending.',409);
    if(channel==='linkedin'&&ctx.initial&&l.linkedinState==='sent')throw new Fault('This LinkedIn draft has already been marked sent.',409);
    prep=channel==='email'?emailSender(d,b,sender):provider.prepareLinkedInDM(d,l);
    const delivery=channel==='email'?prep.provider:'linkedin';
    limit(b);
    const receipt={key,requestId,attempt,agentId,prospectId,draftId,channel,provider:delivery,from:prep.from,to,person:l.person,at:now(),status:'sending',fingerprint:contentHash,previous:l.status,previousLinkedIn:l.linkedinState};
    list.push(receipt);
    if(channel==='email'){l.status='sending';l.claimed=receipt.at;l.attempt=attempt;}
    else l.linkedinState='sending';
    return {claimed:true};
  });
  if(result.receipt)return result.receipt;
  let status='needs_review',deliveryId,reason;
  try{
    const latest=(await get()).data;
    const {b,l,body,subject,to}=deliveryContext(latest,agentId,prospectId,draftId,channel);
    const record=l.outreachReceipts.find(r=>r.attempt===attempt);
    let next;
    try{
      checkContact(latest,l);
      next=channel==='email'?emailSender(latest,b,sender):provider.prepareLinkedInDM(latest,l);
      if(!record||record.status!=='sending'||hash([to,subject,body])!==contentHash||next.from!==prep.from||next.senderId!==prep.senderId||
        channel==='email'&&(l.attempt!==attempt||l.status!=='sending'))throw Error('The sender, draft or contact changed.');
    }catch(error){error.definite=true;throw error;}
    let accepted;
    if(channel==='linkedin')accepted=await provider.deliverLinkedInDM(next,body);
    else{
      const owner=(deps.workspaceId||workspaceId)();
      const url='https://oparax.ai/api/leave?w='+owner+'&id='+l.id+'&t='+(deps.leaveToken||leaveToken)(owner+'/'+l.id);
      const message={from:next.from,to,subject:subject.replace(/[\r\n]+/g,' '),text:body+'\n\n'+[next.from,latest.mailbox?.address,'Unsubscribe: '+url].filter(Boolean).join('\n'),
        messageId:'<'+attempt+'@'+next.from.split('@')[1]+'>',headers:{'List-Unsubscribe':'<'+url+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}};
      if(next.provider==='agentmail')accepted=await (deps.agentmail||(await import('./agentmail.mjs')).sendReviewedAgentMail)(latest,next.senderId,message);
      else accepted=await (deps.smtp||(await import('./mail.mjs')).sendReviewedSmtp)(latest.mailbox,message);
    }
    if(!accepted?.providerId)throw Error('No provider acceptance ID.');
    deliveryId=String(accepted.providerId).slice(0,500);status='sent';
  }catch(error){
    status=error.definite?'rejected':'needs_review';
    reason=error instanceof Fault?error.message:error.publicReason||(status==='rejected'?'The provider rejected the send. Check the sender and recipient.':'The provider did not confirm whether it accepted the message. Check the sender’s outbox.');
  }
  return change(d=>{
    const l=lead(d,prospectId),record=l.outreachReceipts.find(r=>r.attempt===attempt);
    record.at=now();record.status=status;if(reason)record.reason=reason;if(deliveryId)record.providerId=deliveryId;
    if(channel==='email'&&l.attempt===attempt){
      if(status==='sent'){l.stage=(l.stage||0)+1;if(l.status==='sending')l.status='complete';}
      else if(l.status==='sending')l.status=status==='rejected'?record.previous:'needs review';
    }else if(channel==='linkedin'&&['sending','needs review'].includes(l.linkedinState)){
      l.linkedinState=status==='sent'?'sent':status==='rejected'?record.previousLinkedIn:'needs review';
    }
    const action=status==='sent'?' was accepted by the sender for ':status==='rejected'?' was rejected before delivery to ':' needs a delivery check for ';
    const summary=(channel==='email'?'Email':'LinkedIn DM')+action+l.person+' at '+l.company+'.';
    note(d,agentId,'assistant',summary);d.messages.at(-1).details={type:'delivery',...receiptView(record)};
    event(d,summary);return receiptView(record);
  });
}
