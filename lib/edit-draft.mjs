import {Fault,edit,read,now} from './store.mjs';
import {bot,lead} from './domain.mjs';
import {belongsToCampaign,isPublishedProspect} from './qualification.mjs';
import {initialDraftVersion} from './draft-version.mjs';

export async function reviseDraft(input,deps={}){
  const {agentId,prospectId,baseId,requestId,channel}=input;
  if(!['email','linkedin'].includes(channel)||![agentId,prospectId,baseId,requestId].every(v=>typeof v==='string'&&v.length>0&&v.length<150)||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,99}$/.test(requestId))throw new Fault('Select a saved draft to edit.');
  const body=typeof input.body==='string'?input.body.trim():'';
  const subject=typeof input.subject==='string'?input.subject.trim().replace(/[\r\n]+/g,' '):'';
  if(!body||body.length>(channel==='email'?3500:1500)||channel==='email'&&(!subject||subject.length>180))throw new Fault('Check the subject and message length.');
  const d=(await (deps.read||read)()).data;
  bot(d,agentId);
  const original=lead(d,prospectId);
  const initial=baseId.startsWith('initial-');
  const visible=person=>isPublishedProspect(person)&&(belongsToCampaign(person,agentId)||person.reviewDrafts?.some(v=>v.botId===agentId&&v.id===baseId));
  if(!visible(original)||initial&&await initialDraftVersion(original,channel)!==baseId)throw new Fault('The original draft changed or is unavailable. Review it again.',409);
  const snapshot=person=>channel==='email'?[person.email,person.subject,person.body]:[person.linkedinUrl,person.linkedin];
  const initialText=JSON.stringify(snapshot(original));
  return (deps.edit||edit)(data=>{
    bot(data,agentId);const person=lead(data,prospectId);
    if(!visible(person)||initial&&JSON.stringify(snapshot(person))!==initialText)throw new Fault('The prospect changed. Open the current draft.',409);
    if(!initial&&!person.reviewDrafts?.some(v=>v.id===baseId&&v.botId===agentId))throw new Fault('This draft version no longer exists.',404);
    const list=person.reviewDrafts||=[];
    const id='edited-'+requestId;
    const existing=list.find(v=>v.id===id);
    if(existing){
      if(existing.botId!==agentId||existing.baseId!==baseId||existing.channel!==channel||
        (channel==='email'?(existing.subject!==subject||existing.body!==body):existing.linkedin!==body))throw new Fault('This edit request was already used for a different message.',409);
      return existing;
    }
    const draft={id,botId:agentId,baseId,at:now(),channel,recipientEmail:person.email||'',recipientProfile:person.linkedinUrl,
      ...(channel==='email'?{subject,body}:{linkedin:body})};
    list.push(draft);return draft;
  });
}
