export const computerWaitMs=22*60*1000;
function wait(ms,signal){
  return new Promise((resolve,reject)=>{
    signal.throwIfAborted();
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},ms);
    function abort(){clearTimeout(timer);signal.removeEventListener('abort',abort);reject(signal.reason)}
    signal.addEventListener('abort',abort,{once:true});
  });
}

export async function startComputer({agentId,provider,requestId,getToken,onStarting,signal},{request=fetch,delay=wait,now=Date.now}={}){
  const deadline=now()+computerWaitMs;
  const body=JSON.stringify({agentId,provider,requestId});
  while(now()<deadline){
    signal.throwIfAborted();
    const token=await getToken();
    signal.throwIfAborted();
    const response=await request('/api/agent-computer',{method:'POST',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body,cache:'no-store',signal});
    const data=await response.json().catch(()=>({}));
    signal.throwIfAborted();
    if(!response.ok)throw Error(data.error||'The agent computer could not open.');
    if(response.status===202||data.status==='starting'){
      onStarting();
      const retry=Number(data.retryAfterMs)||3500;
      await delay(Math.min(deadline-now(),Math.max(2000,Math.min(6000,retry))),signal);
      continue;
    }
    const expires=typeof data.expiresAt==='number'?data.expiresAt:Date.parse(data.expiresAt);
    let url;try{url=new URL(data.url)}catch{}
    if(!url||data.provider!==provider||url.protocol!=='https:'||url.username||url.password||!Number.isFinite(expires)||expires<=now()){
      throw Error('The agent computer returned an invalid or expired session.');
    }
    return {url:url.href,expiresAt:new Date(expires).toISOString()};
  }
  throw Error('The computer is taking longer than expected. Open it again to reconnect.');
}
