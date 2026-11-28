'use client';
// Adapted from Vercel's eve Web Chat template, apps/web/app/_components/agent-chat.tsx
// and apps/web/components/chat/composer.tsx. Supabase binds each session to its bot.
// Copyright 2026 Vercel, Inc. and contributors. Apache-2.0, see /licenses/eve-apache-2.txt.
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {useEveAgent} from 'eve/react';
import {activeTurn} from 'eve/events';
import {budgetMessage,chatStatus,isModelBudgetFailure,visibleEveTools} from './eve-result.mjs';

export async function prepareEveSession(getToken,payload,signal){
  const res=await fetch('/api/eve-session',{method:'POST',cache:'no-store',signal,
    headers:{Authorization:'Bearer '+await getToken(),'Content-Type':'application/json',...(payload.message?{'X-Oparax-Delivery':'queue'}:{})},body:JSON.stringify(payload)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||'The bot session could not open.');
  if(!data.agentId||!data.sessionId||!data.bearer||(payload.id&&data.agentId!==payload.id))throw Error('The bot session could not be verified.');
  if(payload.message&&!data.deliveryId)throw Error('Your message was saved. Eve did not confirm delivery. Retry this request.');
  return data;
}

function Session({ticket,command,getToken,onSnapshot,onSettled,onAccepted}){
  const tokenRef=useRef(ticket),received=useRef(ticket.bearer),renewing=useRef(null);
  if(received.current!==ticket.bearer){received.current=ticket.bearer;tokenRef.current=ticket}
  async function bearer(){
    const token=tokenRef.current,expires=typeof token.expiresAt==='number'?token.expiresAt:Date.parse(token.expiresAt);
    if(Number.isFinite(expires)&&expires>Date.now()+25000)return token.bearer;
    if(!renewing.current)renewing.current=prepareEveSession(getToken,{id:ticket.agentId}).then(next=>{
      if(next.sessionId!==ticket.sessionId)throw Error('This bot started a new session. Reopen its conversation.');
      if(tokenRef.current===token)tokenRef.current=next;return tokenRef.current.bearer;
    }).finally(()=>{renewing.current=null});
    return renewing.current;
  }
  const agent=useEveAgent({initialSession:{sessionId:ticket.sessionId,streamIndex:0},auth:{bearer},resume:true,
    followWhile:view=>!!activeTurn(view),onFinish:onSettled});
  useEffect(()=>{
    if(!command||command.started||command.ticket.sessionId!==ticket.sessionId)return;
    command.started=true;
    // The native POST has already accepted this exact message. Following the
    // receipt is independently resumable and must never send the action again.
    onAccepted(command);
    agent.follow({sessionId:ticket.sessionId,deliveryId:command.ticket.deliveryId});
  },[command,ticket.sessionId,agent.follow,onAccepted]);
  useEffect(()=>{
    const tools=visibleEveTools(agent.messages.at(-1));
    onSnapshot({id:ticket.agentId,sessionId:ticket.sessionId,status:agent.status,tools,reason:isModelBudgetFailure(agent.error)?'model_budget':null,error:agent.error?'The live connection was interrupted.':''});
  },[ticket.agentId,ticket.sessionId,agent.messages,agent.status,agent.error,onSnapshot]);
  return null;
}

export function EveBotBridge({selectedId,command,getToken,onSnapshot,onSettled,onAccepted}){
  const [restored,setRestored]=useState(null),origin=command?.ticket.agentId||selectedId;
  const bound=command?.ticket||((restored?.agentId===origin)?restored:null);
  const callbacks=useRef({getToken,onSnapshot,onSettled,onAccepted});callbacks.current={getToken,onSnapshot,onSettled,onAccepted};
  const readToken=useCallback(()=>callbacks.current.getToken(),[]);
  const update=useCallback(state=>callbacks.current.onSnapshot(state),[]);
  const settle=useCallback(()=>{Promise.resolve(callbacks.current.onSettled()).catch(()=>{})},[]);
  const accept=useCallback(turn=>callbacks.current.onAccepted(turn),[]);
  useEffect(()=>{
    if(!origin||command)return;
    if(restored?.agentId===origin)return;
    const controller=new AbortController();
    prepareEveSession(readToken,{id:origin},controller.signal).then(ticket=>{if(!controller.signal.aborted)setRestored(ticket)}).catch(error=>{
      if(!controller.signal.aborted)update({id:origin,status:'idle',parts:[],error:error.message});
    });
    return ()=>controller.abort();
  },[origin,command,readToken,restored?.agentId,update]);
  useEffect(()=>{if(command)setRestored(command.ticket)},[command]);
  return bound?<Session key={bound.sessionId} ticket={bound} command={command} getToken={readToken} onSnapshot={update} onSettled={settle} onAccepted={accept}/>:null;
}

export function EveActivity({snapshot,turn,pending,onRetry,deliveryError,canManageBudget=false}){
  const [retrying,setRetrying]=useState(false);
  const status=chatStatus(turn,{snapshot,pending,retrying,deliveryError,canManageBudget});
  if(!status)return null;
  async function retry(){
    if(retrying||!status.retry)return;
    setRetrying(true);try{await onRetry?.()}finally{setRetrying(false)}
  }
  return <section className="eve-turn" aria-label="Bot response">
    <p role={status.tone==='attention'?'alert':'status'}>{status.text}</p>
    {status.retry&&<button type="button" onClick={retry}>Retry this request</button>}
    {status.tone==='working'&&!!snapshot?.tools?.length&&<details open><summary>Live tool activity</summary><ul>{snapshot.tools.map((part,i)=><li key={part.id||i}>Sales request · {part.state}</li>)}</ul></details>}
  </section>;
}

export function ChatComposer({value,onChange,onSubmit,disabled,isBusy,placeholder,agent,field}){
  const composerId=useId(),trimmed=value.trim();
  const submitValue=useCallback(()=>{
    if(trimmed&&!disabled&&!isBusy&&trimmed.length<=2000)void onSubmit(trimmed);
  },[trimmed,disabled,isBusy,onSubmit]);
  return <form data-chat-composer onSubmit={e=>{e.preventDefault();submitValue()}}>
    <label className="composer-label" htmlFor={composerId}>{agent?'Message '+agent.name:'First task for your bot'}</label>
    <div className="composer-input"><textarea data-chat-composer-input id={composerId} ref={field} value={value} maxLength={2000} rows={2}
      disabled={isBusy} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();submitValue()}}}/>
      <button className="primary composer-send" type="submit" aria-label={agent?'Send message':'Create bot and send task'} disabled={disabled||isBusy||!trimmed}>
        {isBusy?'Working…':agent?'Send':'Create bot'} <span aria-hidden="true">↑</span>
      </button></div>
  </form>;
}
