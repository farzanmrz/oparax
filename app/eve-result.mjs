export function retryTurnPayload(agent){
  const turn=agent?.chatTurn;
  if(!agent?.id||!turn?.requestId||!turn.message||!['unconfirmed','failed'].includes(turn.status))return null;
  const payload={id:agent.id,requestId:turn.requestId,message:turn.message};
  for(const key of ['searchSource','searchSources','sender','draftId'])if(turn[key]!==undefined)payload[key]=turn[key];
  return payload;
}

// The native stream proves a tool was called. Only the workspace receipt confirms its business outcome.
export function visibleEveTools(message){
  if(message?.role!=='assistant')return [];
  return (message.parts||[]).filter(p=>p.type==='tool'&&p.name==='handle_sales_request').map(p=>({id:p.callId,state:p.state}));
}

export function isModelBudgetFailure(error){
  if(!error)return false;
  const info=error.info||{},cause=error.cause||{};
  return [error.code,error.name,error.message,info.code,info.message,info.hint,cause.code,cause.message].some(value=>
    typeof value==='string'&&/\b(?:model_budget|(?:team|gateway|workspace|model|spend|usage|monthly) budget (?:has been |was )?(?:exceeded|reached|exhausted)|(?:exceeded|reached|exhausted) (?:your |the |its |their )?(?:team |gateway |model |monthly |spend )?budget)\b/i.test(value.slice(0,4000)));
}

export const budgetMessage='Oparax’s model service reached its budget. Your request did not complete.';

// A submitted command can appear in the local composer, the durable turn, and the message ledger.
export function conversationRows(messages,turn,pending){
  const rows=messages.filter(row=>!(row.role==='assistant'&&row.eveNoAction&&row.eveNoAction===turn?.requestId));
  for(const item of [turn,pending]){
    if(!item?.requestId||!item.message)continue;
    const matching=rows.findIndex(row=>row.role==='user'&&row.requestId===item.requestId);
    const lastUser=rows.findLastIndex(row=>row.role==='user');
    const legacy=lastUser>=0&&!rows[lastUser].requestId&&rows[lastUser].content===item.message;
    const index=matching>=0?matching:legacy?lastUser:rows.length;
    if(index===rows.length)rows.push({id:'user-'+item.requestId,requestId:item.requestId,role:'user',content:item.message});
    if(item.status==='confirmed'&&item.answer&&rows[index+1]?.role!=='assistant'){
      rows.splice(index+1,0,{id:'answer-'+item.requestId,role:'assistant',content:item.answer});
    }
  }
  return rows;
}

export function chatStatus(turn,{snapshot,pending=false,retrying=false,deliveryError,canManageBudget=false}={}){
  const resuming=snapshot?.status==='resuming',working=snapshot?.status==='busy';
  const incomplete=turn?.status==='unconfirmed'||turn?.status==='failed';
  const budget=turn?.status!=='confirmed'&&(turn?.reason==='model_budget'||snapshot?.reason==='model_budget'||deliveryError?.message===budgetMessage||isModelBudgetFailure(deliveryError));
  if(retrying||pending)return {label:'Working',tone:'working',text:retrying?'Retrying this request…':'Sending your message…'};
  if((resuming||working)&&!snapshot?.error&&!deliveryError&&!budget&&turn?.status!=='failed')
    return {label:resuming?'Reconnecting':'Working',tone:'working',text:resuming?'Reconnecting to the conversation…':'Bot is working…'};
  if(budget){
    const action=canManageBudget?'Review the AI Gateway budget in Vercel before retrying.':'Retry after the Oparax operator restores service.';
    return {label:'Model budget reached',tone:'attention',text:budgetMessage+' '+action,retry:incomplete};
  }
  if(incomplete)return {label:turn.status==='failed'?'Request failed':'Awaiting confirmation',tone:'attention',
    text:turn.status==='failed'?'The bot couldn’t complete this request.':'Your message is saved. The bot hasn’t confirmed a result.',retry:true};
  if(snapshot?.error&&turn?.status!=='confirmed')return {label:'Disconnected',tone:'attention',text:snapshot.error};
  return null;
}
