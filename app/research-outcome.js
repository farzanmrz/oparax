export function researchCeiling(agent){
  const job=agent?.researchJob;
  const n=job?job.goal:agent?.taskGoal;
  return Number.isInteger(n)&&n>0?n:null;
}
export function verifiedCount(qualified,limit){return qualified+' verified '+(qualified===1?'person':'people')+(limit?' · up to '+limit:'');}
export function ResearchOutcome({agent}){
  const run=agent?.lastRun,job=agent?.researchJob,status=job?.status||run?.status;
  const reason=run?.receipt?.reason;
  const heading=({sources_exhausted:'Search coverage complete',diminishing_returns:'Search stopped yielding new matches',limit_reached:'Requested limit reached',source_error:'Source unavailable'})[reason]||
    ({exhausted:'Search coverage complete',goal_met:'Requested limit reached',paused_skill:'Research paused',needs_input:'Waiting for your answer'})[status];
  if(!heading||!['exhausted','goal_met','paused_skill','needs_input','failed'].includes(status))return null;
  const receipt=run?.receipt,summary=receipt?.summary||run?.summary;
  return <div className="research-outcome"><strong>{heading}</strong>{summary&&<p>{summary}</p>}
    {receipt&&<small>{[Number.isInteger(receipt.distinctQueries)?receipt.distinctQueries+' distinct searches':null,Number.isInteger(receipt.heldForEvidence)?receipt.heldForEvidence+' held for evidence':null].filter(Boolean).join(' · ')}</small>}</div>;
}
