'use client';
import {useRef,useState} from 'react';
import './search-sources.css';
import {mailboxScopeSuggestion} from '../lib/mailbox-scope.mjs';

export const sourceOptions=[
  {value:'web',label:'Public web',detail:'Public pages and trade sources'},
  {value:'linkedin',label:'LinkedIn',detail:'People you select in LinkedIn'},
  {value:'sales_navigator',label:'Sales Navigator',detail:'Leads you select in Sales Navigator'},
  {value:'rocketreach',label:'RocketReach',detail:'People and work email lookup'},
  {value:'email',label:'Connected email',detail:'Existing correspondence'}
];
export function sourceName(value){return sourceOptions.find(o=>o.value===value)?.label||''}

export function SourcePicker({selected,busy,onApply}){
  const [draft,setDraft]=useState(()=>[...selected]);
  function toggle(key){setDraft(current=>current.includes(key)?current.filter(value=>value!==key):[...current,key])}
  return <section id="thread-search-sources" className="thread-source-choice">
    <h2>Where should I search?</h2><p>Choose one or more sources for this brief.</p>
    <form onSubmit={e=>{e.preventDefault();if(draft.length&&!busy)onApply(draft)}}>
      <fieldset className="search-source-options"><legend>Search sources</legend>{sourceOptions.map(({value,label,detail})=><label key={value} className={draft.includes(value)?'chosen':''}>
        <input type="checkbox" checked={draft.includes(value)} disabled={busy} onChange={()=>toggle(value)}/>
        <span><strong>{label}</strong><small>{detail}</small></span>
      </label>)}</fieldset>
      <div className="source-apply"><button type="submit" className="primary" disabled={busy||!draft.length}>Apply sources</button><small aria-live="polite">{draft.length} selected</small></div>
    </form>
  </section>;
}

