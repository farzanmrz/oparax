'use client';
import {useEffect,useImperativeHandle,useRef,useState} from 'react';
import {combineSelectedRows,parseSelectedRows} from './selected-rows.mjs';
import {computerWaitMs,startComputer} from './start-computer.mjs';

const newRow=()=>({key:crypto.randomUUID(),included:true,person:'',role:'',company:'',linkedinUrl:'',sourceUrl:'',salesNavigatorUrl:''});
const labels={linkedin:'LinkedIn',sales_navigator:'Sales Navigator'};

export default function AgentComputer({ref,agent,provider,getToken,onImport,busy}){
  const [opening,setOpening]=useState(false),[starting,setStarting]=useState(false),[error,setError]=useState(''),[opened,setOpened]=useState(false);
  const [fallback,setFallback]=useState(null),[rows,setRows]=useState([]),[importError,setImportError]=useState('');
  const [paste,setPaste]=useState(''),[pasteStatus,setPasteStatus]=useState('');
  const lock=useRef(false),submitting=useRef(false),request=useRef(null),windowRef=useRef(null),formRef=useRef(null);
  useEffect(()=>()=>{request.current?.abort();windowRef.current?.close()},[]);
  useEffect(()=>{
    if(!fallback)return;
    const timeout=setTimeout(()=>setFallback(null),Math.max(0,Date.parse(fallback.expiresAt)-Date.now()));
    return ()=>clearTimeout(timeout);
  },[fallback]);
  async function openDesktop(){
    if(lock.current)return;
    lock.current=true;setOpening(true);setOpened(false);setFallback(null);setError('');
    let tab=null,closeCheck,timeout;
    const controller=new AbortController();request.current=controller;
    try{
      tab=window.open('about:blank','_blank');windowRef.current=tab;
      if(tab){
        tab.opener=null;tab.document.title='Opening agent computer';tab.document.body.textContent='Opening your private agent computer…';
        closeCheck=setInterval(()=>{if(tab.closed)controller.abort(new Error('You closed the desktop tab. Open the agent computer again when ready.'))},600);
      }
      timeout=setTimeout(()=>controller.abort(new Error('Computer startup is taking longer than expected. Open it again to reconnect.')),computerWaitMs);
      const ticket=await startComputer({agentId:agent.id,provider,requestId:crypto.randomUUID(),getToken,signal:controller.signal,onStarting:()=>{
        setStarting(true);
        if(tab&&!tab.closed)tab.document.body.textContent='Preparing your private agent computer. The first startup can take several minutes. Keep this tab open.';
      }});
      if(tab&&!tab.closed){tab.location.replace(ticket.url);setOpened(true);}
      else setFallback(ticket);
      windowRef.current=null;
    }catch(e){
      if(tab&&!tab.closed)tab.close();
      const problem=controller.signal.aborted?controller.signal.reason:e;
      if(problem&&problem.name!=='AbortError')setError(problem.message||'Could not open the agent computer.');
    }finally{
      clearInterval(closeCheck);clearTimeout(timeout);windowRef.current=null;request.current=null;
      lock.current=false;setOpening(false);setStarting(false);
    }
  }
  useImperativeHandle(ref,()=>({open:openDesktop}));
  function updateRow(key,field,value){setRows(items=>items.map(item=>item.key===key?{...item,[field]:value}:item))}
  function pasteRows(){
    try{
      const parsed=parseSelectedRows(paste),merged=combineSelectedRows(rows,parsed,()=>crypto.randomUUID());
      setRows(merged);setPaste('');setImportError('');setPasteStatus('Loaded '+parsed.length+' pasted '+(parsed.length===1?'row':'rows')+'. Review the checked people below.');
    }catch(e){setPasteStatus('');setImportError(e.message)}
  }
  function editHeld(item){
    const values={};for(const key of ['person','role','company','linkedinUrl','sourceUrl','salesNavigatorUrl'])values[key]=typeof item[key]==='string'?item[key]:'';
    try{setRows(combineSelectedRows(rows,[values],()=>crypto.randomUUID()));setImportError('');formRef.current.open=true;requestAnimationFrame(()=>formRef.current?.scrollIntoView({block:'nearest'}))}catch(e){setImportError(e.message)}
  }
  const included=rows.filter(row=>row.included);
  async function submit(e){
    e.preventDefault();if(!included.length||submitting.current)return;submitting.current=true;setImportError('');
    const people=included.map(({key,included,...fields})=>Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.trim()]).filter(([,v])=>v)));
    try{
      if(await onImport(people)){setRows(items=>items.filter(item=>!item.included));setPasteStatus('');}
      else setImportError('These people could not be submitted. Check the workspace message and try again.');
    }finally{submitting.current=false;}
  }
  const neutral=provider==='desktop';
  const receipt=agent.lastSelectedImports?.[provider]||(agent.lastSelectedImport?.source===provider?agent.lastSelectedImport:null);
  return <section className="thread-computer" aria-label={neutral?'Private workspace computer':labels[provider]+' workspace computer'}>
    <div className="row"><h2>{neutral?'Workspace computer':labels[provider]+' in your workspace browser'}</h2>{!neutral&&<button type="button" disabled={opening} onClick={openDesktop}>{starting?'Preparing computer…':opening?'Opening computer…':'Open workspace computer ↗'}</button>}</div>
    {neutral?<p>All your bots open the same private browser.</p>:<p>Your bots share this browser’s LinkedIn session. If LinkedIn asks you to sign in, choose Continue with Google if it appears, or use your LinkedIn email and password. Unlock 1Password in Chrome’s toolbar to save or fill your login.</p>}
    {starting&&<div className="thread-computer-wait" role="status"><p>Your private computer is starting. The first startup can take several minutes.</p><button type="button" onClick={()=>request.current?.abort(new Error('Stopped waiting for the computer. Open it again when ready.'))}>Stop waiting</button></div>}
    {error&&<p className="error" role="alert">{error}</p>}
    {opened&&<p role="status">Your agent computer opened in another tab.</p>}
    {fallback&&<p role="status"><a href={fallback.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={()=>{setOpened(true);setTimeout(()=>setFallback(null),0)}}>Open secure desktop ↗</a></p>}
    {!neutral&&<details ref={formRef} onToggle={e=>{if(e.currentTarget.open&&!rows.length)setRows([newRow()])}}><summary>Add selected people</summary>
      <label>Paste selected people<textarea rows={4} value={paste} maxLength={40000} onChange={e=>setPaste(e.target.value)} placeholder={'Name\tRole\tCompany\tPersonal LinkedIn URL\nMaya Ellis\tBuyer\tExample Co.\thttps://www.linkedin.com/in/profile-name'}/></label>
      <p><small>Paste spreadsheet rows with name, role, company and personal LinkedIn URL, or put those four fields on separate lines for each person. Public evidence and Sales Navigator URLs can follow.</small></p>
      <button type="button" disabled={busy||!paste.trim()} onClick={pasteRows}>Load pasted people</button>
      {pasteStatus&&<p role="status">{pasteStatus}</p>}
      <form onSubmit={submit}>
        {rows.map((row,index)=><fieldset key={row.key}><legend>Person {index+1}</legend><label className="check"><input type="checkbox" checked={row.included} onChange={e=>updateRow(row.key,'included',e.target.checked)}/>Include {row.person||'this person'}</label>
          {[['person','Full name'],['role','Current role'],['company','Current employer'],['linkedinUrl','Personal LinkedIn profile URL'],['sourceUrl','Public employer or role evidence (optional)'],...(provider==='sales_navigator'?[['salesNavigatorUrl','Sales Navigator lead URL (optional)']]:[])].map(([name,label])=><label key={name}>{label}<input type={name.toLowerCase().includes('url')?'url':'text'} disabled={!row.included} required={row.included&&(['person','role','company'].includes(name)||(name==='linkedinUrl'&&(provider!=='sales_navigator'||!row.salesNavigatorUrl)))} value={row[name]} onChange={e=>updateRow(row.key,name,e.target.value)}/></label>)}
          {rows.length>1&&<button type="button" disabled={busy} onClick={()=>setRows(items=>items.filter(item=>item.key!==row.key))}>Remove person {index+1}</button>}
        </fieldset>)}
        <div className="controls"><button type="button" disabled={busy||rows.length>=20} onClick={()=>setRows(items=>[...items,newRow()])}>Add another person</button><button className="primary" disabled={busy||!included.length}>Verify {included.length} selected {included.length===1?'person':'people'}</button></div>
        {importError&&<p className="error" role="alert">{importError}</p>}
      </form>
    </details>}
    {!neutral&&receipt&&<div className="thread-import-receipt" role="status"><strong>Last selection</strong><p>{receipt.received} submitted · {Number.isInteger(receipt.proposed)?<>{receipt.proposed} ready for review · {receipt.existing} previously found</>:<>{receipt.saved} saved · {receipt.existing} already saved</>} · {receipt.held?.length||0} awaiting evidence</p>
    {!!receipt.held?.length&&<details><summary>Review verification issues</summary><ul>{receipt.held.map((item,i)=><li key={i}>{item.person} · {item.reason} <button type="button" disabled={busy} onClick={()=>editHeld(item)}>Edit selection</button></li>)}</ul></details>}</div>}
  </section>;
}
