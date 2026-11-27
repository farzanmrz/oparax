'use client';
import {useEffect,useRef,useState} from 'react';
import {initialDraftVersion} from '../lib/draft-version.mjs';
import {linkedinProfileUrl} from '../lib/profile-url.mjs';
import './send-draft.css';

async function api(path,payload,getToken){
  const response=await fetch(path,{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+await getToken(),'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'The request could not finish.');return data;
}
function ChannelDraft({channel,agent,lead,draft,workspace,getToken,onRefresh,onOpen,onFindEmail,preview}){
  const mail=channel==='email',service=mail?'email':'LinkedIn DM';
  const addr=mail?lead.email:linkedinProfileUrl(lead.linkedinUrl);
  const content=mail?(draft||lead).body:(draft||lead).linkedin;
  const originalSubject=mail?(draft||lead).subject:'';
  const [subject,setSubject]=useState(originalSubject||''),[body,setBody]=useState(content||'');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(null);
  const inbox=agent.inbox?.email&&workspace.agentMailConnected?agent.inbox.email:'';
  const mailbox=workspace.mailbox?.email||'';
  const [sender,setSender]=useState(inbox?'agentmail':'mailbox');
  const attempt=useRef(null),inFlight=useRef(false);
  const [initialId,setInitialId]=useState('');
  useEffect(()=>{let active=true;if(!draft)initialDraftVersion(lead,channel).then(id=>{if(active)setInitialId(id)}).catch(()=>{});return()=>{active=false}},[draft,lead.id,lead.email,lead.linkedinUrl,lead.subject,lead.body,lead.linkedin,channel]);
  if(!content)return null;
  const reviewed=draft?.id||initialId;
  const versions=new Set([reviewed,...(lead.reviewDrafts||[]).filter(r=>r.botId===agent.id&&r.baseId===reviewed).map(r=>r.id)]);
  const prior=lead.outreachReceipts?.findLast(r=>r.agentId===agent.id&&r.channel===channel&&versions.has(r.draftId));
  const state=receipt||prior;
  const linkedin=workspace.linkedinMessaging||{};
  function change(reset,value){reset(value);attempt.current=null;setError('')}
  async function connectDM(){
    setBusy(true);setError('');
    try{
      const result=await api('/api/linkedin-messaging/connect',{},getToken),to=new URL(result.url);
      if(to.protocol!=='https:'||to.hostname!=='www.linkedin.com'||!to.pathname.startsWith('/oauth/'))throw Error('The LinkedIn authorization link is unavailable.');
      location.assign(to.href);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function send(e){
    e.preventDefault();if(inFlight.current||preview)return;
    inFlight.current=true;setBusy(true);setError('');
    try{
      if(!attempt.current)attempt.current={requestId:crypto.randomUUID(),editId:crypto.randomUUID()};
      const request=attempt.current,base=draft?.id||await initialDraftVersion(lead,channel);
      let draftId=base;
      if(body.trim()!==content.trim()||mail&&subject.trim()!==originalSubject.trim()){
        const revision=await api('/api/outreach-draft',{agentId:agent.id,prospectId:lead.id,baseId:base,requestId:request.editId,channel,subject,body},getToken);
        draftId=revision.draft.id;
      }
      const {receipt:sent}=await api('/api/outreach-send',{agentId:agent.id,prospectId:lead.id,draftId,channel,requestId:request.requestId,...(mail?{sender}:{})},getToken);
      setReceipt(sent);if(sent.status==='rejected')attempt.current=null;
      if(onRefresh)await Promise.resolve(onRefresh()).catch(()=>{});
    }catch(e){setError(e.message||'The send request could not be confirmed.');}
    finally{inFlight.current=false;setBusy(false);}
  }
  if(preview)return <div className="send-draft-sample"><a href="/">Sign in to send {service}</a></div>;
  if(state&&state.status!=='rejected')return <p className="send-draft-receipt" role="status">{state.status==='sent'?'Sent from '+state.from+' to '+(state.to||lead.person)+'.':state.status==='sending'?'Sending. Check the delivery receipt here.':'Delivery is uncertain. Check the sender’s outbox before trying again.'}</p>;
  return <details className="send-draft"><summary>Review &amp; send {service}</summary>
    <p className="send-draft-to">To <b>{lead.person}</b>{addr&&mail?' · '+addr:''}</p>
    {mail&&!addr?<p>No verified work email yet. {onFindEmail&&<button type="button" onClick={()=>onFindEmail(lead)}>Find work email</button>}</p>
    :mail&&!mailbox&&!inbox?<div className="send-draft-senders"><button type="button" onClick={()=>onOpen?.('connect')}>Connect my mailbox</button><button type="button" onClick={()=>onOpen?.(workspace.agentMailConnected?'inbox':'agentmail')}>Set up bot inbox</button></div>
    :!mail&&!linkedin.connected?<div className="send-draft-handoff">{linkedin.available?<button type="button" disabled={busy} onClick={connectDM}>Connect LinkedIn messaging</button>:<p>Direct sending requires LinkedIn’s approved messaging connection.</p>}
      {addr&&<a href={addr} target="_blank" rel="noopener noreferrer">Open {lead.person}’s profile to send ↗</a>}</div>
    :<form onSubmit={send}>
      {mail&&inbox&&mailbox?<label>From<select value={sender} onChange={e=>change(setSender,e.target.value)}><option value="agentmail">{inbox} · bot inbox</option><option value="mailbox">{mailbox} · my mailbox</option></select></label>:
        <p className="send-draft-to">From <b>{mail?(inbox||mailbox):'Connected LinkedIn account'}</b></p>}
      {mail&&<label>Subject<input maxLength={180} required value={subject} onChange={e=>change(setSubject,e.target.value)}/></label>}
      <label>Message<textarea rows={4} maxLength={mail?3500:1500} required value={body} onChange={e=>change(setBody,e.target.value)}/></label>
      <button className="primary" type="submit" disabled={busy||!body.trim()||mail&&!subject.trim()}>{busy?'Sending…':state?.status==='rejected'?'Retry send':'Send '+service}</button>
    </form>}
    {state?.status==='rejected'&&<p role="status">{state.reason||'The provider rejected the previous send.'}</p>}
    {error&&<p role="alert" className="error">{error}</p>}
  </details>;
}
export default function SendDraft(props){
  if(!props.agent||!props.lead)return null;
  const channel=(props.channel||props.draft?.channel||'both').toLowerCase();
  return <div className="send-draft-group">{(channel==='both'?['email','linkedin']:[channel==='email'?'email':'linkedin']).map(c=><ChannelDraft {...props} key={[props.lead.id,props.draft?.id||'initial',c].join('/')} channel={c} preview={props.preview||props.isDemo}/>)}</div>;
}