export function MailboxResearch({agent,mailbox,isDemo,onConnect,getToken,onRefresh}){
  const suggestion=mailboxScopeSuggestion(agent);
  const [scopeOpen,setScopeOpen]=useState(!suggestion.company||!suggestion.domain);
  const [company,setCompany]=useState(suggestion.company||''),[domain,setDomain]=useState(suggestion.domain||''),[days,setDays]=useState(suggestion.days||7),[consent,setConsent]=useState(false);
  const [mailboxKind,setBox]=useState(mailbox&&suggestion.mailboxKind!=='agentmail'?'connected':agent.inbox?.email?'agentmail':'connected'),[remember,setRemember]=useState(false);
  const mailboxAddress=mailboxKind==='agentmail'?agent.inbox?.email:mailbox?.email;
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(null);
  const sending=useRef(false),requestId=useRef(null);
  const shown=receipt||agent.lastMailboxResearch;
  function resetConsent(){setConsent(false);requestId.current=null;setError('')}
  async function search(e){
    e.preventDefault();if(!consent||!company.trim()||!domain.trim()||isDemo||!mailboxAddress||sending.current)return;
    sending.current=true;setBusy(true);setError('');
    if(!requestId.current)requestId.current=crypto.randomUUID();
    try{
      const response=await fetch('/api/mailbox-research',{method:'POST',headers:{Authorization:'Bearer '+await getToken(),'Content-Type':'application/json'},
        body:JSON.stringify({agentId:agent.id,requestId:requestId.current,source:'email',company:company.trim(),domain:domain.trim(),days:Number(days),mailboxKind,remember,consent:true})});
      const data=await response.json();
      if(!response.ok||!data.receipt)throw Error(data.error||'The mailbox search could not finish.');
      setReceipt(data.receipt);setConsent(false);setRemember(false);requestId.current=null;await onRefresh();
    }catch(e){setError(e.message)}finally{sending.current=false;setBusy(false)}
  }
  async function forget(){
    if(sending.current)return;sending.current=true;setBusy(true);setError('');
    try{
      const response=await fetch('/api/mailbox-research',{method:'POST',headers:{Authorization:'Bearer '+await getToken(),'Content-Type':'application/json'},body:JSON.stringify({agentId:agent.id,source:'email',requestId:crypto.randomUUID(),revoke:true})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Could not forget the saved scope.');
      setConsent(false);setRemember(false);await onRefresh();
    }catch(e){setError(e.message)}finally{sending.current=false;setBusy(false)}
  }
  if(isDemo)return <p>Sign in and connect your own mailbox to review existing correspondence.</p>;
  if(!mailbox&&!agent.inbox?.email)return <button onClick={onConnect}>Connect mailbox</button>;
  return <div><details><summary>Review correspondence from a company</summary>
    <form onSubmit={search}><label>Mailbox<select value={mailboxKind} onChange={e=>{setBox(e.target.value);resetConsent()}}>{mailbox&&<option value="connected">{mailbox.email}</option>}{agent.inbox?.email&&<option value="agentmail">{agent.inbox.email}</option>}</select></label><details open={scopeOpen} onToggle={e=>setScopeOpen(e.currentTarget.open)}><summary>Change scope · {company||'Company'}{domain?' · '+domain:''} · {days} days</summary><label>Company name<input value={company} required maxLength={120} onChange={e=>{setCompany(e.target.value);resetConsent()}}/></label>
      <label>Exact work email domain<input value={domain} required placeholder="barbour.com" onChange={e=>{setDomain(e.target.value);resetConsent()}}/></label>
      <label>Look back<select value={days} onChange={e=>{setDays(Number(e.target.value));resetConsent()}}>{[7,14,30].map(n=><option key={n} value={n}>{n} days</option>)}</select></label>
      </details><p><small>Check up to 30 recent inbox messages from this exact domain for named work senders. Verify each sender’s role, employer and LinkedIn profile using public sources. Message bodies and subjects stay unread.</small></p>
      <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Allow this search in {mailboxAddress}.</label>
      <label className="check"><input type="checkbox" checked={remember} onChange={e=>{setRemember(e.target.checked);requestId.current=null}}/>Remember this exact scope for this bot’s current brief.</label>
      <button type="submit" disabled={busy||!consent}>{busy?'Checking correspondence…':'Run mailbox search'}</button>
    </form></details>{error&&<p className="error" role="alert">{error}</p>}
    {shown&&<p role="status">Last review · {shown.domain} · {shown.examined||0} messages checked · {shown.saved||0} saved · {shown.existing||0} already saved · {Array.isArray(shown.held)?shown.held.length:shown.held||0} held</p>}
    {agent.mailboxScopeRemembered&&<button disabled={busy} onClick={forget}>Forget saved scope</button>}
  </div>;
}

export function RocketReachSource({agent,connection,leads,isDemo,onAction,busy,focusLead}){
  const [checked,setChecked]=useState([]),[secret,setSecret]=useState(''),[company,setCompany]=useState(''),[role,setRole]=useState('');
  const [leadId,setLeadId]=useState(''),inFlight=useRef(null);
  const results=agent.rocketReach?.results||[],receipt=agent.rocketReach?.receipt;
  const picked=results.filter(row=>checked.includes(String(row.id))).map(row=>String(row.id));
  async function action(name,args){
    const key=name+JSON.stringify(args);
    if(inFlight.current?.key!==key)inFlight.current={key,requestId:crypto.randomUUID()};
    const done=await onAction(name,{agentId:agent.id,...args,requestId:inFlight.current.requestId});
    if(done)inFlight.current=null;return done;
  }
  if(isDemo)return <p>RocketReach searches and work-email lookups require a connected account in the live workspace.</p>;
  if(!connection?.connected)return <details open><summary>Connect RocketReach</summary><form onSubmit={async e=>{e.preventDefault();if(await onAction('rocketReachConnect',{apiKey:secret}))setSecret('')}}><label>RocketReach API key<input type="password" required value={secret} onChange={e=>setSecret(e.target.value)} autoComplete="off"/></label><button disabled={busy}>Connect account</button></form></details>;
  const lookupId=leadId||focusLead||leads[0]?.id||'';
  const recipient=leads.find(person=>person.id===lookupId),lookupState=recipient?.rocketReachLookup?.state;
  const lookupBlocked=['unknown','no_work_email','complete'].includes(lookupState);
  return <div><details open><summary>Find people at a company</summary><form onSubmit={async e=>{e.preventDefault();if(await action('rocketReachSearch',{company:company.trim(),role:role.trim()}))setChecked([])}}>
    <label>Company<input required value={company} onChange={e=>setCompany(e.target.value)}/></label><label>Role<input required value={role} onChange={e=>setRole(e.target.value)}/></label>
    <button disabled={busy}>Search RocketReach</button>
  </form>{results.length>0&&<div><p>Choose candidates to verify against this brief.</p>{results.map(row=><label className="check" key={row.id}><input type="checkbox" checked={checked.includes(String(row.id))} onChange={e=>setChecked(values=>e.target.checked?[...values,String(row.id)]:values.filter(value=>value!==String(row.id)))}/>{[row.person,row.role,row.company].filter(Boolean).join(' · ')}</label>)}<button disabled={busy||!picked.length} onClick={()=>action('rocketReachImport',{profileIds:picked})}>Verify {picked.length} selected</button></div>}</details>
    {!!leads.length&&<details open={focusLead?true:undefined}><summary>Look up a work email</summary><label>Person<select value={lookupId} onChange={e=>setLeadId(e.target.value)}>{leads.map(person=><option key={person.id} value={person.id}>{person.person} · {person.company}</option>)}</select></label>
      {lookupState==='pending'?<p>RocketReach is processing this lookup.</p>:lookupBlocked?<p>{lookupState==='unknown'?'The last lookup has an uncertain outcome. Review it in RocketReach before trying again.':lookupState==='no_work_email'?'RocketReach returned no work email.':recipient?.email||'Lookup complete.'}</p>:<p><small>One standard email lookup. Your plan may also use one person-export credit.</small></p>}
      {!lookupBlocked&&<button disabled={busy||!lookupId} onClick={()=>action('rocketReachEnrich',{leadId:lookupId})}>{lookupState==='pending'?'Check existing lookup status':'Look up work email · up to 1 lookup'}</button>}</details>}
    {receipt?.message&&<p role="status">{receipt.message}</p>}
    <details><summary>Account settings</summary><button disabled={busy} onClick={()=>onAction('rocketReachDisconnect',{})}>Disconnect RocketReach</button></details>
  </div>;
}
