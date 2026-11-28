import {createHash,createHmac} from 'node:crypto';
import {Fault,edit,now,read,rpc,same,serviceKey,workspaceId} from './store.mjs';

const union=(before=[],after=[])=>[...new Set([...before,...after])];
const normalized=list=>list.filter(value=>typeof value==='string').map(value=>value.trim().toLowerCase().replace(/\s+/g,' ')).filter(Boolean);
export function retryableEvidence(p,anchor) {
  if((p.attempts||0)>=3||!p.profileHit&&!p.quote||!p.source&&!anchor)return false;
  return /unavailable|temporar|index outage|confidently matched LinkedIn/i.test(p.reason||'')||
    Boolean(anchor&&p.profileHit&&/independent employer source|could not be corroborated/i.test(p.reason||''));
}

export function ensureResearchJob(b,requestId) {
  if(b.researchJob?.id!==requestId){
    b.researchJob={id:requestId,goal:null,qualified:0,qualifiedIds:[],seen:[],pending:[],queries:[],candidates:[],
      pages:0,dryPages:0,blockedPages:0,status:'running',counts:{}};
  }
  b.researchRequestedAt=requestId;
  return b.researchJob;
}

export function advanceResearchJob(b,{page,counts={},qualifiedIds=[],seen=[],pending=[],queries=[],candidates=[],facetsCovered=false,coverage={},aliases={},status,terminalReason='',stopReason='',question=''}) {
  const job=b.researchJob;
  if(!job||job.pages!==page)throw new Fault('This research batch was already processed.',409);
  const oldQualified=job.qualified;
  const priorQueries=new Set(job.queries||[]);
  const newQueries=normalized(queries).filter(query=>!priorQueries.has(query));
  const attemptedQueries=[...new Set([...priorQueries,...newQueries])];
  if(status!=='failed')job.queries=attemptedQueries;
  const priorCandidateCount=job.candidates?.length||0;
  job.candidates=union(normalized((job.candidates||[]).map(key=>aliases[key]||key)),normalized(candidates));
  const coverageState=job.coverage||={scopes:{},sourceFamilies:[],productiveBatches:0,successfulBatches:0};
  job.qualifiedIds=[...new Set([...job.qualifiedIds,...qualifiedIds.filter(Boolean)])];
  job.qualified=job.qualifiedIds.length;
  job.seen=[...new Set([...job.seen,...seen.filter(Boolean)])];
  const pendingKey=p=>String(p.linkedinUrl||[p.company,p.person].join('/')).toLowerCase();
  const incomplete=new Map([...(job.pending||[]),...pending].filter(p=>p&&typeof p==='object'&&p.reason&&p.person).map(p=>[pendingKey(p),p]));
  const resolved=new Set(pending.filter(p=>p?.resolved).map(p=>[p.company,p.person].join('/').toLowerCase()));
  // Discovery and verification pace each batch independently. Preserve the
  // remaining identities so a large index page cannot evict unexamined people.
  job.pending=[...incomplete.values()].filter(p=>!resolved.has([p.company,p.person].join('/').toLowerCase()));
  for(const [key,value] of Object.entries(counts)){
    if(typeof value==='number'&&Number.isFinite(value))job.counts[key]=(job.counts[key]||0)+value;
    else if(typeof value==='boolean')job.counts[key]=Boolean(job.counts[key]||value);
  }
  job.counts.candidates=job.candidates.length;
  const gained=job.qualified-oldQualified;
  const unavailable=coverage.interrupted||counts.profileLookupFailed||((counts.unavailable||0)>0&&counts.unavailable===counts.checked);
  const scope=coverage.scope||job.plan?.target||b.brief||'the requested audience';
  const scopeKey=coverage.scopeKey||'market';
  const scopes=coverage.scopes?.length?coverage.scopes:['market'];
  const scopeState=coverageState.scopes['scope:'+scopeKey]||={dryFacets:[],baseline:false};
  const facetKeys=normalized(coverage.facets||newQueries);
  const fresh=facetKeys.filter(k=>!(scopeState.facets||[]).includes(k));
  const attemptedFamilies=union(coverageState.sourceFamilies,coverage.families||[]);
  const hadBaseline=scopeState.baseline;
  if(status!=='failed'){
    scopeState.facets=union(scopeState.facets,fresh);
    coverageState.sourceFamilies=attemptedFamilies;
    if(coverage.baseline)scopeState.baseline=true;
  }
  if(gained)coverageState.productiveBatches++;
  let summary=terminalReason,outcome=status;
  if(status==='failed'){
    stopReason=stopReason==='model_budget'?'model_budget':'source_error';
    if(stopReason==='model_budget'&&job.qualified)summary+=' Your '+job.qualified+' verified '+(job.qualified===1?'contact remains':'contacts remain')+' in the research results.';
  }
  if(!['failed','needs_input'].includes(status)){
    job.pages++;
    const newEvidence=gained>0||job.candidates.length>priorCandidateCount;
    if(fresh.length)coverageState.successfulBatches++;
    if(unavailable){
      scopeState.blocked=(scopeState.blocked||0)+1;
      scopeState.gap=true;
    }else{
      scopeState.blocked=0;scopeState.gap=false;
    }
    job.blockedPages=scopeState.blocked;
    // New names alone cannot justify unlimited pages if none can even enter
    // final verification. Count consecutive stalled rounds separately per employer.
    scopeState.uncheckedRounds=coverage.uncheckedCandidates?(scopeState.uncheckedRounds||0)+1:0;
    if(newEvidence){scopeState.dryFacets=[];job.dryPages=0;}
    else if(!unavailable&&fresh.length){
      // Multiple queries in one batch often return the same underlying index.
      // Count independent rounds once each and never count a replayed query.
      if(hadBaseline)scopeState.dryFacets.push(fresh[0]);
      job.dryPages++;
    }
    const healthy=scopes.every(key=>!coverageState.scopes['scope:'+key]?.gap);
    const saturated=scopes.every(key=>{
      const state=coverageState.scopes['scope:'+key];
      return state?.baseline&&state.dryFacets.length>=2;
    });
    const ready=job.pending.some(p=>(p.attempts||0)<3&&p.profileHit&&p.reason==='Additional named role lookup pending'||
      retryableEvidence(p,job.companyProofs?.[p.company]?.source));
    const progress=job.qualified+' verified '+(job.qualified===1?'contact':'contacts');
    if(Number.isSafeInteger(job.goal)&&job.goal>0&&job.qualified>=job.goal){
      outcome='goal_met';stopReason='limit_reached';summary='Found '+progress+', reaching your requested maximum of '+job.goal+'.';question='';
    }else if(scopeState.blocked>=3){
      outcome='failed';stopReason='source_error';summary='Found '+progress+'. A required search or verification source remained unavailable. Retry to resume from this checkpoint.';question='';
    }else if(scopeState.uncheckedRounds>=3&&scopes.every(key=>{const state=coverageState.scopes['scope:'+key];return state?.uncheckedRounds>=3||state?.baseline&&state.dryFacets.length>=2;})){
      outcome='failed';stopReason='verification_stalled';question='';
      summary='Found '+progress+'. Repeated searches surfaced candidates without enough role and employer evidence to start final verification. This run stopped here. You can retry this search.';
    }else if(!unavailable&&healthy&&!ready&&(facetsCovered||saturated)){
      outcome='exhausted';stopReason=facetsCovered?'sources_exhausted':'diminishing_returns';
      summary='Found '+progress+'. '+(facetsCovered?'All planned public search routes for this audience have been checked.':'Distinct follow-up searches across the requested audience stopped returning new candidates or verified contacts.');
      if(job.pending.length)summary+=' '+job.pending.length+' candidate records lacked sufficient evidence.';
    }else{
      outcome='continuing';summary='Found '+progress+'. Continuing the search in the background.';question='';
    }
  }
  const receipt=stopReason?{reason:stopReason,uniqueCandidates:job.candidates.length,uniqueQualified:job.qualified,
    ceiling:Number.isSafeInteger(job.goal)?job.goal:null,productiveBatches:coverageState.productiveBatches,
    successfulBatches:coverageState.successfulBatches,sourceFamilies:attemptedFamilies,
    distinctQueries:attemptedQueries.length,heldForEvidence:job.pending.length,scope,summary}:null;
  if(receipt)job.receipt=receipt;else delete job.receipt;
  job.status=outcome;
  job.updatedAt=now();
  if(outcome==='continuing')b.researchRequestedAt=job.id;
  else if(b.researchRequestedAt===job.id)delete b.researchRequestedAt;
  return {status:outcome,summary,question,counts:{...job.counts},...(receipt?{receipt}:{})};
}

export function queueResearch(b,{resume=false}={}) {
  if(b.researchRequestedAt)return b.researchRequestedAt;
  const previous=b.researchJob;
  const signature=JSON.stringify([b.brief,(b.clarifications||[]).slice(-16)]);
  const revised=previous?.planSignature&&previous.planSignature!==signature;
  if(previous&&!revised&&(resume||previous.status==='failed')){
    previous.status='running';previous.dryPages=0;previous.blockedPages=0;
    for(const scope of Object.values(previous.coverage?.scopes||{})){scope.blocked=0;scope.uncheckedRounds=0;}
    b.researchRequestedAt=previous.id;
    return previous.id;
  }
  const next=new Date(Math.max(Date.now(),(Date.parse(previous?.id)||0)+1)).toISOString();
  return ensureResearchJob(b,next).id;
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
