import {createHash,createHmac} from 'node:crypto';
import {Fault,edit,now,read,rpc,same,serviceKey,workspaceId} from './store.mjs';

export const DEFAULT_RESEARCH_GOAL=50;
const dryLimit=4;

export function ensureResearchJob(b,requestId) {
  if(b.researchJob?.id!==requestId){
    b.researchJob={id:requestId,goal:DEFAULT_RESEARCH_GOAL,qualified:0,qualifiedIds:[],seen:[],pending:[],queries:[],candidates:[],
      pages:0,dryPages:0,blockedPages:0,status:'running',counts:{}};
  }
  b.researchRequestedAt=requestId;
  return b.researchJob;
}

export function advanceResearchJob(b,{page,counts={},qualifiedIds=[],seen=[],pending=[],queries=[],candidates=[],facetsCovered=false,status,terminalReason='',question=''}) {
  const job=b.researchJob;
  if(!job||job.pages!==page)throw new Fault('This research batch was already processed.',409);
  const oldQualified=job.qualified;
  const normalized=list=>list.filter(value=>typeof value==='string').map(value=>value.trim().toLowerCase().replace(/\s+/g,' ')).filter(Boolean);
  const priorQueries=new Set(job.queries||[]);
  const newQueries=normalized(queries).filter(query=>!priorQueries.has(query));
  job.queries=[...new Set([...priorQueries,...newQueries])];
  const priorCandidateCount=job.candidates?.length||0;
  job.candidates=[...new Set([...(job.candidates||[]),...normalized(candidates)])];
  job.qualifiedIds=[...new Set([...job.qualifiedIds,...qualifiedIds.filter(Boolean)])];
  job.qualified=job.qualifiedIds.length;
  job.seen=[...new Set([...job.seen,...seen.filter(Boolean)])];
  const pendingKey=p=>String(p.linkedinUrl||[p.company,p.person].join('/')).toLowerCase();
  const incomplete=new Map([...(job.pending||[]),...pending].filter(p=>p&&typeof p==='object'&&p.reason&&p.person).map(p=>[pendingKey(p),p]));
  const resolved=new Set(pending.filter(p=>p?.resolved).map(p=>[p.company,p.person].join('/').toLowerCase()));
  const remaining=[...incomplete.values()].filter(p=>!resolved.has([p.company,p.person].join('/').toLowerCase()));
  // Give a sourced name waiting for a profile priority over another thin search result.
  const evidenceReady=remaining.filter(p=>p.source&&p.role);
  const other=remaining.filter(p=>!p.source||!p.role);
  job.pending=[...evidenceReady.slice(-60),...other.slice(-60)];
  for(const [key,value] of Object.entries(counts)){
    if(typeof value==='number'&&Number.isFinite(value))job.counts[key]=(job.counts[key]||0)+value;
    else if(typeof value==='boolean')job.counts[key]=Boolean(job.counts[key]||value);
  }
  if(job.candidates.length)job.counts.candidates=job.candidates.length;
  let summary=terminalReason;
  let outcome=status;
  if(!['failed','needs_input'].includes(status)){
    job.pages++;
    const gained=job.qualified-oldQualified;
    const unavailable=counts.profileLookupFailed||((counts.unavailable||0)>0&&counts.unavailable===counts.checked);
    job.blockedPages=!gained&&unavailable?job.blockedPages+1:0;
    if(gained)job.dryPages=0;
    else if(!unavailable&&newQueries.length)job.dryPages++;
    const progress=job.qualified+' of '+job.goal+' qualified contacts';
    if(job.qualified>=job.goal){outcome='goal_met';summary='Found '+progress+'.';question='';}
    else if(job.blockedPages>=3){outcome='failed';summary='Saved '+progress+'. Source or profile verification was unavailable in three successive batches. Retry to resume this run.';question='';}
    else if(facetsCovered&&!unavailable&&!gained&&
      (job.dryPages>=dryLimit||(!newQueries.length&&job.candidates.length===priorCandidateCount&&job.queries.length>=dryLimit))){
      outcome='exhausted';
      summary='Found '+progress+'. The public profile and industry searches covered the requested roles and returned no more qualified contacts.';
    }
    else {outcome='continuing';summary='Found '+progress+'. Continuing the search in the background.';question='';}
  }
  job.status=outcome;
  job.updatedAt=now();
  if(outcome==='continuing')b.researchRequestedAt=job.id;
  else if(b.researchRequestedAt===job.id)delete b.researchRequestedAt;
  return {status:outcome,summary,question,counts:{...job.counts}};
}

