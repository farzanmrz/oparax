import {after} from 'next/server';
import {Fault,failure,read,verifiedUser,withWorkspace} from '../../../lib/store.mjs';
import {bot} from '../../../lib/domain.mjs';
import {publicJobAuthorized} from '../../../lib/research-access.mjs';
import {runResearchBatch} from '../../../lib/research-job.mjs';
import {pendingSourceWork,runSourceTask} from '../../../lib/source-tasks.mjs';
import {parseTicket,prepareEveSession} from '../../../lib/eve-bridge.mjs';
export const runtime='nodejs',dynamic='force-dynamic',maxDuration=300;
export async function POST(req){
  try{
    const claims=parseTicket(req.headers.get('authorization')?.replace(/^Bearer /,''));
    if(claims?.scope==='work'){
      const work=await withWorkspace(claims.uid,async()=>{
        const d=(await read()).data,b=bot(d,claims.bot),receipt=d.conversationReceipts?.[claims.requestId];
        if(!receipt||receipt.agentId!==b.id)throw new Fault('This command has no authorized work.',403);
        return {publicWork:receipt.jobId&&receipt.jobId===b.researchRequestedAt&&publicJobAuthorized(b)?{requestedAt:receipt.jobId,page:b.researchJob?.pages||0}:null,sources:receipt.taskId?pendingSourceWork(d,b,receipt.taskId):[]};
      });
      after(()=>withWorkspace(claims.uid,()=>Promise.allSettled([...work.sources.map(w=>runSourceTask(claims.bot,w)),...(work.publicWork?[runResearchBatch(claims.bot,work.publicWork)]:[])])));
      return Response.json({queued:true},{status:202});
    }
    const user=await verifiedUser(req),body=await req.text();if(body.length>20000)throw new Fault('Request too large.',413);
    let input;try{input=JSON.parse(body);}catch{throw new Fault('Invalid session request.');}
    const queue=req.headers.get('x-oparax-delivery')==='queue';
    const result=await withWorkspace(user.id,()=>prepareEveSession(user.id,input,{},queue));
    return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){return failure(e);}
}
