'use client';
import {useEffect,useRef,useState} from 'react';
import ResearchFeed from './research-feed';
import AgentComputer from './agent-computer';
import SendDraft from './send-draft';
import {MailboxResearch,RocketReachSource,SourcePicker,sourceName} from './search-sources';
import {selectedSearchSources} from '../lib/search-source.mjs';
import {prospectSources} from '../lib/provenance.mjs';
import {linkedinProfileUrl} from '../lib/profile-url.mjs';
function safeSource(value){
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}
}

export function Provenance({lead,agentId}){
  const entries=prospectSources(lead,agentId);
  if(!entries.length)return null;
  return <div className="source-provenance" aria-label="Prospect sources">{entries.map((entry,i)=>entry.url?<a key={i} title={entry.detail} href={entry.url} target="_blank" rel="noreferrer">{entry.label} ↗</a>:<span key={i} title={entry.detail}>{entry.label}</span>)}</div>;
}
export function providerBusy(agent){
  return Object.values(agent?.sourceStates||{}).some(row=>['queued','working','running','searching','verifying'].includes(row?.status));
}
const stateDescriptions={web:'Public-source research',linkedin:'Select people in your agent computer',sales_navigator:'Select leads in your agent computer',rocketreach:'A connected RocketReach account is required',email:'An approved mailbox scope is required'};
export function agentState(agent){
  const phase=agent?.researchJob?.status||agent?.lastRun?.status;
  if(agent?.searchGate?.status==='awaiting_source')return {label:'Choose a search source',tone:'attention'};
  if(providerBusy(agent)||agent?.researchRequestedAt||agent?.lease&&Date.parse(agent.lease.until)>Date.now()||['queued','running','continuing'].includes(phase))return {label:'Working',tone:'working'};
  if(agent?.searchGate?.status==='awaiting_selection')return {label:'Ready for your selections',tone:'attention'};
  if(phase==='needs_input')return {label:'Needs your input',tone:'attention'};
  if(phase==='failed')return {label:'Needs attention',tone:'attention'};
  if(phase==='goal_met')return {label:'Goal reached',tone:'ready'};
  if(phase==='exhausted')return {label:'Search exhausted',tone:'idle'};
  if(agent?.active)return {label:'Scheduled',tone:'ready'};
  return {label:'Ready',tone:'idle'};
}
function initials(name){return String(name||'Sales agent').trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}
const stamp=at=>at?new Date(at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
function Message({message,name}){
  const user=message.role==='user',draft=['prospectDraft','sendReview'].includes(message.details?.type)?message.details:null,delivery=message.details?.type==='delivery'?message.details:null;
  const legacyCopy=draft&&[draft.linkedin,draft.body].some(copy=>typeof copy==='string'&&copy.length&&message.content.includes(copy));
  return <article className={'thread-message '+(user?'is-user':'is-agent')}>
    <span className={'thread-avatar '+(user?'is-user':'is-agent')} aria-hidden="true">{user?'Y':initials(name)}</span>
    <div className="thread-message-main"><div className="thread-message-meta"><strong>{user?'You':name}</strong>{message.at&&<time dateTime={message.at}>{stamp(message.at)}</time>}</div>
    {!legacyCopy&&<p>{message.content}</p>}{draft&&<div className="thread-draft"><strong>Draft for {draft.person}</strong>{draft.to&&<p>To · {draft.to}</p>}{draft.senderEmail&&<p>From · {draft.senderEmail}</p>}{draft.body&&<section><small>Email</small>{draft.subject&&<p><strong>{draft.subject}</strong></p>}<p>{draft.body}</p></section>}{draft.linkedin&&<section><small>LinkedIn</small><p>{draft.linkedin}</p></section>}</div>}{delivery&&<div className="thread-delivery"><strong>{({sent:'Accepted by sender',sending:'Sending',needs_review:'Delivery needs review',rejected:'Send rejected'})[delivery.status]||'Delivery receipt'}</strong><p>{[delivery.provider,delivery.from&&'From '+delivery.from,delivery.to&&'To '+delivery.to].filter(Boolean).join(' · ')}</p>{delivery.providerId&&<small>Receipt {delivery.providerId}</small>}</div>}</div>
  </article>;
}
export default function AgentThread({agent,messages,leads,isDemo,busy,notice,onSend,getToken,onShowProspects,showActivity,tools,initialDraft='',onClearDraft,onImport,workspace,onAction,onOpen,onRefresh,managedRequest,onFindEmail,onManageSource}){
  const [botName,setBotName]=useState(''),[panels,setPanels]=useState({});
  const [personId,setPersonId]=useState(null),[chooseSource,setChooseSource]=useState(false);
  const [value,setValue]=useState(initialDraft),[pending,setPending]=useState(''),[activity,setActivity]=useState(!!showActivity||(!isDemo&&agentState(agent).tone==='working')),[settings,setSettings]=useState(false);
  const scroller=useRef(null),field=useRef(null),follow=useRef(true),request=useRef(null),sending=useRef(false);
  const name=agent?.name||'New bot',state=agentState(agent),job=agent?.researchJob,run=agent?.lastRun;
  const sources=selectedSearchSources(agent),sourceKey=sources.join(',');
  const sourcePending=!!agent&&!sources.length&&!!(agent.searchGate?.status==='awaiting_source'||run?.status==='failed'||job?.status==='failed'||messages.some(m=>m.role==='assistant'&&m.details?.type==='sourceChoice'));
  const showSources=!!agent&&(sourcePending||chooseSource);
  const suggested=managedRequest?.source&&!sources.includes(managedRequest.source)?[...sources,managedRequest.source]:sources;
  const hasWeb=sources.includes('web')||!sources.length&&!!job;
  const webWorking=hasWeb&&!!(agent?.researchRequestedAt||['running','continuing','queued'].includes(job?.status));
  const desktopRef=useRef({});
  function showProvider(provider,openDesktop=false){
    setSettings(false);
    if(!sources.includes(provider)){setChooseSource(true);requestAnimationFrame(()=>document.getElementById('thread-search-sources')?.scrollIntoView({block:'nearest'}));return}
    setPanels(current=>({...current,[provider]:true}));
    if(openDesktop)desktopRef.current[provider]?.open();
    requestAnimationFrame(()=>document.getElementById('provider-'+provider)?.scrollIntoView({block:'nearest'}));
  }
  useEffect(()=>{if(managedRequest?.source)showProvider(managedRequest.source)},[managedRequest?.key,sourceKey]);
  const question=run?.question,failed=job?.status==='failed'||run?.status==='failed';
  const lastWorking=useRef(webWorking);
  useEffect(()=>{if(webWorking&&!lastWorking.current)setActivity(true);lastWorking.current=webWorking},[webWorking]);
  const showBrief=agent?.brief&&!messages.some(m=>m.role==='user'&&m.content.trim()===agent.brief.trim());
  useEffect(()=>{if(showActivity&&!sourcePending){setActivity(true);requestAnimationFrame(()=>document.getElementById('thread-activity-panel')?.scrollIntoView({block:'nearest'}))}},[showActivity,sourcePending]);
  useEffect(()=>{const el=scroller.current;if(el&&follow.current&&!showActivity&&!sourcePending)el.scrollTop=el.scrollHeight},[agent?.id,messages.length,pending,leads.length,showActivity,sourcePending]);
  useEffect(()=>{
    if(!sourcePending||!scroller.current)return;
    const el=scroller.current;el.scrollTop=0;
    const picker=el.querySelector('#thread-search-sources');
    if(picker){
      const panel=el.getBoundingClientRect(),bounds=picker.getBoundingClientRect();
      if(bounds.bottom>panel.bottom)el.scrollTop=Math.max(0,bounds.top-panel.top-4);
    }
  },[sourcePending]);
  useEffect(()=>{if(initialDraft)setValue(initialDraft)},[initialDraft]);
  const selectedPerson=leads.find(p=>p.id===personId);
  function fill(text){setValue(text);field.current?.focus()}
  async function send(input,selected){
    const message=String(input??value).trim();if(!message||sending.current||busy)return;
    if(!request.current||request.current.message!==message||request.current.selection!==selected?.join(',')||request.current.name!==botName)request.current={message,selection:selected?.join(','),name:botName,id:crypto.randomUUID()};
    sending.current=true;setPending(message);setValue(message);follow.current=true;
    try{if(await onSend(message,request.current.id,selected,agent?undefined:botName.trim())){request.current=null;setValue('');setChooseSource(false)}}finally{sending.current=false;setPending('')}
  }
  const actions=agent?[
    {label:isDemo?'Run sample research':failed?'Retry research':'Find prospects',message:isDemo?'Run sample research for this brief.':failed?'Retry this research run.':'Research this brief and find verified prospects.'},
    {label:'Check status',message:'What is the status of this research?'},
    ...(leads.length?[{label:'Prepare a draft',text:'Draft a LinkedIn introduction for '+leads[0].person+'.'}]:[]),
    {label:'Refine targeting',text:'Update the target to '}
  ]:[
    {label:'Find buyers',text:'Find buyers at '},
    {label:'Research an account',text:'Find the people responsible for sourcing at '}
  ];
  return <section className="agent-thread">
    <header className="thread-header"><div className="thread-heading"><span className="thread-agent-icon" aria-hidden="true">{agent?initials(name):'+'}</span><div><h1>{name}</h1><span className={'agent-status '+state.tone}>{agent?state.label:'Create with a message'}</span></div></div>
      {agent&&<button className="thread-tools-trigger" onClick={()=>setSettings(!settings)} aria-expanded={settings} aria-controls="agent-toolbox">Agent tools</button>}</header>
    {settings&&<div id="agent-toolbox" className="thread-tools">{tools(()=>{setSettings(false);setActivity(true);requestAnimationFrame(()=>document.getElementById('thread-activity-panel')?.scrollIntoView({block:'nearest'}))},()=>{setSettings(false);setChooseSource(true);requestAnimationFrame(()=>document.getElementById('thread-search-sources')?.scrollIntoView({block:'nearest'}))},provider=>showProvider(provider,true),provider=>showProvider(provider))}</div>}
    <div className="thread-scroll" ref={scroller} onScroll={e=>{const el=e.currentTarget;follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<85}}>
      <div className="thread-flow">
        {!agent&&<div className="thread-welcome"><h2>What should your sales bot work on?</h2><p>Your bot keeps its own brief, sources and conversation.</p><label>Bot name (optional)<input value={botName} maxLength={65} placeholder="Barbour Scout" onChange={e=>setBotName(e.target.value)}/></label></div>}
        {showSources&&<SourcePicker key={agent.id+'/'+sourceKey+'/'+(managedRequest?.key||'')} selected={suggested} busy={busy||!!pending} onApply={chosen=>send('Use these research sources: '+chosen.map(sourceName).join(', ')+'.',chosen)}/>}
        {agent&&<div className="thread-goal"><strong>{isDemo?'Sample research':(job||Number.isInteger(agent.taskQualified))?`${agent.taskQualified??job?.qualified??0} of ${job?.goal||agent.researchGoal||50} verified people`:`Goal · ${agent.researchGoal||50} verified people`}</strong><span>{isDemo?'Fictional company and contacts':job?`Public web · ${job.counts?.candidates||0} candidates surfaced · ${job.counts?.checked||0} source checks`:'Employer and personal LinkedIn profile checked'}</span></div>}
        {agent&&!sourcePending&&<div className="thread-source"><small>Search sources · {sources.length?sources.map(sourceName).join(' + '):'Choose sources'}{isDemo?' (demo)':''}</small><button type="button" disabled={busy} aria-expanded={showSources} aria-controls="thread-search-sources" onClick={()=>setChooseSource(!chooseSource)}>{chooseSource?'Close':sources.length?'Change sources':'Choose sources'}</button></div>}

        <div className="thread-messages" aria-label="Conversation">
          {showBrief&&<article className="thread-brief"><small>Research brief</small><p>{agent.brief}</p></article>}
          {messages.map(m=>{const person=['prospectDraft','sendReview'].includes(m.details?.type)&&leads.find(l=>l.id===m.details.prospectId);const records=person?.reviewDrafts?.filter(item=>item.botId===agent.id)||[];const referenced=m.details?.draftId||m.details?.requestId||m.details?.id;const matching=referenced?records.filter(item=>item.id===referenced):records.filter(item=>item.channel===m.details?.channel&&item.body===m.details?.body&&item.linkedin===m.details?.linkedin&&item.subject===m.details?.subject);const draft=matching.length===1?matching[0]:null;return <div key={m.id}><Message message={m} name={name}/>{person&&draft&&m.details?.requiresConfirmation!==false&&<SendDraft agent={agent} lead={person} draft={draft} workspace={workspace} getToken={getToken} onRefresh={onRefresh} onOpen={onOpen} onFindEmail={onFindEmail} preview={isDemo}/>}</div>})}
          {pending&&<Message message={{role:'user',content:pending}} name={name}/>}
        </div>

        {agent&&!!sources.length&&<section className="source-readiness" aria-label="Selected research sources">
        {sources.map(provider=>{const state=agent.sourceStates?.[provider];const isPrivate=['linkedin','sales_navigator'].includes(provider);
          const providerLabel=sourceName(provider),savedSummary=state?.summary;
          const extra=provider==='rocketreach'&&workspace.rocketReach?.connected?'Account connected':provider==='email'&&workspace.mailbox?'Mailbox connected · choose an approved scope':'';
          const summary=isDemo?(provider==='web'?'Fictional public-source example':'Available in a connected workspace'):savedSummary||extra||stateDescriptions[provider];
          return <div key={provider} id={'provider-'+provider}><button type="button" className="provider-status" aria-expanded={!!panels[provider]} aria-controls={'provider-panel-'+provider} onClick={()=>setPanels(current=>({...current,[provider]:!current[provider]}))}><strong>{providerLabel}</strong><small>{summary}</small></button>
          <div id={'provider-panel-'+provider} hidden={!panels[provider]}>
            {provider==='web'&&<p>{isDemo?'Run sample research to check the fictional staff profile.':'See the submitted queries and public evidence in Research activity below.'}</p>}
            {isPrivate&&(isDemo?<p>Sign in to use a private agent computer for {providerLabel}.</p>:<AgentComputer ref={item=>{desktopRef.current[provider]=item}} agent={agent} provider={provider} getToken={getToken} busy={busy} onImport={people=>onImport(provider,people)}/>)}
            {provider==='rocketreach'&&<RocketReachSource agent={agent} connection={workspace.rocketReach} leads={leads} isDemo={isDemo} busy={busy} focusLead={managedRequest?.leadId} onAction={onAction}/>}
            {provider==='email'&&<MailboxResearch agent={agent} mailbox={workspace.mailbox} isDemo={isDemo} getToken={getToken} onConnect={()=>onOpen('connect')} onRefresh={onRefresh}/>}
          </div></div>;
        })}</section>}
        {question&&!sourcePending&&!messages.slice(-1).some(m=>m.content.includes(question))&&<div className="thread-question"><strong>{name} has a question</strong><p>{question}</p></div>}
        {(agent?.error||failed)&&<div className="thread-error" role="alert"><strong>Research interrupted</strong><p>{agent?.error||run?.summary||'The run stopped before reaching its goal.'}</p></div>}
        {isDemo&&run?.sampleSteps&&<details className="thread-activity" open><summary>Sample research activity</summary><ol>{run.sampleSteps.map(step=><li key={step}>{step}</li>)}</ol></details>}
        {!!leads.length&&<section className="thread-results"><div className="row"><h2>{isDemo?'Sample prospects':'Verified prospects'}</h2><button onClick={onShowProspects}>View all {leads.length} →</button></div><div className="thread-people">{leads.slice(0,3).map(lead=><button className="thread-person" key={lead.id} aria-expanded={personId===lead.id} onClick={()=>setPersonId(personId===lead.id?null:lead.id)}><span className="person-monogram" aria-hidden="true">{initials(lead.person)}</span><span><strong>{lead.person}</strong><small>{[lead.role,lead.company].filter(Boolean).join(' · ')}</small></span></button>)}</div>{selectedPerson&&<div className="thread-person-detail"><strong>{selectedPerson.person}</strong><Provenance lead={selectedPerson} agentId={agent.id}/><p>{selectedPerson.evidence||selectedPerson.fit}</p><div className="thread-person-links">{linkedinProfileUrl(selectedPerson.linkedinUrl)&&<a className="profile-link" href={linkedinProfileUrl(selectedPerson.linkedinUrl)} target="_blank" rel="noreferrer">Open personal LinkedIn profile ↗</a>}{safeSource(selectedPerson.companyVerification?.source)&&<a href={safeSource(selectedPerson.companyVerification.source)} target="_blank" rel="noreferrer">Employer evidence ↗</a>}{safeSource(selectedPerson.source)&&<a href={safeSource(selectedPerson.source)} target="_blank" rel="noreferrer">Role source ↗</a>}</div>
        <button disabled={busy||!!pending} onClick={()=>send('Draft a LinkedIn introduction for '+selectedPerson.person+'.')}>Draft an introduction for {selectedPerson.person}</button><details><summary>Review LinkedIn draft</summary><p>{selectedPerson.linkedin}</p><SendDraft agent={agent} lead={selectedPerson} draft={null} channel="linkedin" workspace={workspace} getToken={getToken} onRefresh={onRefresh} onOpen={onOpen} onFindEmail={onFindEmail} preview={isDemo}/></details></div>}</section>}
        {agent&&!isDemo&&hasWeb&&<div className="thread-activity"><button aria-controls="thread-activity-panel" aria-expanded={activity} onClick={()=>setActivity(!activity)}>{activity?'Hide public-web activity':'View public-web activity'}</button>{activity&&<div id="thread-activity-panel"><ResearchFeed agent={agent} active={webWorking} getToken={getToken}/></div>}</div>}
        {notice}
      </div>
    </div>
    <div className="thread-compose"><div className="thread-quick" aria-label="Suggested actions">{actions.map(action=><button type="button" key={action.label} disabled={busy||!!pending} onClick={()=>action.message?send(action.message):fill(action.text)}>{action.label}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();send()}}><label className="composer-label" htmlFor="agent-message">{agent?'Message '+name:'First task for your bot'}</label>
        <div className="composer-input"><textarea id="agent-message" ref={field} value={value} maxLength={2000} rows={2} placeholder={question?'Reply to your agent…':agent?'Ask for research, a draft or an update…':'Find sourcing managers at…'} disabled={!!pending} onChange={e=>{setValue(e.target.value);if(!e.target.value&&initialDraft)onClearDraft()}}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}}/>
          <button type="submit" className="primary composer-send" aria-label={agent?'Send message':'Create bot and send task'} disabled={busy||!value.trim()||!!pending}>{pending?'Sending…':agent?'Send':'Create bot'} <span aria-hidden="true">↑</span></button>
        </div>
      </form>
    </div>
  </section>;
}
