'use client';
import {useEffect,useRef,useState} from 'react';

const fields=[
  ['company','Company name',180,'Your company or trading name'],
  ['productsServices','Products and services',3000,'What you sell, including specialties or product lines'],
  ['salesProposition','Sales proposition',2500,'What a buyer gains from working with you'],
  ['proof','Proof and references',3500,'Approved references, case studies or figures your bots may cite'],
  ['buyerTargeting','Buyers and markets',2500,'Ideal customers, roles, regions and exclusions'],
  ['voice','Brand voice',1500,'How outreach should sound'],
  ['restrictions','Restrictions',2500,'Claims to avoid and rules your bots should follow']
];
const values=record=>Object.fromEntries(fields.map(([key])=>[key,record?.[key]||'']));
const empty={version:0,updatedAt:null,...values(null)};
export default function BusinessMemory({memory=empty,getToken,onRefresh,isDemo,returnToBot}){
  const [base,setBase]=useState(memory||empty),[draft,setDraft]=useState(()=>values(memory));
  const [conflict,setConflict]=useState(null),[confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const sending=useRef(false),dirty=fields.some(([key])=>draft[key]!==String(base[key]||''));
  useEffect(()=>{
    if((memory?.version||0)<=base.version)return;
    if(dirty){setConflict(memory);return;}
    setBase(memory);setDraft(values(memory));setConfirm(false);
  },[memory?.version,base.version,dirty]);
  function useRevision(latest,keepEdits){
    const next=values(latest);
    if(keepEdits)for(const [key] of fields)if(draft[key]!==String(base[key]||''))next[key]=draft[key];
    setBase(latest);setDraft(next);setConflict(null);setError('');setConfirm(false);setMessage('');
  }
  async function save(clear=false){
    if(isDemo||sending.current||conflict)return;
    sending.current=true;setBusy(true);setError('');setMessage('');
    try{
      const submitted=clear?values(null):Object.fromEntries(fields.filter(([k])=>draft[k]!==String(base[k]||'')).map(([k])=>[k,draft[k]]));
      const res=await fetch('/api/business-memory',{method:'PUT',headers:{Authorization:'Bearer '+await getToken(),'Content-Type':'application/json'},
        body:JSON.stringify({expectedVersion:base.version||0,fields:submitted}),cache:'no-store'});
      const result=await res.json();
      if(res.status===409&&result.memory){setConflict(result.memory);setConfirm(false);return;}
      if(!res.ok||!result.memory)throw Error(result.error||'Business memory could not be saved.');
      useRevision(result.memory,false);setMessage(clear?'Business memory cleared for all bots.':'Business memory saved for all bots.');
      await Promise.resolve(onRefresh?.()).catch(()=>{});
    }catch(e){setError(e.message);}finally{sending.current=false;setBusy(false)}
  }
  return <section className="account-settings" aria-label="Shared business memory">
    <div className="settings-intro"><p>Teach every bot what you sell, who buys it and how your company speaks. Saved details apply across this workspace, including bots you create later.</p>{returnToBot&&<button type="button" onClick={returnToBot}>Return to new bot</button>}</div>
    {isDemo&&<p className="sample-note">Fictional business memory. <a href="/">Sign in to teach your bots</a>.</p>}
    <form className="panel memory-form" onSubmit={e=>{e.preventDefault();save()}}>
      {fields.map(([key,label,max,hint])=><label key={key}>{label}{key==='company'?<input value={draft[key]} maxLength={max} placeholder={hint} readOnly={isDemo} disabled={busy} onChange={e=>{setConfirm(false);setMessage('');setDraft({...draft,[key]:e.target.value})}}/>:
        <textarea rows={2} value={draft[key]} maxLength={max} placeholder={hint} readOnly={isDemo} disabled={busy} onChange={e=>{setConfirm(false);setMessage('');setDraft({...draft,[key]:e.target.value})}}/>}</label>)}
      {!isDemo&&<><div className="settings-actions"><button className="primary" disabled={busy||!!conflict||!dirty}>{busy?'Saving…':'Save business memory'}</button>
        {fields.some(([key])=>base[key])&&<button type="button" disabled={busy||!!conflict} onClick={()=>setConfirm(true)}>Clear business memory</button>}</div>
        {confirm&&<div className="settings-inset"><p>Clear all seven saved fields for every bot in this workspace?</p><div className="settings-actions"><button type="button" disabled={busy} onClick={()=>save(true)}>Clear for all bots</button><button type="button" onClick={()=>setConfirm(false)}>Cancel</button></div></div>}
        {conflict&&<div className="settings-inset" role="alert"><p>Business memory changed in another session. Load that version, or keep your edited fields and review them before saving again.</p><div className="settings-actions"><button type="button" onClick={()=>useRevision(conflict,false)}>Load latest version</button><button type="button" onClick={()=>useRevision(conflict,true)}>Keep my edits</button></div></div>}
        {message&&<p role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}
      </>}
    </form></section>;
}