export function queueResearch(b,{resume=false}={}) {
  if(b.researchRequestedAt)return b.researchRequestedAt;
  const previous=b.researchJob;
  if(previous&&(resume||previous.status==='failed')){
    previous.status='running';previous.dryPages=0;previous.blockedPages=0;
    b.researchRequestedAt=previous.id;
    return previous.id;
  }
  return ensureResearchJob(b,now()).id;
}

// Each signature can start only the next numbered batch of one pre-authorized job.
function signature(payload){
  const secret=serviceKey();
  if(!secret)throw new Fault('Workspace authentication is unavailable.',503);
  return createHmac('sha256',secret).update('oparax-research-continuation-v1\n').update(payload).digest('base64url');
}
export function continuationRequest(botId,b) {
  if(!b.researchRequestedAt||b.researchJob?.status!=='continuing')return null;
  const payload=JSON.stringify({workspace:workspaceId(),agent:botId,requestedAt:b.researchRequestedAt,
    page:b.researchJob.pages,expires:Date.now()+90000});
  return {payload,signature:signature(payload)};
}
export function verifyContinuation(payload,authorization) {
  if(payload.length>900||!same(authorization,'Bearer '+signature(payload)))throw new Fault('Unauthorized.',401);
  let job;
  try {job=JSON.parse(payload);} catch {throw new Fault('Invalid job.',400);}
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  if(!uuid.test(job?.workspace)||!uuid.test(job.agent)||!Number.isSafeInteger(job.page)||job.page<1||
     !Number.isFinite(Date.parse(job.requestedAt))||!Number.isSafeInteger(job.expires)||job.expires<Date.now()||
     job.expires>Date.now()+120000)throw new Fault('This batch request has expired or is invalid.',409);
  return job;
}
export async function dispatchContinuation(request,transport={}) {
  // A new database-originated request breaks the platform's nested HTTP invocation chain.
  if(!request||process.env.VERCEL_ENV!=='production')return;
  const job=JSON.parse(request.payload);
  try{
    await (transport.rpc||rpc)('outreach_wake_research_page',{uid:job.workspace,agent_id:job.agent,requested_at:job.requestedAt,batch_index:job.page});
    // A null result means another worker already holds this page or has dispatched it.
    return;
  }catch{console.warn('Independent research dispatch unavailable; trying signed continuation');}
  try{
    const response=await (transport.fetch||fetch)('https://oparax.ai/api/tick',{method:'POST',redirect:'error',
      headers:{authorization:'Bearer '+request.signature,'content-type':'application/json'},
      body:request.payload,signal:AbortSignal.timeout(9000)});
    if(!response.ok&&response.status!==409)console.warn('Research continuation deferred to the scheduler',response.status);
  }catch {console.warn('Research continuation deferred to the scheduler');}
}


export async function redeemResearchWake(payload,authorization) {
  let job;
  try{job=JSON.parse(payload);}catch{throw new Fault('Unauthorized.',401);}
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const token=/^Job ([0-9a-f]{64})$/.exec(authorization||'')?.[1];
  if(!token||!uuid.test(job?.workspace)||!uuid.test(job?.agent)||!Number.isSafeInteger(job.page)||job.page<0||
     typeof job.requestedAt!=='string'||job.requestedAt.length>40)throw new Fault('Unauthorized.',401);
  const valid=await rpc('outreach_redeem_research_wake',{uid:job.workspace,agent_id:job.agent,requested_at:job.requestedAt,
    batch_index:job.page,token_hash:createHash('sha256').update(token).digest('hex')});
  if(valid!==true)throw new Fault('Unauthorized.',401);
  return job;
}

// A targeting correction fences the previous page while its VM is unwinding.
export function releaseReplacedWorker(b,workerId) {
  if(!b?.lease?.supersededWorker||b.lease.supersededWorker!==workerId)return null;
  b.lease=null;
  return b.researchRequestedAt?{requestedAt:b.researchRequestedAt,page:b.researchJob?.pages||0}:null;
}

export async function runResearchBatch(id,request) {
  const {research}=await import('./agent.mjs');
  const workerId=crypto.randomUUID();
  let skipped=false;
  try {await research(id,{...request,workerId});}
  catch(error){
    if(error instanceof Fault&&error.status===409)skipped=true;
    else {console.error('Research job deferred to the scheduler',error.name);throw error;}
  }
  const {data}=await read();
  const b=data.bots.find(agent=>agent.id===id);
  if(b?.lease?.supersededWorker===workerId) {
    const next=await edit(d=>releaseReplacedWorker(d.bots.find(agent=>agent.id===id),workerId));
    if(next) {
      try {await rpc('outreach_wake_research_page',{uid:workspaceId(),agent_id:id,requested_at:next.requestedAt,batch_index:next.page});}
      catch {console.warn('Revised target queued for the scheduler');}
    }
    return;
  }
  if(!skipped&&b)await dispatchContinuation(continuationRequest(id,b));
}
