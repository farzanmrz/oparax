const visible=['message','requestId','searchSources','searchSource','sender','draftId'];
export const noActionMessage='The agent could not complete this message. You can retry the same message.';
export const budgetMessage='Oparax’s model service reached its budget. Your request did not complete. Status, saved results and business-memory updates are still available.';
export function canonicalAnswer(data,id,requestId){
  const messages=data.messages||[],start=messages.findLastIndex(m=>m.botId===id&&m.role==='user'&&m.requestId===requestId&&!m.eveNoAction);
  if(start<0)return '';
  const replies=[];
  for(const m of messages.slice(start+1)){
    if(m.botId!==id)continue;
    if(m.role==='user')break;
    if(m.role==='assistant'&&!m.eveNoAction&&typeof m.content==='string')replies.push(m.content);
  }
  return replies.join('\n\n').slice(0,8500);
}
export function publicTurn(data,b,requestId=b.eveLatestRequestId||Object.keys(b.eveInputs||{}).at(-1)){
  const row=b.eveInputs?.[requestId];if(!row?.command)return null;
  const done=data.conversationReceipts?.[requestId]?.agentId===b.id;
  const status=done?'confirmed':row.failure?.key===(row.deliveryKey||requestId)?'failed':'unconfirmed';
  const command=Object.fromEntries(visible.filter(k=>row.command[k]!==undefined).map(k=>[k,row.command[k]]));
  return {...command,status,...(done?{answer:canonicalAnswer(data,b.id,requestId)}:status==='failed'?{reason:row.failure.reason||'no_action',answer:row.failure.reason==='model_budget'?budgetMessage:noActionMessage}:{})};
}
