export const aiBudgetMessage='The workspace AI Gateway budget has been reached. A workspace administrator can review the budget in Vercel AI Gateway.';
export const draftBudgetMessage=aiBudgetMessage+' Request a new draft when funding is available.';

// AI SDK can wrap the Gateway's HTTP 402 inside a generic internal-server error.
// Use only on calls made through AI Gateway. Other paid providers have separate budgets.
export function isAiBudgetError(error) {
  const todo=[error],seen=new Set();
  while(todo.length&&seen.size<60){
    const v=todo.pop();if(v==null||seen.has(v))continue;seen.add(v);
    if(typeof v==='string'&&/(?:team|workspace|gateway|spend(?:ing)?) budget (?:has been |is )?(?:reached|exceeded)|payment required|insufficient (?:gateway )?credits/i.test(v))return true;
    if(typeof v!=='object')continue;
    if([v.statusCode,v.upstreamStatusCode,v.status].some(c=>Number(c)===402))return true;
    for(const k of ['cause','lastError','error','errors','message','apiErrorMessage','upstreamMessage','data','responseBody','response','details'])if(v[k]!==undefined)todo.push(v[k]);
    if(Array.isArray(v))todo.push(...v.slice(0,8));
  }
  return false;
}
