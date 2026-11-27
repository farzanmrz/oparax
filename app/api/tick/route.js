import {Fault,edit,event,failure,read,same} from '../../../lib/store.mjs';
import {research} from '../../../lib/agent.mjs';
import {tickMail} from '../../../lib/mail.mjs';
export const runtime='nodejs',maxDuration=300,dynamic='force-dynamic';
export async function GET(req){try{if(!process.env.CRON_SECRET||!same(req.headers.get('authorization'),'Bearer '+process.env.CRON_SECRET))throw new Fault('Unauthorized.',401);
 const claim=crypto.randomUUID();const ok=await edit(d=>{if(d.tick&&Date.parse(d.tick.until)>Date.now())return false;d.tick={id:claim,until:new Date(Date.now()+350000).toISOString()};for(const l of d.leads)if(l.status==='sending'&&Date.parse(l.claimed)<Date.now()-360000){l.status='needs review';event(d,l.company+' · delivery status requires review')}return true});if(!ok)return Response.json({busy:true});
 try{let problem;try{await tickMail()}catch(e){problem=e;await edit(d=>{if(d.events[0]?.text!==e.message)event(d,e.message)})}
 const d=(await read()).data;const b=d.bots.filter(b=>b.active&&Date.parse(b.next)<=Date.now()&&(!b.lease||Date.parse(b.lease.until)<Date.now())).sort((a,b)=>a.next.localeCompare(b.next))[0];if(b)await research(b.id);if(problem)throw problem;
 }finally{await edit(d=>{if(d.tick?.id===claim)delete d.tick})}return Response.json({ok:true})}catch(e){return failure(e)}}
