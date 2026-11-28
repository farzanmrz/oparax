'use client';
import {useEffect,useRef,useState} from 'react';
import {loginCallback} from '../lib/login.mjs';
import {runSample,sampleMessage} from './preview/sample.mjs';
import AgentThread,{agentState,providerBusy,Provenance} from './agent-thread';
import SendDraft from './send-draft';
import BotModel from './bot-model';
import {EveBotBridge,prepareEveSession} from './eve-chat';
import {retryTurnPayload} from './eve-result.mjs';
import BusinessMemory from './business-memory';
import SkillsConnections from './skills-connections';
import {ResearchOutcome,researchCeiling,verifiedCount} from './research-outcome';
import './workspace-settings.css';
import AgentTools from './agent-tools';
import AgentEntry,{getPendingBrief,clearPendingBrief} from './agent-entry';
import {linkedinProfileUrl} from '../lib/profile-url.mjs';
import {belongsToCampaign,isPublishedProspect} from '../lib/qualification.mjs';
function researchingAgent(agent){
 if(!agent)return false;
 return !!(providerBusy(agent)||agent.researchRequestedAt||(agent.lease&&Date.parse(agent.lease.until)>Date.now())||['queued','running','continuing'].includes(agent.researchJob?.status));
}
function ResearchProgress({agent}){
 const job=agent.researchJob;
 if(!job)return null;
 const goal=researchCeiling(agent),qualified=agent.taskQualified??job.qualified??0,examined=job.counts?.candidates??0;
 const phase=job.status;
 const heading=phase==='goal_met'?'Research complete':phase==='exhausted'?'Research complete':phase==='needs_input'?'Waiting for your answer':phase==='failed'?'Research interrupted':researchingAgent(agent)?'Research in progress':'Research progress';
 return <section className="runoutcome" aria-live="polite">
   <h3>{heading}</h3><p><strong>{verifiedCount(qualified,goal)}</strong> · {examined} candidates surfaced · {job.counts?.checked||0} source checks</p>
   {goal&&<progress aria-label={agent.name+' verified prospects'} value={qualified} max={goal}/>}
   {phase==='continuing'&&<p>The next search batch is queued. You can leave this page while the agent continues.</p>}
   <ResearchOutcome agent={agent}/>
 </section>;
}
const returnHint='oparax.sales.prospectsUntil';
const agentHint='oparax.sales.returnAgent';
const settingsHint='oparax.sales.returnSettings';
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
const nav=['Agents','Prospects','LinkedIn queue','Activity','Mailbox','Business memory','Skills & connections'];
const paths={'Business memory':'M3 5h7l2 2 2-2h7v14h-7l-2 2-2-2H3z M12 7v14','Skills & connections':'M3 6h10 M17 6h4 M3 18h4 M11 18h10 M13 3v6 M7 15v6',Agents:'M4 5h16v12H4z M8 21h8 M12 17v4',Prospects:'M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2 M13 5a4 4 0 1 1 0 7 M21 20v-2a4 4 0 0 0-3-4 M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0', 'LinkedIn queue':'M4 5h16v12H9l-5 4z M8 9h8 M8 13h5',Activity:'M2 12h5l3-8 4 16 3-8h5',Mailbox:'M3 5h18v14H3z M3 6l9 7 9-7',plus:'M12 5v14 M5 12h14',arrow:'M5 12h14 M13 6l6 6-6 6',close:'M5 5l14 14 M5 19L19 5',shield:'M12 2l8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z M8 12l3 3 5-6'};
function Icon({n,size=18}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[n]}/></svg>}
const dt=s=>s?new Date(s).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Never';
function Brand(){return <span className="brand"><i aria-hidden="true" className="mark"/>Oparax</span>}
function Field({name,label,area=false,...opts}){return <label>{label}{area?<textarea name={name} {...opts}/>:<input name={name} {...opts}/>}</label>}
const agentFields=b=><><Field label="Bot name" name="name" required maxLength={65} defaultValue={b?.name} placeholder="UK footwear buyers"/><Field label="Campaign brief" name="brief" required area rows={4} defaultValue={b?.brief} placeholder="Who should this agent find? Describe the offer and buyers."/><div className="fields"><label>Research interval<select name="cadence" defaultValue={b?.cadence||24}>{[6,12,24,48,168].map(n=><option key={n} value={n}>{n} hours</option>)}</select></label><Field name="cap" label="Emails / day" type="number" min="1" max="100" defaultValue={b?.cap||5} required/><label>Follow-up after<select name="delay" defaultValue={b?.delay||5}>{[3,5,7,14].map(n=><option key={n} value={n}>{n} days</option>)}</select></label></div></>;
const newThread='new-thread';
const secondaryViews={drafts:'LinkedIn queue',activity:'Activity',mailbox:'Mailbox',memory:'Business memory',skills:'Skills & connections'};
const viewLinks={Prospects:'/prospects','LinkedIn queue':'/?view=drafts',Activity:'/?view=activity',Mailbox:'/?view=mailbox','Business memory':'/?view=memory','Skills & connections':'/?view=skills'};
function currentRoute(){
  const params=new URLSearchParams(location.search);
  if(location.pathname==='/prospects')return {page:'Prospects',id:null};
  if(location.pathname==='/research')return {page:'Agents',id:params.get('agent')};
  return {page:secondaryViews[params.get('view')]||'Agents',id:params.get('new')==='1'?newThread:null,skillId:params.get('view')==='skills'?params.get('agent'):null};
}
export default function Workspace({url,anon,preview = null,initialPage = 'Agents',initialAgentId = null}){
 const [d,D]=useState(preview),[auth,A]=useState(null),[ready,R]=useState(false),[page,P]=useState(initialPage),[sel,S]=useState(preview?.bots[0]?.id??initialAgentId),[modal,M]=useState(''),[err,E]=useState(''),[msg,N]=useState(''),[busy,B]=useState(false),[sent,Y]=useState(false),[search,Q]=useState(''),[incoming,I]=useState(null);
 const [researching,setResearching]=useState(null),[agentFilter,setAgentFilter]=useState('');
 const [draftId,setDraftId]=useState(null),[draftType,setDraftType]=useState('LinkedIn'),[activityFor,setActivityFor]=useState(initialAgentId),
   [managedRequest,setManagedRequest]=useState(null),[initialDraft,setInitialDraft]=useState(''),[mobileRoster,setMobileRoster]=useState(false);
 const [eveCommand,setEveCommand]=useState(null),[eveSnapshot,setEveSnapshot]=useState(null),[deliveryFailure,setDeliveryFailure]=useState(null);
 const activeTurnRequest=useRef(null),loadGeneration=useRef(0),appliedLoad=useRef(0);
 const [skillId,setSkillId]=useState(null),[teaching,setTeaching]=useState(null);
 const activeSession=useRef(null),refreshing=useRef(null),pendingOwner=useRef(null),viewRef=useRef({page,sel});
 viewRef.current={page,sel};
 useEffect(()=>{
   if(preview)return;
   const apply=()=>{const route=currentRoute();P(route.page);S(route.id);setSkillId(route.skillId||null);M('');setActivityFor(route.id&&route.id!==newThread?route.id:null);setMobileRoster(false)};
   if(location.search.includes('view=')||location.search.includes('new='))apply();
   window.addEventListener('popstate',apply);return()=>window.removeEventListener('popstate',apply);
 },[preview]);
 useEffect(()=>{
   if(preview||!d?.userEmail||pendingOwner.current===d.userEmail)return;
   pendingOwner.current=d.userEmail;
   if(location.pathname!=='/'||new URLSearchParams(location.search).has('view')||initialAgentId)return;
   const brief=getPendingBrief(d.userEmail);
   if(typeof brief==='string'&&brief){setInitialDraft(brief);S(newThread);P('Agents')}
 },[preview,d?.userEmail,initialAgentId]);
 function session(s){activeSession.current=s;A(s);if(s)sessionStorage.setItem('oparax.sales.session',JSON.stringify(s));else{
   appliedLoad.current=++loadGeneration.current;setDeliveryFailure(null);
   sessionStorage.removeItem('oparax.sales.session');pendingOwner.current=null;setEveSnapshot(null);setEveCommand(null);activeTurnRequest.current?.reject?.(new Error('The sign-in session changed.'));activeTurnRequest.current=null;setTeaching(null);setInitialDraft('');S(initialAgentId);P(initialPage);
 }}
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
 async function load(s,signal){if(!s)return;const generation=++loadGeneration.current,t=await token();const r=await fetch('/api/desk',{headers:{Authorization:'Bearer '+t},cache:'no-store',signal});const v=await r.json();if(!r.ok)throw Error(v.error||'Workspace unavailable.');if(!signal?.aborted&&activeSession.current&&generation>appliedLoad.current){appliedLoad.current=generation;D(v)}return v}
 const started=useRef(false);
 useEffect(()=>{
   if(preview||started.current)return;
   started.current=true;
   (async()=>{
     try {
       const callback=loginCallback(location.search,location.hash);
       let current;
       if(callback.error||callback.session||callback.verification) {
         history.replaceState(null,'',location.pathname+(location.pathname==='/research'&&initialAgentId?'?agent='+encodeURIComponent(initialAgentId):''));
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
           const savedSettings=JSON.parse(localStorage.getItem(settingsHint)||'null');localStorage.removeItem(settingsHint);
           const until=Number(localStorage.getItem(returnHint));localStorage.removeItem(returnHint);
           const savedAgent=JSON.parse(localStorage.getItem(agentHint)||'null');localStorage.removeItem(agentHint);
           if(location.pathname==='/'&&savedAgent?.until>Date.now()&&savedAgent.id===newThread){
             P('Agents');S(newThread);history.replaceState(null,'','/?new=1');
           }else if(location.pathname==='/'&&savedAgent?.until>Date.now()&&typeof savedAgent.id==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(savedAgent.id)){
             P('Agents');S(savedAgent.id);history.replaceState(null,'','/research?agent='+savedAgent.id);
           }else if(location.pathname==='/'&&savedSettings?.until>Date.now()&&['Business memory','Skills & connections'].includes(savedSettings.page)){
             const id=savedSettings.page==='Skills & connections'&&typeof savedSettings.id==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(savedSettings.id)?savedSettings.id:null;
             P(savedSettings.page);setSkillId(id);history.replaceState(null,'',viewLinks[savedSettings.page]+(id?'&agent='+id:''));
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
 const displayedBot=sel?d?.bots.find(bot=>bot.id===sel):d?.bots[0];
 const unconfirmed=page==='Agents'&&displayedBot?.chatTurn?.status==='unconfirmed'?displayedBot.chatTurn.requestId:null;
 useEffect(()=>{
   if(preview||!auth||!unconfirmed)return;
   const controller=new AbortController();
   const timers=[1800,4500,9500,18500].map(ms=>setTimeout(()=>load(auth,controller.signal).catch(()=>{}),ms));
   return ()=>{controller.abort();timers.forEach(clearTimeout)};
 },[preview,auth,unconfirmed]);
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
   let result=true;
   try{
     if(preview){
       if(action==='messageAgent'){
         result=sampleMessage(d,p,new Date().toISOString());D(result);
       }else if(action==='save'){
         D(current=>({...current,bots:current.bots.map(a=>a.id===p.id?{...a,name:p.name,brief:p.brief,cap:Number(p.cap),cadence:Number(p.cadence),delay:Number(p.delay)}:a)}));
       }else if(action==='research'){
         await new Promise(done=>setTimeout(done,350));
         D(current=>runSample(current,new Date().toISOString(),p.id));
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
       result=v;D(v);
       if(action==='manual')N('Saved for verification. A prospect appears here after their personal LinkedIn profile and employer are confirmed.');
     }
     if(close)M('');return result;
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
       const target=currentRoute();
       if(['Business memory','Skills & connections'].includes(target.page))localStorage.setItem(settingsHint,JSON.stringify({page:target.page,id:target.skillId,until:Date.now()+3600000}));
       else localStorage.removeItem(settingsHint);
       const returnTo=location.pathname==='/research'?initialAgentId:currentRoute().id===newThread?newThread:null;
       if(returnTo)localStorage.setItem(agentHint,JSON.stringify({id:returnTo,until:Date.now()+3600000}));
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
 if(!d)return <AgentEntry busy={busy} ready={ready} sent={sent} notice={notice} auth={auth} login={login} logout={logout} initialPage={initialAgentId?'Research':page}/>;
 const publishedLeads=preview?d.leads:d.leads.filter(isPublishedProspect);
 const b=sel===newThread?null:sel?d.bots.find(x=>x.id===sel):d.bots[0];
 const l=publishedLeads.find(x=>x.id===draftId);
 function navigate(path){if(!preview&&path&&location.pathname+location.search!==path)history.pushState(null,'',path)}
 function go(p,botId=null){P(p);setSkillId(p==='Skills & connections'?botId:null);M('');E('');N('');Q('');setAgentFilter('');setMobileRoster(false);setActivityFor(null);
   navigate(p==='Skills & connections'&&botId?viewLinks[p]+'&agent='+encodeURIComponent(botId):viewLinks[p]||(b?'/research?agent='+encodeURIComponent(b.id):'/'));}
 function selectAgent(id,showFeed=false){setManagedRequest(null);S(id);P('Agents');M('');E('');N('');setMobileRoster(false);setActivityFor(showFeed?id:null);
   navigate(id===newThread?'/?new=1':'/research?agent='+encodeURIComponent(id));}
 function manageSource(agent,source,leadId){
   if(!agent)return;
   selectAgent(agent.id);setManagedRequest({agentId:agent.id,source,leadId,key:crypto.randomUUID()});
 }
 async function refreshDesk(){if(!preview)await load(auth)}
 function senderControls(person,draft,channel){
   const owner=d.bots.find(bot=>bot.id===(draft?.botId||person.botId));
   if(!owner)return null;
   return <SendDraft agent={owner} lead={person} draft={draft} channel={channel} workspace={d} getToken={token} onRefresh={refreshDesk}
     onOpen={name=>{if(name==='inbox')S(owner.id);open(name)}} onFindEmail={()=>manageSource(owner,'rocketreach',person.id)} preview={!!preview}/>;
 }
 function clearLandingDraft(){clearPendingBrief();setInitialDraft('')}
 async function sendAgentMessage(message,requestId,searchSources,botName,modelPreference,retryPayload){
   const original=sel,payload=retryPayload||{...(b?{id:b.id}:{}),message,requestId,...(Array.isArray(searchSources)?{searchSources}:{}),...(!b&&botName?{botName}:{}),...(!b&&modelPreference?{modelPreference}:{})};
   if(preview){
     const result=await act('messageAgent',payload,false);
     if(!result)return false;
     if(!b&&result.agentId)selectAgent(result.agentId);
   }else{
     if(activeTurnRequest.current)return false;
     E('');N('');setDeliveryFailure(null);
     if(!b&&original!==newThread)S(newThread);
     const call={};activeTurnRequest.current=call;
     try{
       let deliveryError;
       try{
         const ticket=await prepareEveSession(token,payload);
         if(activeTurnRequest.current!==call)return false;
         await new Promise((resolve,reject)=>{Object.assign(call,{ticket,payload,resolve,reject});setEveCommand(call)});
       }catch(error){deliveryError=error}
       if(activeTurnRequest.current!==call)return false;
       // The workspace records the bot and request before the native session starts.
       // Its receipt can survive an interrupted transport, including on the first message.
       const latest=await load(auth);
       if(activeTurnRequest.current!==call)return false;
       const saved=latest.bots.find(bot=>bot.chatTurn?.requestId===payload.requestId&&(!payload.id||bot.id===payload.id));
       const target=call.ticket?.agentId||saved?.id,view=viewRef.current;
       if(!b&&target&&view.page==='Agents'&&(view.sel===newThread||view.sel===original))selectAgent(target);
       if(deliveryError&&!saved)throw deliveryError;
       if(deliveryError&&saved.chatTurn.status!=='confirmed')
         setDeliveryFailure({agentId:saved.id,requestId:payload.requestId,error:deliveryError});
     }catch(e){if(activeTurnRequest.current===call)E(e.message||'Your bot could not accept the message.');return false}
     finally{if(activeTurnRequest.current===call){activeTurnRequest.current=null;setEveCommand(null)}}
   }
   if(initialDraft)clearLandingDraft();setTeaching(null);return true;
 }
 function retryChatTurn(){
   const payload=retryTurnPayload(b);
   if(!payload||preview)return false;
   return sendAgentMessage(payload.message,payload.requestId,undefined,undefined,undefined,payload);
 }
 function open(m){E('');N('');if(preview&&['connect','agentmail'].includes(m)){N('Sign in to connect your own mailbox.');return}M(m)}
 const filtered=publishedLeads.filter(x=>(!agentFilter||belongsToCampaign(x,agentFilter))&&[x.company,x.person,x.role,x.email,x.fit].join(' ').toLowerCase().includes(search.toLowerCase()));
 function showProspects(id){go('Prospects');setAgentFilter(id)}
 function handleForm(action,extra={}){return e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));act(action,{...f,...extra})}}
 async function copy(v){try{await navigator.clipboard.writeText(v);N('Draft copied.')}catch{E('Select the draft and copy it manually.')}}
 return <div className={'room-shell'+(mobileRoster?' mobile-roster-open':'')}>
 <aside className="room-sidebar"><div className="room-brand"><Brand/><button type="button" className="room-mobile-create" onClick={()=>selectAgent(newThread)}>＋ New bot</button><button className="room-roster-toggle" aria-label={mobileRoster?'Close navigation menu':'Bots & tools menu'} aria-expanded={mobileRoster} onClick={()=>setMobileRoster(!mobileRoster)}>{mobileRoster?'Close menu':'Menu'}</button></div>
 <div className="room-side-body"><button className="room-new" onClick={()=>selectAgent(newThread)}><Icon n="plus"/>New bot</button>
 <div className="room-side-label">Bots</div><nav className="room-roster" aria-label="Your sales bots">
 {d.bots.map(agent=>{const state=agentState(agent,{snapshot:page==='Agents'&&b?.id===agent.id&&eveSnapshot?.id===agent.id?eveSnapshot:null});return <button key={agent.id} className={'room-agent '+(page==='Agents'&&agent.id===b?.id?'selected':'')} aria-current={page==='Agents'&&agent.id===b?.id?'page':undefined} onClick={()=>selectAgent(agent.id)}><i className={'room-agent-dot '+state.tone}/><span><strong>{agent.name}</strong><small>{state.label}</small></span></button>})}</nav>
 <div className="room-side-label">Workspace</div><nav className="room-nav" aria-label="Workspace tools">{nav.filter(n=>n!=='Agents').map(n=><button className={page===n?'selected':''} key={n} onClick={()=>go(n)}><Icon n={n}/>{n==='LinkedIn queue'?'Drafts':n}</button>)}</nav></div>
 <div className="account"><i>{preview?'S':d.userEmail?.[0]?.toUpperCase()}</i><div>{preview?'Sample workspace':d.userEmail}<small>{preview?'Interactive demo':'Workspace owner'}</small></div>{preview?<a href="/">Sign in</a>:<button onClick={logout} title="Sign out" aria-label="Sign out">↗</button>}</div></aside>
 <main className={'room-main '+(page==='Agents'?'room-chat':'room-secondary')}><header className="room-topbar"><span>{preview?'Fictional demo':'Sales workroom'} <em>/</em> {page==='Agents'?'Conversations':page==='LinkedIn queue'?'Drafts':page}</span>{preview?<a href="/" style={{whiteSpace:'nowrap',flexShrink:0}}>Sign in</a>:<button disabled={busy} onClick={()=>load(auth).then(()=>N('Workspace refreshed.')).catch(e=>E(e.message))}>Refresh</button>}</header>
 <div className="room-content">{page==='Agents'?<AgentThread key={b?.id||newThread} agent={b} messages={b?d.messages.filter(x=>x.botId===b.id):[]} leads={b?publishedLeads.filter(x=>belongsToCampaign(x,b.id)):[]}
   isDemo={!!preview} deliveryError={b&&deliveryFailure?.agentId===b.id&&deliveryFailure.requestId===b.chatTurn?.requestId?deliveryFailure.error:null} stream={(!preview&&eveSnapshot?.id===(b?.id||eveCommand?.ticket.agentId))?eveSnapshot:null} busy={busy} getToken={token} onTeach={(brief,name,model)=>{setTeaching({brief,name,model});go('Business memory')}} startingName={!b?teaching?.name:''} startingModel={!b?teaching?.model:'auto'} notice={!modal?(notice||(!b&&sel&&sel!==newThread?<p className="error" role="alert">This agent is unavailable in this workspace. Choose an agent in the sidebar or start a new conversation.</p>:null)):null} initialDraft={!b?(teaching?.brief??initialDraft):''} onClearDraft={()=>{clearLandingDraft();setTeaching(null)}}
   workspace={d} onAction={(action,input)=>act(action,input,false)} onOpen={open} onRefresh={refreshDesk} managedRequest={managedRequest?.agentId===b?.id?managedRequest:null}
   onFindEmail={lead=>manageSource(b,'rocketreach',lead.id)} onSend={sendAgentMessage} onRetryTurn={retryChatTurn} onImport={(source,people)=>act('importSelectedLeads',{id:b.id,source,people},false)} showActivity={!!b&&activityFor===b.id} onShowProspects={()=>b&&showProspects(b.id)}
   tools={b?(openActivity,openSource,openComputer,manageProvider)=><><div className="thread-tool-actions"><button onClick={()=>go('Skills & connections',b.id)}>Bot skills</button><button onClick={()=>go('Business memory')}>Business memory</button><button disabled={busy} onClick={()=>open('save')}>Edit bot</button><button disabled={busy} onClick={()=>b.active?act('pause',{id:b.id}):open('activate')}>{b.active?'Pause schedule':'Schedule research'}</button></div><BotModel agent={b} busy={busy} isDemo={!!preview} onAction={(action,p)=>act(action,p,false)}/><AgentTools agent={b} workspace={d} demo={!!preview} busy={busy} onOpen={open} onAction={act} onNavigate={go} onShowActivity={()=>preview?go('Activity'):openActivity()} onChooseSource={openSource} onManageSource={manageProvider} onOpenComputer={preview?openSource:openComputer} onShowProspects={()=>showProspects(b.id)}/></>:null}/>:<>
 <div className="pagehead"><div><h1>{page==='LinkedIn queue'?'Drafts':page}</h1></div>{page==='Prospects'&&d.bots.length>0&&<button onClick={()=>open('manual')}>Add prospect</button>}</div>{!modal&&notice}
 {page==='Business memory'&&<BusinessMemory key={d.userEmail||'sample'} memory={d.businessMemory} isDemo={!!preview} getToken={token} onRefresh={refreshDesk} returnToBot={teaching?()=>selectAgent(newThread):null}/>}
 {page==='Skills & connections'&&<SkillsConnections workspace={d} agent={d.bots.find(item=>item.id===skillId)||null} requestedAgentId={skillId} onSelectAgent={id=>go('Skills & connections',id)} getToken={token} onRefresh={refreshDesk} isDemo={!!preview} busy={busy} onAction={(action,p)=>act(action,p,false)} onOpen={open} onBackToBot={()=>skillId&&selectAgent(skillId)}/>}
 {page==='Prospects'&&<>{!preview&&d.bots.filter(agent=>agent.researchJob&&(!agentFilter||agent.id===agentFilter)&&(researchingAgent(agent)||agentFilter||d.bots.length===1||!publishedLeads.length)).map(agent=><article className="panel" key={agent.id}><div className="row"><h2>{agent.name}</h2><button onClick={()=>selectAgent(agent.id,true)}>View research activity</button></div><ResearchProgress agent={agent}/></article>)}{agentFilter&&<div className="filterbar"><span>{d.bots.find(agent=>agent.id===agentFilter)?.name}</span><button onClick={()=>setAgentFilter('')}>Show all agents</button></div>}<input className="search" aria-label="Search prospects" placeholder="Search prospects…" value={search} onChange={e=>Q(e.target.value)}/>{filtered.length===0?<div className="panel"><h2>{search||agentFilter?'No matching prospects':preview?'Your prospect ledger is empty':'No verified prospects yet'}</h2><p>{preview?'Run sample research to see a buyer.':search?'Try a different name, role or company.':'Prospects appear here once the agent confirms their personal LinkedIn profile and employer.'}</p></div>:filtered.map(x=><article className="panel" key={x.id}><div className="row"><h2>{x.person||x.company}</h2><span className="pill">{preview?'Sample prospect':x.status}</span></div><small>{[x.role,x.person&&x.company,x.email||'No verified email'].filter(Boolean).join(' · ')}</small>{!preview&&<Provenance lead={x}/>}<p>{x.fit}</p>{(x.evidence||x.quote)&&<blockquote>{x.evidence||x.quote}{preview&&<cite>Fictional staff profile · {x.company}</cite>}</blockquote>}{webSource(x.source)&&<a href={webSource(x.source)} target="_blank" rel="noreferrer">View source ↗</a>}{x.sourceDate&&<small> · Source dated <time dateTime={x.sourceDate}>{x.sourceDate}</time></small>}{!preview&&<><CompanyProof lead={x}/><ProfileLink lead={x}/></>}{!preview&&<div className="controls"><button disabled={busy} onClick={()=>act('visual',{id:x.id})}>{busy?'Working…':'Inspect source with Sonnet'}</button></div>}{x.visual&&<p>{x.visual}</p>}<details><summary>Email draft</summary><strong>{x.subject}</strong><p>{x.body}</p>{senderControls(x,null,'email')}</details>{!preview&&!['replied','stopped'].includes(x.status)&&<button disabled={busy} onClick={()=>act('suppress',{id:x.id})}>Stop outreach</button>}</article>)}</>}
 {page==='LinkedIn queue'&&<><div className="draft-tabs" aria-label="Draft channel">{['LinkedIn','Email'].map(type=><button key={type} aria-pressed={draftType===type} onClick={()=>setDraftType(type)}>{type}</button>)}</div>{publishedLeads.flatMap(person=>(person.reviewDrafts||[]).filter(draft=>draftType==='LinkedIn'?draft.linkedin:draft.body).map(draft=><article className="panel" key={draft.id}><small>Prepared in conversation · {dt(draft.at)}</small><h2>{person.person}</h2>{draftType==='Email'&&draft.subject&&<strong>{draft.subject}</strong>}<p>{draftType==='Email'?draft.body:draft.linkedin}</p><button onClick={()=>copy(draftType==='Email'?draft.body:draft.linkedin)}>Copy draft</button>{senderControls(person,draft,draftType)}</article>))}{draftType==='Email'?<>{!publishedLeads.length&&<p>No email drafts yet.</p>}{publishedLeads.map(x=><article className="panel" key={x.id}><h2>{x.person} · {x.company}</h2><p><strong>{x.subject}</strong></p><p>{x.body}</p><button onClick={()=>copy(x.body)}>Copy email draft</button>{senderControls(x,null,'email')}</article>)}</>:<><section className="panel"><h2>LinkedIn sign-in</h2><p>Open LinkedIn in the browser where you use 1Password. Choose your saved LinkedIn login and complete any verification there. Copy a note below when you are ready to send.</p><a href="https://www.linkedin.com/login" target="_blank" rel="noreferrer">Open LinkedIn sign-in ↗</a></section>{!publishedLeads.length&&<div className="panel"><h2>No LinkedIn drafts yet</h2><p>Your agents prepare a note for each verified prospect.</p></div>}{publishedLeads.filter(x=>!['stopped','replied'].includes(x.status)).map(x=><article className="panel" key={x.id}><div className="row"><h2>{x.company}</h2><span className="pill">{x.linkedinState}</span></div><small>{x.person||'Company contact'}</small>{!preview&&<ProfileLink lead={x}/>}<p>{x.linkedin}</p>{senderControls(x,null,'linkedin')}{x.linkedinState==='draft'&&<div className="controls"><button onClick={()=>copy(x.linkedin)}>Copy note</button><button onClick={()=>{setDraftId(x.id);open('draft')}}>Edit</button><a href="https://www.linkedin.com/sales/home" target="_blank" rel="noreferrer">Open Sales Navigator ↗</a><button disabled={busy} onClick={()=>act('linked',{id:x.id})}>Mark sent</button></div>}</article>)}</>}</>}
 {page==='Activity'&&<section className="panel"><h2>Workspace history</h2>{d.events.length?d.events.map(x=><div className="log" key={x.id}><time>{dt(x.at)}</time><span>{x.text}</span></div>):<p>Agent runs, prospect changes, and outreach activity appear here.</p>}</section>}
 {page==='Mailbox'&&<section className="panel"><div className="row"><h2>AgentMail</h2><span className="pill">{d.agentMailConnected?'Connected':'Disconnected'}</span></div><p>Each agent can have its own address for inbound requests and replies. Create its address from the agent page.</p><button onClick={()=>open('agentmail')}>{d.agentMailConnected?'Update API key':'Connect AgentMail'}</button></section>}{page==='Mailbox'&&<section className="panel"><div className="row"><h2>Outbound email</h2><span className={'pill '+(d.mailbox?'on':'')}>{d.mailbox?'Connected':'Disconnected'}</span></div><p>{d.mailbox?d.mailbox.email:'Connect a mailbox to send campaign emails and detect replies.'}</p>{d.mailbox?<button disabled={busy} onClick={()=>act('disconnect')}>Disconnect mailbox</button>:<button className="primary" onClick={()=>open('connect')}>Connect mailbox</button>}</section>}
 </>}</div></main>
 {!preview&&auth&&<EveBotBridge selectedId={page==='Agents'?b?.id:null} command={eveCommand} getToken={token} onSnapshot={setEveSnapshot} onAccepted={turn=>turn.resolve()} onSettled={refreshDesk}/>}
 {modal&&<div className="overlay" onKeyDown={e=>{if(e.key==='Escape'&&!busy)M('')}}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialogtitle"><div className="row"><h2 id="dialogtitle">{{create:'New sales agent',save:'Edit bot',activate:'Schedule research',connect:'Connect mailbox',draft:'Edit LinkedIn note',manual:'Add prospect',agentmail:'Connect AgentMail',inboxReply:'Reply from agent inbox',inbox:'Agent inbox'}[modal]}</h2><button aria-label="Close" disabled={busy} onClick={()=>M('')}><Icon n="close"/></button></div>{notice}
 {modal==='save'&&b&&<form onSubmit={handleForm('save',{id:b.id})}>{agentFields(b)}<button disabled={busy} className="primary">Save changes</button></form>}
 {modal==='activate'&&<form onSubmit={e=>{e.preventDefault();act('activate',{id:b.id,autoEmail:new FormData(e.target).has('auto')})}}><p>{preview?'This demo lets you try the schedule controls locally.':'The scheduler checks every 10 minutes. The first search becomes due when you enable the schedule.'} Research repeats every {b.cadence} hours.</p><p>Automatic email is off by default. Enabling it allows up to {b.cap} emails per day, including one follow-up after {b.delay} days.</p><label className="check"><input name="auto" type="checkbox" disabled={!d.mailbox}/>Enable automatic sending {d.mailbox?'from '+d.mailbox.email:'(connect a mailbox first)'}</label><button disabled={busy} className="primary">{preview?'Try demo schedule':'Start schedule'}</button></form>}
 {modal==='inbox'&&b&&<><p>{b.inbox?.email||'No agent address connected.'}</p>{!d.agentMailConnected?<button onClick={()=>open('agentmail')}>Connect AgentMail</button>:!b.inbox?<button disabled={busy} onClick={()=>act('inboxCreate',{id:b.id},false)}>Create agent address</button>:<button disabled={busy} onClick={()=>act('inboxSync',{id:b.id},false)}>Check inbox</button>}{b.inbound?.map(item=><article className="message" key={item.id}><small>{item.from} · {dt(item.at)}</small><p><strong>{item.subject}</strong><br/>{item.preview}</p><button disabled={busy||!!b.replyState?.[item.id]} onClick={()=>{I(item);open('inboxReply')}}>{b.replyState?.[item.id]||'Reply'}</button></article>)}</>}
 {modal==='agentmail'&&<form onSubmit={handleForm('agentmail')}><Field name="key" label="AgentMail API key" type="password" required autoComplete="new-password"/><a href="https://console.agentmail.to/" target="_blank" rel="noreferrer">Open AgentMail console ↗</a><p>Your key is encrypted. Each agent gets a separate inbox when you provision it.</p><button disabled={busy} className="primary">Connect</button></form>}{modal==='inboxReply'&&incoming&&b&&<form onSubmit={handleForm('inboxReply',{id:b.id,messageId:incoming.id})}><p>{incoming.from} · {incoming.subject}</p><Field name="reply" label="Your reply" area rows={5} required/><button className="primary" disabled={busy}>Send reply</button></form>}{modal==='connect'&&<form onSubmit={handleForm('connect')}><label>Provider<select name="provider"><option value="gmail">Gmail / Google Workspace</option><option value="yahoo">Yahoo Mail</option><option value="icloud">iCloud Mail</option></select></label><Field label="Mailbox address" name="email" type="email" required/><Field name="password" type="password" label="Provider app password" autoComplete="new-password" required/><Field name="address" label="Business mailing address for email footers" required/><p>Connection checks sending access and inbox access for reply detection.</p><button className="primary" disabled={busy}>Verify and connect</button></form>}
 {modal==='draft'&&l&&<form onSubmit={handleForm('draft',{id:l.id})}><Field name="linkedin" label="Note" area rows={5} defaultValue={l.linkedin} required/><button className="primary" disabled={busy}>Save note</button></form>}
 {modal==='manual'&&<form onSubmit={handleForm('manual')}><p>Submit a person for verification. They appear in Prospects once their profile and employer are confirmed.</p><label>Bot<select name="id">{d.bots.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>{[['company','Company'],['person','Contact name'],['email','Verified email (optional)'],['source','Public source URL'],['linkedinUrl','LinkedIn profile URL (optional)'],['fit','Reason for fit'],['subject','Email subject'],['body','Email draft'],['linkedin','LinkedIn note']].map(([n,label])=><Field key={n} label={label} name={n} area={['body','linkedin'].includes(n)} type={n==='email'?'email':['source','linkedinUrl'].includes(n)?'url':'text'} required={!['email','linkedinUrl'].includes(n)}/>)}<button className="primary" disabled={busy}>Add prospect</button></form>}
 </section></div>}</div>
}
