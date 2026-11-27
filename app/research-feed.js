'use client';
import {useEffect,useRef,useState} from 'react';
import {readResearchStream} from './research-events.mjs';

const activityKinds={
  started:'Job started',target:'Search scope',query:'Search',source:'Source',verification:'Evidence check',
  saved:'Published',held:'Verification pending',progress:'Progress',error:'Service issue'
};
const stateLabels={
  queued:'Queued',planning:'Reading the brief',searching:'Searching',verifying:'Checking sources',
  profiles:'Checking profiles',running:'In progress',continuing:'Next batch queued',
  goal_met:'Goal reached',exhausted:'Search exhausted below goal',needs_input:'Waiting for your answer',
  failed:'Research interrupted'
};
function domainOf(value){
  if(typeof value!=='string'||!value)return '';
  try{const u=new URL(value.includes('://')?value:'https://'+value);
    return u.protocol==='https:'&&!u.username&&!u.password?u.hostname:'';}catch{return '';}
}
function eventTime(at){
  const time=new Date(at);
  return Number.isNaN(time.getTime())?'':time.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

export default function ResearchFeed({agent,active,getToken}){
  const job=agent.researchJob,jobId=job?.id||null;
  const tokenFactory=useRef(getToken);
  const [snapshot,setSnapshot]=useState(null),[connection,setConnection]=useState('idle');
  useEffect(()=>{tokenFactory.current=getToken},[getToken]);
  useEffect(()=>{
    if(!active){setConnection('idle');return;}
    const controller=new AbortController();
    let timer,failures=0;
    async function connect(){
      setConnection(failures?'reconnecting':'connecting');
      try{
        const token=await tokenFactory.current();
        if(controller.signal.aborted)return;
        const response=await fetch('/api/research-stream?id='+encodeURIComponent(agent.id),{
          headers:{Accept:'text/event-stream',Authorization:'Bearer '+token},
          cache:'no-store',signal:controller.signal
        });
        if(response.status===401||response.status===403||response.status===404){
          setConnection('unavailable');return;
        }
        if(!response.ok||!response.body||!response.headers.get('Content-Type')?.includes('text/event-stream')){
          throw Error('Research activity stream unavailable.');
        }
        const finished=await readResearchStream(response.body,value=>{
          if(controller.signal.aborted)return;
          failures=0;setSnapshot(value);setConnection(value.finished?'idle':'live');
        });
        if(finished||controller.signal.aborted)return;
      }catch{if(controller.signal.aborted)return;}
      failures++;setConnection('reconnecting');
      timer=setTimeout(connect,Math.min(15000,1000*2**Math.min(4,failures-1)));
    }
    connect();
    return ()=>{controller.abort();clearTimeout(timer)};
  },[agent.id,jobId,active]);

  const current=snapshot?.jobId&&(!jobId||snapshot.jobId===jobId)?snapshot:null;
  const stored=jobId&&agent.researchActivityJob===jobId&&Array.isArray(agent.researchActivity)?agent.researchActivity:[];
  const events=new Map();
  for(const entry of [...stored,...(current?.events||[])]){
    if(entry?.id&&Object.hasOwn(activityKinds,entry.kind)&&typeof entry.text==='string')events.set(entry.id,entry);
  }
  const rows=[...events.values()].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const status=active?(current?.status||agent.lastRun?.status||job?.status):(job?.status||current?.status);
  const qualified=Math.max(job?.qualified||0,current?.qualified||0);
  const examined=Math.max(job?.counts?.candidates||0,current?.examined||0);
  const goal=job?.goal||current?.goal||agent.researchGoal||50;
  const connectionLabels={live:'Live',connecting:'Connecting…',reconnecting:'Reconnecting…',unavailable:'Showing saved activity'};
  return <section id="research-activity" className="panel researchfeed" aria-labelledby="research-activity-title">
    <div className="row"><h2 id="research-activity-title">Research activity</h2>
      {active&&connectionLabels[connection]&&<span role="status" className={'pill '+(connection==='live'?'on':'')}>{connectionLabels[connection]}</span>}
    </div>
    {(job||current)&&<div className="feedsummary">
      <strong>{qualified} of {goal} verified people</strong><small>{examined} candidates examined{status&&stateLabels[status]?' · '+stateLabels[status]:''}</small>
      <progress value={qualified} max={goal} aria-label="Verified people found"/>
    </div>}
    {status==='continuing'&&<p>The next batch is queued. Research continues when you leave this page.</p>}
    {rows.length?<ol className="feedrows" aria-label="Research actions, newest first">{rows.map(entry=><li key={entry.id}>
      <div className="feedstamp"><time dateTime={entry.at}>{eventTime(entry.at)}</time>{activityKinds[entry.kind]&&<small>{activityKinds[entry.kind]}</small>}</div>
      <p>{entry.text}</p>{domainOf(entry.source)&&<small>{domainOf(entry.source)}</small>}
    </li>)}</ol>:<p>{active?'Waiting for the first recorded action…':'Search terms, source checks and verification decisions will appear here when the agent runs.'}</p>}
  </section>;
}
