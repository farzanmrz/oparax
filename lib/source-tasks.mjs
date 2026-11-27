import {createHash,randomUUID} from 'node:crypto';
import {edit,now} from './store.mjs';
import {selectedSearchSources} from './search-source.mjs';
import {mailboxAuthorized,qualifiedForTask} from './source-states.mjs';
import {mailboxBriefSignature} from './mailbox-scope.mjs';
import {bot} from './domain.mjs';

const canRun=(d,b,key)=>key==='email'?mailboxAuthorized(d,b):key==='rocketreach'&&!!d.rocketReach?.key;
function requestKey(id,source){
  const bytes=createHash('sha256').update(id+'/'+source).digest().subarray(0,16);
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const h=bytes.toString('hex');return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}
export function pendingSourceWork(d,b,taskId=b.sourceTask?.id) {
  const task=b.sourceTask;if(!task||task.id!==taskId||task.signature!==mailboxBriefSignature(b))return [];
  return selectedSearchSources(b).filter(source=>canRun(d,b,source)&&task.providers[source]&&
    (task.providers[source].status==='queued'||task.providers[source].status==='running'&&Date.parse(task.providers[source].until)<Date.now()))
    .map(source=>({source,taskId,requestId:task.providers[source].requestId}));
}
export function stageSourceTasks(d,b){
  const sources=selectedSearchSources(b),signature=mailboxBriefSignature(b);
  if(!sources.length)return [];
  if(b.sourceTask?.signature!==signature)b.sourceTask={id:randomUUID(),at:now(),signature,providers:{}};
  const task=b.sourceTask;
  for(const source of sources)if(canRun(d,b,source)&&!task.providers[source])task.providers[source]={requestId:requestKey(task.id,source),status:'queued'};
  return pendingSourceWork(d,b);
}
export async function runSourceTask(id,work,deps={}){
  const change=deps.edit||edit;
  const claimed=await change(d=>{
    const b=bot(d,id),row=b.sourceTask?.providers?.[work.source];
    if(!pendingSourceWork(d,b,work.taskId).some(p=>p.source===work.source&&p.requestId===work.requestId))return false;
    row.status='running';row.until=new Date(Date.now()+300000).toISOString();return {remaining:Math.max(0,(b.researchJob?.goal||b.sourceTask.goal||50)-qualifiedForTask(d,b).length)};
  });
  if(!claimed)return;
  let failed='',continuing=false;
  try{
    if(work.source==='rocketreach'){const result=await (deps.rocketreach||(await import('./rocketreach.mjs')).runRocketReach)(id,{requestId:work.requestId,remaining:claimed.remaining});continuing=result?.continuing===true;}
    else await (deps.email||(await import('./mailbox-research.mjs')).runConsentedMailboxResearch)(id,work.requestId);
  }catch(e){failed=e.status?String(e.message).slice(0,300):'The source could not finish this search.';}
  await change(d=>{
    const b=bot(d,id),task=b.sourceTask,row=task?.providers?.[work.source];
    if(task?.id!==work.taskId||row?.requestId!==work.requestId)return;
    const receipt=work.source==='rocketreach'?b.rocketReach?.receipt:b.lastMailboxResearch;
    row.status=failed?'failed':continuing?'queued':receipt?.status||'completed';row.summary=failed||receipt?.message||'';delete row.until;
    if(b.researchJob){const ids=qualifiedForTask(d,b);b.researchJob.qualifiedIds=ids;b.researchJob.qualified=ids.length;}
  });
}
