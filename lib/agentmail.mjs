import {requireSkill} from './sales-skills.mjs';
import {Fault,edit,event,read,seal,unseal} from './store.mjs';
import {bot,text} from './domain.mjs';
async function call(key,path,body){const r=await fetch('https://api.agentmail.to/v0/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(16000),cache:'no-store'});if(!r.ok)throw new Fault('AgentMail returned '+r.status+'. Check your key, inbox permissions and account limits.',502);return r.json()}
export async function linkKey(value){const key=text(value,1000);if(key.length<8)throw new Fault('Enter your AgentMail API key.');await call(key,'inboxes?limit=1');await edit(d=>{d.agentMailKey=seal(key);event(d,'AgentMail connected')})}
export async function inbox(id,action,p={}){const d=(await read()).data;const b=bot(d,id);if(!d.agentMailKey)throw new Fault('Connect AgentMail under Mailbox first.');const key=unseal(d.agentMailKey);
 if(action==='inboxCreate'){const v=await call(key,'inboxes',{client_id:'oparax-'+id,display_name:b.name});if(!v.inbox_id||!v.email)throw new Fault('AgentMail returned an incomplete inbox.',502);await edit(s=>{const b=bot(s,id);b.inbox={id:v.inbox_id,email:v.email};event(s,'Assigned '+v.email+' to '+b.name)});return}
 if(!b.inbox)throw new Fault('Create an inbox for this agent first.');const path='inboxes/'+encodeURIComponent(b.inbox.id)+'/messages';
 if(action==='inboxSync'){const v=await call(key,path+'?limit=50&labels=received');const list=(v.messages||[]).filter(m=>m.labels?.includes('received')&&!m.labels.some(x=>['spam','blocked','unauthenticated','quarantined'].includes(x))).map(m=>({id:m.message_id,from:text(m.from,250),subject:text(m.subject,250),preview:text(m.preview,1500),at:m.timestamp}));await edit(s=>{bot(s,id).inbound=list});return}
 requireSkill(b,'email_delivery');
 const incoming=b.inbound?.find(x=>x.id===p.messageId);if(!incoming||!text(p.reply,3000))throw new Fault('Select an incoming message and write a reply.');const body=text(p.reply,3000);
 await edit(s=>{const b=bot(s,id);requireSkill(b,'email_delivery');b.replyState||={};if(b.replyState[incoming.id])throw new Fault('This message already has a sent or pending reply.',409);b.replyState[incoming.id]='sending'});
 try{await call(key,path+'/'+encodeURIComponent(incoming.id)+'/reply',{text:body})}catch(e){await edit(s=>{bot(s,id).replyState[incoming.id]='check delivery'});throw e}
 await edit(s=>{bot(s,id).replyState[incoming.id]='sent';event(s,b.name+' · replied from '+b.inbox.email)})}

export async function sendReviewedAgentMail(data,inboxId,message){
  const response=await fetch('https://api.agentmail.to/v0/inboxes/'+encodeURIComponent(inboxId)+'/messages/send',{
    method:'POST',headers:{Authorization:'Bearer '+unseal(data.agentMailKey),'Content-Type':'application/json'},
    body:JSON.stringify({to:[message.to],subject:message.subject,text:message.text,headers:message.headers}),
    signal:AbortSignal.timeout(18000),cache:'no-store'
  });
  if(!response.ok){
    const error=new Error('AgentMail rejected the send.');
    error.definite=[400,401,403,404,422,429].includes(response.status);
    if(error.definite)error.publicReason='AgentMail rejected the send (HTTP '+response.status+'). Check the bot inbox and its permissions.';
    throw error;
  }
  const value=await response.json();
  if(!value.message_id)throw Error('The mail provider did not return a message ID.');
  return {providerId:value.message_id};
}
