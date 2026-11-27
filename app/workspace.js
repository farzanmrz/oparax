'use client';
import {useEffect,useRef,useState} from 'react';
import {loginCallback} from '../lib/login.mjs';
import {runSample} from './preview/sample.mjs';
import ResearchFeed from './research-feed';
import {linkedinProfileUrl} from '../lib/profile-url.mjs';
import {isPublishedProspect} from '../lib/qualification.mjs';
function researchingAgent(agent){
 if(!agent)return false;
 return !!(agent.researchRequestedAt||(agent.lease&&Date.parse(agent.lease.until)>Date.now())||['queued','running','continuing'].includes(agent.researchJob?.status));
}
function ResearchProgress({agent}){
 const job=agent.researchJob;
 if(!job)return null;
 const goal=job.goal||50,qualified=job.qualified??0,examined=job.counts?.candidates??0;
 const phase=job.status;
 const heading=phase==='goal_met'?'Research goal reached':phase==='exhausted'?'Search exhausted below goal':phase==='needs_input'?'Waiting for your answer':phase==='failed'?'Research interrupted':researchingAgent(agent)?'Research in progress':'Research progress';
 return <section className="runoutcome" aria-live="polite">
   <h3>{heading}</h3><p><strong>{qualified} of {goal} verified people</strong> · {examined} candidates examined</p>
   <progress aria-label={agent.name+' verified prospects'} value={qualified} max={goal}/>
   {phase==='continuing'&&<p>The next search batch is queued. You can leave this page while the agent continues.</p>}
   {phase==='exhausted'&&<p>The agent exhausted the credible sources it searched before reaching {goal} matches.</p>}
 </section>;
}
const returnHint='oparax.sales.prospectsUntil';
const agentHint='oparax.sales.returnAgent';
function webSource(value){
 try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}
}
function ProfileLink({lead}){
 const href=linkedinProfileUrl(lead.linkedinUrl);
 if(!href)return <small>LinkedIn profile unconfirmed</small>;
 const evidence=lead.linkedinEvidence;
 const evidenceText=typeof evidence==='string'?evidence:evidence?.quote||evidence?.evidence;
 const evidenceUrl=webSource(lead.linkedinSource||evidence?.source);
 return <div><a href={href} target="_blank" rel="noreferrer">Open LinkedIn profile ↗</a>{evidenceText&&<p>{evidenceText}</p>}{evidenceUrl&&evidenceUrl!==href&&<small> · <a href={evidenceUrl} target="_blank" rel="noreferrer">Profile evidence ↗</a></small>}</div>;
}
function CompanyProof({lead}){
 const verification=lead.companyVerification;
 const href=webSource(verification?.source);
 if(!verification?.name||!href||!verification.evidence)return <p><small>Company verification pending</small></p>;
 return <details><summary>Verified company · {verification.name}</summary><p>{verification.evidence}</p><a href={href} target="_blank" rel="noreferrer">Company evidence ↗</a></details>;
}
const nav=['Agents','Prospects','LinkedIn queue','Activity','Mailbox'];
const paths={Agents:'M4 5h16v12H4z M8 21h8 M12 17v4',Prospects:'M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2 M13 5a4 4 0 1 1 0 7 M21 20v-2a4 4 0 0 0-3-4 M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0', 'LinkedIn queue':'M4 5h16v12H9l-5 4z M8 9h8 M8 13h5',Activity:'M2 12h5l3-8 4 16 3-8h5',Mailbox:'M3 5h18v14H3z M3 6l9 7 9-7',plus:'M12 5v14 M5 12h14',arrow:'M5 12h14 M13 6l6 6-6 6',close:'M5 5l14 14 M5 19L19 5',shield:'M12 2l8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z M8 12l3 3 5-6'};
function Icon({n,size=18}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[n]}/></svg>}
const dt=s=>s?new Date(s).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Never';
function Brand(){return <span className="brand"><i aria-hidden="true" className="mark"/>Oparax</span>}
function Signal(){return <div className="signal" aria-hidden="true"><i/><i/><i/><b/><b/><b/><span>⌖</span></div>}
function Field({name,label,area=false,...opts}){return <label>{label}{area?<textarea name={name} {...opts}/>:<input name={name} {...opts}/>}</label>}
const agentFields=b=><><Field label="Agent name" name="name" required maxLength={65} defaultValue={b?.name} placeholder="UK footwear buyers"/><Field label="Campaign brief" name="brief" required area rows={4} defaultValue={b?.brief} placeholder="Who should this agent find? Describe the offer and buyers."/><div className="fields"><label>Research interval<select name="cadence" defaultValue={b?.cadence||24}>{[6,12,24,48,168].map(n=><option key={n} value={n}>{n} hours</option>)}</select></label><Field name="cap" label="Emails / day" type="number" min="1" max="100" defaultValue={b?.cap||5} required/><label>Follow-up after<select name="delay" defaultValue={b?.delay||5}>{[3,5,7,14].map(n=><option key={n} value={n}>{n} days</option>)}</select></label></div></>;
function Preview(){return <div className="preview"><div className="previewtop"><span>WORKSPACE PREVIEW</span><span className="dots">● ● ●</span></div><Signal/><div className="pvbody"><div className="over">RESEARCH AGENT</div><h2>Footwear sourcing</h2><p>Find UK footwear brands and identify their sourcing teams.</p><div className="pvrow"><Icon n="Prospects"/><span>Prospect research</span><i>01</i></div><div className="pvrow"><Icon n="LinkedIn queue"/><span>Personalized drafts</span><i>02</i></div><div className="pvrow"><Icon n="Activity"/><span>Reply tracking</span><i>03</i></div></div></div>}
export default function Workspace({url,anon,preview = null,initialPage = 'Agents',initialAgentId = null}){
 const [d,D]=useState(preview),[auth,A]=useState(null),[ready,R]=useState(false),[page,P]=useState(initialPage),[sel,S]=useState(preview?.bots[0]?.id??initialAgentId),[modal,M]=useState(''),[err,E]=useState(''),[msg,N]=useState(''),[busy,B]=useState(false),[sent,Y]=useState(false),[search,Q]=useState(''),[incoming,I]=useState(null);
 const [researching,setResearching]=useState(null),[agentFilter,setAgentFilter]=useState('');
 const activeSession=useRef(null),refreshing=useRef(null);
 function session(s){activeSession.current=s;A(s);if(s)sessionStorage.setItem('oparax.sales.session',JSON.stringify(s));else sessionStorage.removeItem('oparax.sales.session')}
 async function token(){
   const s=activeSession.current;if(!s)throw Error('Sign in first.');if(s.expires>Date.now()+45000)return s.access;
   if(refreshing.current?.session===s)return refreshing.current.request;
   const entry={session:s};refreshing.current=entry;
   entry.request=(async()=>{
     const res=await fetch(url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh})});
     if(activeSession.current!==s)throw Error('The sign-in session changed.');
     if(!res.ok){session(null);D(null);throw Error('Your session expired. Sign in again.')}
     const v=await res.json();if(activeSession.current!==s)throw Error('The sign-in session changed.');
     const next={access:v.access_token,refresh:v.refresh_token,expires:Date.now()+v.expires_in*1000};session(next);return next.access;
   })().finally(()=>{if(refreshing.current===entry)refreshing.current=null});
   return entry.request;
 }
 async function load(s,signal){if(!s)return;const t=await token();const r=await fetch('/api/desk',{headers:{Authorization:'Bearer '+t},cache:'no-store',signal});const v=await r.json();if(!r.ok)throw Error(v.error||'Workspace unavailable.');if(!signal?.aborted&&activeSession.current)D(v)}
 const started=useRef(false);
 useEffect(()=>{
   if(preview||started.current)return;
   started.current=true;
   (async()=>{
     try {
       const callback=loginCallback(location.search,location.hash);
       let current;
       if(callback.error||callback.session||callback.verification) {
         history.replaceState(null,'',location.pathname);
         if(callback.error)throw Error(callback.error);
         current=callback.session;
         if(callback.verification) {
           const result=await fetch(url+'/auth/v1/verify',{
             method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},
             body:JSON.stringify(callback.verification)
           });
           const v=await result.json();
           if(!result.ok||!v.access_token||!v.refresh_token)throw Error('This email link is invalid or has expired. Request a fresh link below.');
           current={access:v.access_token,refresh:v.refresh_token,expires:Date.now()+Number(v.expires_in||3600)*1000};
         }
         try{
           const until=Number(localStorage.getItem(returnHint));localStorage.removeItem(returnHint);
           const savedAgent=JSON.parse(localStorage.getItem(agentHint)||'null');localStorage.removeItem(agentHint);
           if(location.pathname==='/'&&savedAgent?.until>Date.now()&&typeof savedAgent.id==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(savedAgent.id)){
             P('Agents');S(savedAgent.id);history.replaceState(null,'','/research?agent='+savedAgent.id);
           }else if(location.pathname==='/'&&until>Date.now()){
             P('Prospects');history.replaceState(null,'','/prospects');
           }
         }catch{}
       } else {
         current=JSON.parse(sessionStorage.getItem('oparax.sales.session')||'null');
       }
       if(current){session(current);await load(current);}
     } catch(error){E(error.message);} finally {R(true);}
   })();
 },[preview,url,anon]);
 const pendingResearch=!!researching||d?.bots.some(researchingAgent);
 const pollingInterval=researching||d?.bots.some(agent=>agent.lease&&Date.parse(agent.lease.until)>Date.now())?2500:10000;
 useEffect(()=>{
   if(!pendingResearch||!auth||preview)return;
   let cancelled=false,timer;const controller=new AbortController();
   async function poll(){
     if(cancelled)return;
     try {await load(auth,controller.signal)} catch(error){if(!cancelled)E(error.message)}
     if(!cancelled)timer=setTimeout(poll,pollingInterval);
   }
   timer=setTimeout(poll,1500);
   return ()=>{cancelled=true;controller.abort();clearTimeout(timer)};
 },[pendingResearch,auth,preview,pollingInterval]);
 useEffect(()=>{
   if(!activeSession.current||!ready||preview||busy||pendingResearch)return;
   const controller=new AbortController();let loading=false;
   function refresh(){
     if(document.visibilityState!=='visible'||loading)return;
     loading=true;
     load(activeSession.current,controller.signal).catch(error=>{if(!controller.signal.aborted)E(error.message)}).finally(()=>{loading=false});
   }
   document.addEventListener('visibilitychange',refresh);window.addEventListener('pageshow',refresh);
   return ()=>{controller.abort();document.removeEventListener('visibilitychange',refresh);window.removeEventListener('pageshow',refresh)};
 },[!!auth,ready,preview,busy,pendingResearch]);
 async function act(action,p={},close=true){
   const running=action==='research'||action==='clarifyResearch';
   B(true);E('');N('');if(running)setResearching(p.id);
   try{
     if(preview){
       if(action==='research'){
         await new Promise(done=>setTimeout(done,350));
         D(current=>runSample(current,new Date().toISOString()));
       }else if(action==='activate'||action==='pause'){
         D(current=>({...current,bots:current.bots.map(agent=>agent.id===p.id?{...agent,active:action==='activate',autoEmail:false}:agent)}));
         N(action==='activate'?'Demo schedule enabled for this session.':'Demo schedule paused.');
       }else if(action==='draft'||action==='linked'){
         D(current=>({...current,leads:current.leads.map(lead=>lead.id===p.id?{...lead,...(action==='draft'?{linkedin:String(p.linkedin).trim()}:{linkedinState:'sent'})}:lead)}));
       }else{
         N('Sign in to use this feature with your own data.');return false;
       }
     }else{
       const t=await token(auth);
       const r=await fetch('/api/desk',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({action,...p})});
       const v=await r.json();
       if(!r.ok){
         if(running)await load(auth).catch(()=>{});
         throw Error(v.error||'The action could not finish.');
       }
       D(v);
       if(action==='manual')N('Saved for verification. A prospect appears here after their personal LinkedIn profile and employer are confirmed.');
     }
     if(close)M('');return true;
   }catch(e){E(e.message);return false}finally{B(false);if(running)setResearching(null)}
 }
 const requesting=useRef(false);
 async function login(e) {
   e.preventDefault();
   if(requesting.current)return;
   requesting.current=true;
   const email=String(new FormData(e.currentTarget).get('email')||'').trim();
   B(true);E('');Y(false);
   try {
     try {
       if(location.pathname==='/research'&&initialAgentId)localStorage.setItem(agentHint,JSON.stringify({id:initialAgentId,until:Date.now()+3600000}));
       else localStorage.removeItem(agentHint);
       if(location.pathname==='/prospects')localStorage.setItem(returnHint,String(Date.now()+3600000));
       else localStorage.removeItem(returnHint);
     }catch{}
     const response=await fetch('/api/signin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
     const result=await response.json();
     if(!response.ok)throw Error(result.error);
     Y(email);
   } catch(error){E(error.message);} finally{requesting.current=false;B(false);}
 }
 function logout(){if(auth)fetch(url+'/auth/v1/logout',{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+auth.access}}).catch(()=>{});session(null);D(null);Y(false);E('')}
 const notice=err?<p role="alert" className="error">{err}</p>:msg?<p role="status" className="notice">{msg}</p>:null;
 if(!d)return <main className="entry"><header><Brand/><span className="tiny">Sales workspace</span></header><section className="entrygrid"><div className="signin"><div className="over"><i className="blueDot"/>SALES OUTREACH</div><h1>{initialPage==='Prospects'?<>Your<br/>prospects</>:<>Your sales<br/>workspace</>}<span>.</span></h1><p>{initialPage==='Prospects'?'Sign in to see the people your agents found and review their sources.':'Give your agents a market to research. Review the buyers they find and manage every conversation in one place.'}</p><a className="demolink" href="/preview">Open interactive demo <Icon n="arrow"/></a><p>Sign up or sign in with any email address.</p><form onSubmit={login}><Field name="email" type="email" label="Email address" required placeholder="you@example.com" autoComplete="email"/><button className="primary wide" disabled={busy||!ready}>{busy?'Sending…':sent?'Send another sign-in link':'Email me a sign-in link'}<Icon n="arrow"/></button></form>{sent&&<p className="notice">Check {sent} for your sign-in link.</p>}{notice}{auth&&<button onClick={logout}>Clear session</button>}</div><Preview/></section></main>;
 const publishedLeads=preview?d.leads:d.leads.filter(isPublishedProspect);
 const b=d.bots.find(x=>x.id===sel),l=publishedLeads.find(x=>x.id===sel);
 function go(p){S(null);P(p);M('');E('');N('');Q('');setAgentFilter('')}
 function open(m){E('');N('');if(preview&&['connect','agentmail'].includes(m)){N('Sign in to connect your own mailbox.');return}M(m)}
 const filtered=publishedLeads.filter(x=>(!agentFilter||x.botId===agentFilter)&&[x.company,x.person,x.role,x.email,x.fit].join(' ').toLowerCase().includes(search.toLowerCase()));
 function showProspects(id){go('Prospects');setAgentFilter(id)}
 const inProgress=b&&(researching===b.id||researchingAgent(b));
 const goal=b?.researchJob?.goal||b?.lastRun?.goal||b?.researchGoal||50;
 const run=b?.lastRun, needsAnswer=run?.status==='needs_input';
 const historicResults=!preview&&!b?.researchJob&&['added','saved','already_saved','enriched'].includes(run?.status);
 const headings={continuing:'Searching for more verified people',goal_met:'Goal reached',exhausted:'Search exhausted below goal',needs_input:'Your input is needed',no_matches:'No verified matches',failed:'Research interrupted',error:'Research interrupted',duplicates:'Prospects already saved',saved:'Prospects saved',enriched:'Prospects updated',profiles:'Matching LinkedIn profiles',no_new:'No new prospects',already_saved:'Prospects already saved',added:'Prospects saved',unverified:'Sources could not confirm a match',planning:'Reading your brief',searching:'Searching public sources',verifying:'Checking the sources'};
 const leadCount=b?publishedLeads.filter(lead=>lead.botId===b.id).length:0;
 function handleForm(action,extra={}){return e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));act(action,{...f,...extra})}}
 async function copy(v){try{await navigator.clipboard.writeText(v);N('Draft copied.')}catch{E('Select the draft and copy it manually.')}}
 return <div className="app"><aside><Brand/><div className="over navtitle">WORKSPACE</div><nav>{nav.map(n=><button className={page===n?'selected':''} key={n} onClick={()=>go(n)}><Icon n={n}/>{n}{n==='LinkedIn queue'&&publishedLeads.filter(l=>l.linkedinState==='draft'&&!['stopped','replied'].includes(l.status)).length>0&&<small>{publishedLeads.filter(l=>l.linkedinState==='draft'&&!['stopped','replied'].includes(l.status)).length}</small>}</button>)}</nav><div className="account"><i>{preview?'S':d.userEmail?.[0]?.toUpperCase()}</i><div>{preview?'Sample workspace':d.userEmail}<small>{preview?'Public preview':'Workspace owner'}</small></div>{preview?<a href="/">Sign in</a>:<button onClick={logout} title="Sign out" aria-label="Sign out">↗</button>}</div></aside>
 <main className="desk"><header className="bar"><span>Oparax <em>/</em> {preview?'Interactive demo · Fictional data':'Sales workspace'}</span>{preview?<a href="/">Sign in</a>:<button disabled={busy} onClick={()=>load(auth).then(()=>N('Workspace refreshed.')).catch(e=>E(e.message))}>Refresh</button>}</header>
 <div className="work"><div className="pagehead"><div><div className="over">SALES WORKSPACE</div><h1>{page==='Agents'&&b?b.name:page}</h1></div>{page==='Agents'&&!b&&<button className="primary" onClick={()=>open('create')}><Icon n="plus"/>New agent</button>}{page==='Prospects'&&d.bots.length>0&&<button onClick={()=>open('manual')}>Add prospect</button>}</div>{!modal&&notice}
 {page==='Agents'&&!b&&<><div className="stats">{[['Agents',d.bots.length],['Prospects',publishedLeads.length],['Emails sent',publishedLeads.reduce((s,l)=>s+l.stage,0)],['Replies',publishedLeads.filter(l=>l.status==='replied').length]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</div><h2>Campaign agents</h2>{!d.bots.length?<div className="empty"><Signal/><h2>Create your first sales agent</h2><p>Choose a market and give the agent a brief to start researching buyers.</p><button className="primary" onClick={()=>open('create')}>Create agent <Icon n="arrow"/></button></div>:<div className="cards">{d.bots.map(x=><button className="card" key={x.id} onClick={()=>S(x.id)}><span className="cardtop"><Icon n="Agents" size={24}/><span className={'pill '+(x.active?'on':'')}>{x.active?'Scheduled':'On demand'}</span></span><h2>{x.name}</h2><p>{x.brief}</p><small>{publishedLeads.filter(l=>l.botId===x.id).length} prospects{x.active&&` · Every ${x.cadence}h`}</small></button>)}</div>}</>}
 {page==='Agents'&&b&&<><button className="backlink" onClick={()=>S(null)}>← All agents</button>
 <section className="panel researchpanel"><div className="row"><h2>Research brief</h2><span className={'pill '+(b.active?'on':'')}>{b.active?'Scheduled':'On demand'}</span></div><p className="brief">{b.brief}</p>
 {preview?<p className="demohint">Try the search with a fictional staff profile. Explore the buyer and outreach drafts it produces.</p>:<p>Research goal · {goal} people. Each published match must have a confirmed personal LinkedIn profile and evidence of the right employer.</p>}
 <div className="controls"><button className="primary" disabled={busy||!!inProgress||needsAnswer} onClick={()=>act('research',{id:b.id})}>{inProgress?(preview?'Reading sample profile…':'Researching…'):preview?'Run sample research':`Find ${goal} verified people`}</button>{!preview&&<button disabled={busy||!!inProgress} onClick={()=>open('save')}>Edit brief</button>}</div>
 {inProgress&&<p className="runprogress" role="status">{preview?'Reading the sample staff profile.':run?.status==='planning'?'Reading your brief.':run?.status==='verifying'?'Checking names, roles and employers against public sources.':run?.status==='profiles'?'Matching LinkedIn profiles by name and employer.':'Searching public sources for matches.'}</p>}
 {!inProgress&&run&&<div className="runoutcome" aria-live="polite"><h3>{historicResults?'Previous search':b.researchJob?'Run details':headings[run.status]||'Research result'}</h3>{run.model&&<small>Research model · {run.model.split('/').pop()}</small>}{typeof run.target==='string'&&run.target&&<small>Search target · {run.target}</small>}<p>{historicResults?`This earlier search has ${leadCount} currently published ${leadCount===1?'prospect':'prospects'} for this agent. New research checks each personal LinkedIn profile and employer before publication.`:run.summary}</p>{!historicResults&&run.counts&&<div className="runmetrics">{[['Candidates',run.counts.candidates],['Sources checked',run.counts.checked],['Sources unavailable',run.counts.unavailable],['Unverified',run.counts.unsupported],['Already saved',run.counts.duplicates],['New prospects',run.counts.added],['LinkedIn lookups',run.counts.profileChecks],['Profiles linked',run.counts.profilesMatched]].filter(([,value])=>Number.isInteger(value)).map(([label,value])=><small key={label}>{label} <strong>{value}</strong></small>)}</div>}
 {run.question&&<form key={run.question} onSubmit={handleForm('clarifyResearch',{id:b.id,question:run.question})}><Field name="answer" label={run.question} area rows={2} maxLength={2000} required/><button disabled={busy}>Answer and run research</button></form>}</div>}
 {!inProgress&&!run&&b.error&&<p className="error" role="alert">{b.error}</p>}
 {!!leadCount&&<button className="prospectlink" onClick={()=>showProspects(b.id)}>View {leadCount} {leadCount===1?'prospect':'prospects'} <Icon n="arrow"/></button>}
 </section>
 {!preview&&<ResearchFeed key={b.id} agent={b} active={!!inProgress} getToken={token}/>}
 <section className="panel schedulepanel"><div><h2>Research schedule</h2><p>{b.active?`Every ${b.cadence} hours · Automatic email ${b.autoEmail?'on':'off'}`:'Run once at any time, or schedule recurring searches.'}</p></div><button disabled={busy||!!inProgress} onClick={()=>b.active?act('pause',{id:b.id}):open('activate')}>{b.active?'Pause schedule':'Schedule research'}</button></section>
 <section className="panel"><div className="row"><h2>Agent inbox</h2><span className="pill">AgentMail</span></div><p>{b.inbox?.email || 'Give this agent its own address for incoming requests and replies.'}</p>{!d.agentMailConnected?<button onClick={()=>open('agentmail')}>Connect AgentMail</button>:!b.inbox?<button disabled={busy} onClick={()=>act('inboxCreate',{id:b.id})}>Create agent address</button>:<button disabled={busy} onClick={()=>act('inboxSync',{id:b.id})}>Check inbox</button>}{b.inbound?.map(m=><article className="message" key={m.id}><small>{m.from} · {dt(m.at)}</small><p><strong>{m.subject}</strong><br/>{m.preview}</p><button disabled={busy||!!b.replyState?.[m.id]} onClick={()=>{I(m);open('inboxReply')}}>{b.replyState?.[m.id]||'Reply'}</button></article>)}</section><section className="panel"><h2>Agent conversation</h2>{d.messages.filter(x=>x.botId===b.id).map(m=><div className="message" key={m.id}><small>{m.role==='user'?'YOU':b.name}</small><p>{m.content}</p></div>)}<form onSubmit={async e=>{e.preventDefault();const f=e.currentTarget;if(await act('chat',{id:b.id,message:new FormData(f).get('message')},false))f.reset()}}><Field label="Message your agent" area name="message" rows={2} required placeholder="Ask about positioning or discuss a buyer…"/><button disabled={busy} className="primary">Send message</button></form></section></>}
 {page==='Prospects'&&<>{!preview&&d.bots.filter(agent=>agent.researchJob&&(!agentFilter||agent.id===agentFilter)&&(researchingAgent(agent)||agentFilter||d.bots.length===1||!publishedLeads.length)).map(agent=><article className="panel" key={agent.id}><div className="row"><h2>{agent.name}</h2><button onClick={()=>{go('Agents');S(agent.id);requestAnimationFrame(()=>document.getElementById('research-activity')?.scrollIntoView({block:'start'}))}}>View research activity</button></div><ResearchProgress agent={agent}/></article>)}{agentFilter&&<div className="filterbar"><span>{d.bots.find(agent=>agent.id===agentFilter)?.name}</span><button onClick={()=>setAgentFilter('')}>Show all agents</button></div>}<input className="search" aria-label="Search prospects" placeholder="Search prospects…" value={search} onChange={e=>Q(e.target.value)}/>{filtered.length===0?<div className="panel"><h2>{search||agentFilter?'No matching prospects':preview?'Your prospect ledger is empty':'No verified prospects yet'}</h2><p>{preview?'Run sample research to see a buyer.':search?'Try a different name, role or company.':'Prospects appear here once the agent confirms their personal LinkedIn profile and employer.'}</p></div>:filtered.map(x=><article className="panel" key={x.id}><div className="row"><h2>{x.person||x.company}</h2><span className="pill">{preview?'Sample prospect':x.status}</span></div><small>{[x.role,x.person&&x.company,x.email||'No verified email'].filter(Boolean).join(' · ')}</small><p>{x.fit}</p>{(x.evidence||x.quote)&&<blockquote>{x.evidence||x.quote}{preview&&<cite>Fictional staff profile · Wrenfield Footwear</cite>}</blockquote>}{webSource(x.source)&&<a href={webSource(x.source)} target="_blank" rel="noreferrer">View source ↗</a>}{x.sourceDate&&<small> · Source dated <time dateTime={x.sourceDate}>{x.sourceDate}</time></small>}{!preview&&<><CompanyProof lead={x}/><ProfileLink lead={x}/></>}{!preview&&<div className="controls"><button disabled={busy} onClick={()=>act('visual',{id:x.id})}>{busy?'Working…':'Inspect source with Sonnet'}</button></div>}{x.visual&&<p>{x.visual}</p>}<details><summary>Email draft</summary><strong>{x.subject}</strong><p>{x.body}</p></details>{!preview&&!['replied','stopped'].includes(x.status)&&<button disabled={busy} onClick={()=>act('suppress',{id:x.id})}>Stop outreach</button>}</article>)}</>}
 {page==='LinkedIn queue'&&<><section className="panel"><h2>LinkedIn sign-in</h2><p>Open LinkedIn in the browser where you use 1Password. Choose your saved LinkedIn login and complete any verification there. Copy a note below when you are ready to send.</p><a href="https://www.linkedin.com/login" target="_blank" rel="noreferrer">Open LinkedIn sign-in ↗</a></section>{!publishedLeads.length&&<div className="panel"><h2>No LinkedIn drafts yet</h2><p>Your agents prepare a note for each verified prospect.</p></div>}{publishedLeads.filter(x=>!['stopped','replied'].includes(x.status)).map(x=><article className="panel" key={x.id}><div className="row"><h2>{x.company}</h2><span className="pill">{x.linkedinState}</span></div><small>{x.person||'Company contact'}</small>{!preview&&<ProfileLink lead={x}/>}<p>{x.linkedin}</p>{x.linkedinState==='draft'&&<div className="controls"><button onClick={()=>copy(x.linkedin)}>Copy note</button><button onClick={()=>{S(x.id);open('draft')}}>Edit</button><a href="https://www.linkedin.com/sales/home" target="_blank" rel="noreferrer">Open Sales Navigator ↗</a><button disabled={busy} onClick={()=>act('linked',{id:x.id})}>Mark sent</button></div>}</article>)}</>}
 {page==='Activity'&&<section className="panel"><h2>Workspace history</h2>{d.events.length?d.events.map(x=><div className="log" key={x.id}><time>{dt(x.at)}</time><span>{x.text}</span></div>):<p>Agent runs, prospect changes, and outreach activity appear here.</p>}</section>}
 {page==='Mailbox'&&<section className="panel"><div className="row"><h2>AgentMail</h2><span className="pill">{d.agentMailConnected?'Connected':'Disconnected'}</span></div><p>Each agent can have its own address for inbound requests and replies. Create its address from the agent page.</p><button onClick={()=>open('agentmail')}>{d.agentMailConnected?'Update API key':'Connect AgentMail'}</button></section>}{page==='Mailbox'&&<section className="panel"><div className="row"><h2>Outbound email</h2><span className={'pill '+(d.mailbox?'on':'')}>{d.mailbox?'Connected':'Disconnected'}</span></div><p>{d.mailbox?d.mailbox.email:'Connect a mailbox to send campaign emails and detect replies.'}</p>{d.mailbox?<button disabled={busy} onClick={()=>act('disconnect')}>Disconnect mailbox</button>:<button className="primary" onClick={()=>open('connect')}>Connect mailbox</button>}</section>}
 </div></main>
 {modal&&<div className="overlay" onKeyDown={e=>{if(e.key==='Escape'&&!busy)M('')}}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialogtitle"><div className="row"><h2 id="dialogtitle">{{create:'New sales agent',save:'Edit agent',activate:'Schedule research',connect:'Connect mailbox',draft:'Edit LinkedIn note',manual:'Add prospect',agentmail:'Connect AgentMail',inboxReply:'Reply from agent inbox'}[modal]}</h2><button aria-label="Close" disabled={busy} onClick={()=>M('')}><Icon n="close"/></button></div>{notice}
 {['create','save'].includes(modal)&&<form onSubmit={handleForm(modal,modal==='save'?{id:b.id}:{})}>{agentFields(modal==='save'?b:null)}<button disabled={busy} className="primary">{modal==='save'?'Save changes':'Create agent'}</button></form>}
 {modal==='activate'&&<form onSubmit={e=>{e.preventDefault();act('activate',{id:b.id,autoEmail:new FormData(e.target).has('auto')})}}><p>{preview?'This demo lets you try the schedule controls locally.':'The scheduler checks every 10 minutes. The first search becomes due when you enable the schedule.'} Research repeats every {b.cadence} hours.</p><p>Automatic email is off by default. Enabling it allows up to {b.cap} emails per day, including one follow-up after {b.delay} days.</p><label className="check"><input name="auto" type="checkbox" disabled={!d.mailbox}/>Enable automatic sending {d.mailbox?'from '+d.mailbox.email:'(connect a mailbox first)'}</label><button disabled={busy} className="primary">{preview?'Try demo schedule':'Start schedule'}</button></form>}
 {modal==='agentmail'&&<form onSubmit={handleForm('agentmail')}><Field name="key" label="AgentMail API key" type="password" required autoComplete="new-password"/><a href="https://console.agentmail.to/" target="_blank" rel="noreferrer">Open AgentMail console ↗</a><p>Your key is encrypted. Each agent gets a separate inbox when you provision it.</p><button disabled={busy} className="primary">Connect</button></form>}{modal==='inboxReply'&&incoming&&b&&<form onSubmit={handleForm('inboxReply',{id:b.id,messageId:incoming.id})}><p>{incoming.from} · {incoming.subject}</p><Field name="reply" label="Your reply" area rows={5} required/><button className="primary" disabled={busy}>Send reply</button></form>}{modal==='connect'&&<form onSubmit={handleForm('connect')}><label>Provider<select name="provider"><option value="gmail">Gmail / Google Workspace</option><option value="yahoo">Yahoo Mail</option><option value="icloud">iCloud Mail</option></select></label><Field label="Mailbox address" name="email" type="email" required/><Field name="password" type="password" label="Provider app password" autoComplete="new-password" required/><Field name="address" label="Business mailing address for email footers" required/><p>Connection checks sending access and inbox access for reply detection.</p><button className="primary" disabled={busy}>Verify and connect</button></form>}
 {modal==='draft'&&l&&<form onSubmit={handleForm('draft',{id:l.id})}><Field name="linkedin" label="Note" area rows={5} defaultValue={l.linkedin} required/><button className="primary" disabled={busy}>Save note</button></form>}
 {modal==='manual'&&<form onSubmit={handleForm('manual')}><p>Submit a person for verification. They appear in Prospects once their profile and employer are confirmed.</p><label>Agent<select name="id">{d.bots.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>{[['company','Company'],['person','Contact name'],['email','Verified email (optional)'],['source','Public source URL'],['linkedinUrl','LinkedIn profile URL (optional)'],['fit','Reason for fit'],['subject','Email subject'],['body','Email draft'],['linkedin','LinkedIn note']].map(([n,label])=><Field key={n} label={label} name={n} area={['body','linkedin'].includes(n)} type={n==='email'?'email':['source','linkedinUrl'].includes(n)?'url':'text'} required={!['email','linkedinUrl'].includes(n)}/>)}<button className="primary" disabled={busy}>Add prospect</button></form>}
 </section></div>}</div>
}
