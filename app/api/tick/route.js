import {Fault,edit,event,failure,read,same,withWorkspace,rpc} from '../../../lib/store.mjs';
import {research} from '../../../lib/agent.mjs';
import {tickMail} from '../../../lib/mail.mjs';
export const runtime='nodejs',maxDuration=300,dynamic='force-dynamic';
async function tickWorkspace(){
 const claim=crypto.randomUUID();const ok=await edit(d=>{if(d.tick&&Date.parse(d.tick.until)>Date.now())return false;d.tick={id:claim,until:new Date(Date.now()+350000).toISOString()};for(const l of d.leads)if(l.status==='sending'&&Date.parse(l.claimed)<Date.now()-360000){l.status='needs review';event(d,l.company+' · delivery status requires review')}return true});if(!ok)return;
 try{let problem;try{await tickMail()}catch(e){problem=e;await edit(d=>{if(d.events[0]?.text!==e.message)event(d,e.message)})}
 const d=(await read()).data;const b=d.bots.filter(b=>b.active&&Date.parse(b.next)<=Date.now()&&(!b.lease||Date.parse(b.lease.until)<Date.now())).sort((a,b)=>a.next.localeCompare(b.next))[0];if(b)await research(b.id);if(problem)throw problem;
 }finally{await edit(d=>{if(d.tick?.id===claim)delete d.tick})}
}


export async function GET(req) {
  try {
    if(!process.env.CRON_SECRET||!same(req.headers.get('authorization'),'Bearer '+process.env.CRON_SECRET))throw new Fault('Unauthorized.',401);
    const ids=await rpc('outreach_worker_batch',{batch_size:6});
    const runs=await Promise.allSettled(ids.map(uid=>withWorkspace(uid,tickWorkspace)));
    if(runs.some(run=>run.status==='rejected'))throw new Fault('One or more scheduled workspaces could not finish.',503);
    return Response.json({ok:true});
  } catch(error){return failure(error);}
}
