'use client';
// Adapted from Vercel's eve Web Chat template, apps/web/app/_components/agent-chat.tsx
// and apps/web/components/chat/composer.tsx. Supabase binds each session to its bot.
// Copyright 2026 Vercel, Inc. and contributors. Apache-2.0, see /licenses/eve-apache-2.txt.
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {useEveAgent} from 'eve/react';
import {activeTurn} from 'eve/events';
import {budgetMessage,isModelBudgetFailure,visibleEveTools} from './eve-result.mjs';

export async function prepareEveSession(getToken,payload,signal){
  const res=await fetch('/api/eve-session',{method:'POST',cache:'no-store',signal,
    headers:{Authorization:'Bearer '+await getToken(),'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||'The bot session could not open.');
  if(!data.agentId||!data.sessionId||!data.bearer||(payload.id&&data.agentId!==payload.id))throw Error('The bot session could not be verified.');
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
    if(!command||command.started||command.ticket.sessionId!==ticket.sessionId||agent.status==='resuming')return;
    command.started=true;
    agent.send(command.payload.message,{idempotencyKey:ticket.deliveryKey||command.payload.requestId,turnPolicy:'queue'}).then(()=>onAccepted(command)).catch(e=>command.reject(new Error(isModelBudgetFailure(e)?budgetMessage:'The bot could not confirm the request. Refresh the conversation to check its status.')));
  },[command,ticket.sessionId,agent.status,agent.send,onAccepted]);
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

export function EveActivity({snapshot,turn,messages,pending,onRetry,canManageBudget=false}){
  const [retrying,setRetrying]=useState(false);
  const busy=snapshot?.status==='busy'||snapshot?.status==='resuming';
  const budget=turn?.status!=='confirmed'&&(turn?.reason==='model_budget'||snapshot?.reason==='model_budget');
  const incomplete=turn&&['unconfirmed','failed'].includes(turn.status);
  const userVisible=messages.some(m=>m.role==='user'&&(m.requestId===turn?.requestId||m.content===turn?.message));
  const persistedAnswer=turn?.status==='confirmed'&&turn.answer&&!messages.some(m=>m.role==='assistant'&&(m.content===turn.answer||turn.answer.includes(m.content)));
  if(!busy&&!budget&&!snapshot?.error&&!incomplete&&!persistedAnswer)return null;
  async function retry(){
    if(retrying||busy||pending)return;
    setRetrying(true);try{await onRetry?.()}finally{setRetrying(false)}
  }
  return <section className="eve-turn" aria-label="Bot response">
    {turn?.message&&!pending&&!userVisible&&<p><strong>You</strong> · {turn.message}</p>}
    {budget?<div role="alert" className="error"><p>{budgetMessage}</p><p>{canManageBudget?'Review the AI Gateway budget in Vercel before retrying.':'Retry after the Oparax operator restores service.'}</p></div>:snapshot?.error&&<p role="alert" className="error">{snapshot.error}</p>}
    {!budget&&(busy||pending||retrying)&&<small role="status">{snapshot?.status==='resuming'?'Reconnecting to the conversation…':retrying?'Retrying this request…':'Bot is working…'}</small>}
    {busy&&!!snapshot?.tools?.length&&<details open><summary>Live tool activity</summary><ul>{snapshot.tools.map((part,i)=><li key={part.id||i}>Sales request · {part.state}</li>)}</ul></details>}
    {persistedAnswer&&<p>{turn.answer}</p>}
    {incomplete&&!busy&&!pending&&!retrying&&<div role="status">{!budget&&<p>{turn.status==='failed'?'The bot finished without completing this request.':'This request has no confirmed result yet.'}</p>}<button type="button" onClick={retry}>{budget?'Retry after budget is restored':'Retry this request'}</button></div>}
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
