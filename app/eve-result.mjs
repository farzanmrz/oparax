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
