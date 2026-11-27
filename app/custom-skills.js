'use client';

import {useEffect,useRef,useState} from 'react';
import './custom-skills.css';

const empty=[];
const freshDraft=()=>({id:crypto.randomUUID(),name:'',instructions:'',version:0});

export default function CustomSkills({workspace,agent,getToken,onRefresh,isDemo=false}){
  const saved=workspace?.customSkills||empty,attached=agent?.customSkillIds||empty;
  const [library,setLibrary]=useState(saved),[draft,setDraft]=useState(null);
  const [selection,setSelection]=useState(null),[removing,setRemoving]=useState(null);
  const [status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const lock=useRef(false);
  useEffect(()=>{setLibrary(saved)},[saved]);
  useEffect(()=>{setSelection(null);setDraft(null);setRemoving(null);setError('');setStatus('')},[agent?.id]);
  const selected=selection?.wanted||attached;
  function toggle(id){
    setSelection(previous=>{
      const current=previous?.wanted||attached;
      return {expected:previous?.expected||[...attached],wanted:current.includes(id)?current.filter(other=>other!==id):[...current,id]};
    });
  }
  async function mutate(payload,success){
    if(lock.current||isDemo)return;
    lock.current=true;setBusy(true);setError('');setStatus('');
    try{
      const res=await fetch('/api/custom-skills',{method:'POST',headers:{Authorization:'Bearer '+await getToken(),'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await res.json();
      if(!res.ok){
        if(res.status===409)await onRefresh?.();
        throw Error(data.error||'Could not update sales skills.');
      }
      setLibrary(data.customSkills);setDraft(null);setRemoving(null);setSelection(null);setStatus(success);
      try{await onRefresh?.()}catch{setStatus(success+' Refresh to see the latest workspace.');}
    }catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}
  }
  function edit(skill){setDraft({...skill});setRemoving(null);setStatus('');setError('')}
  return <section className="custom-skills" aria-label="Custom sales skills">
    <div className="custom-skills-heading"><div><h3>Custom sales skills</h3><p>{agent?'Choose which instructions this bot uses when researching and drafting.':'Save reusable instructions for how your bots should sell. Assign them to individual bots.'}</p></div>
      {!isDemo&&!draft&&<button type="button" onClick={()=>edit(freshDraft())}>New skill</button>}
    </div>
    {!library.length&&!draft&&<p className="custom-skills-empty">{isDemo?'The sample workspace has no custom skills.':'No custom skills saved yet.'}</p>}
    {!!library.length&&<ul>{library.map(skill=><li key={skill.id}>
      <div className="custom-skills-row">
        {agent?<label><input type="checkbox" checked={selected.includes(skill.id)} disabled={busy||isDemo} onChange={()=>toggle(skill.id)}/><strong>{skill.name}</strong></label>:<strong>{skill.name}</strong>}
        {!isDemo&&<button type="button" disabled={busy} onClick={()=>edit(skill)}>Edit<span className="custom-skills-sr"> {skill.name}</span></button>}
      </div>
      <details><summary>Read instructions</summary><p className="custom-skills-text">{skill.instructions}</p></details>
    </li>)}</ul>}
    {agent&&selection&&!isDemo&&<div className="custom-skills-actions"><button type="button" className="primary" disabled={busy} onClick={()=>mutate({action:'assign',agentId:agent.id,skillIds:selection.wanted,expectedSkillIds:selection.expected},'Skills updated for '+agent.name+'.')}>Apply to this bot</button><button type="button" disabled={busy} onClick={()=>setSelection(null)}>Cancel</button></div>}
    {draft&&<form onSubmit={e=>{e.preventDefault();mutate({action:'save',id:draft.id,name:draft.name,instructions:draft.instructions,expectedVersion:draft.version},draft.version?'Updated the shared skill.':'Skill saved to this workspace.')}}>
      <label>Skill name<input required maxLength={96} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="First introduction to a retail buyer"/></label>
      <label>Instructions<textarea required rows={6} maxLength={4000} value={draft.instructions} onChange={e=>setDraft({...draft,instructions:e.target.value})} placeholder="Describe when to use this skill, what to check, and how to write the outreach."/></label>
      {draft.version>0&&<small>Edits apply to every bot using this skill.</small>}
      <div className="custom-skills-actions"><button type="submit" className="primary" disabled={busy||!draft.name.trim()||!draft.instructions.trim()}>Save skill</button><button type="button" disabled={busy} onClick={()=>{setDraft(null);setRemoving(null);setError('')}}>Cancel</button>
        {draft.version>0&&removing!==draft.id&&<button type="button" disabled={busy} onClick={()=>setRemoving(draft.id)}>Remove skill</button>}
      </div>
      {removing===draft.id&&<div className="custom-skills-actions"><span>Remove this skill from the workspace and its bots?</span><button type="button" disabled={busy} onClick={()=>mutate({action:'remove',id:draft.id,expectedVersion:draft.version},'Skill removed.')}>Confirm removal</button></div>}
    </form>}
    {error&&<p className="error" role="alert">{error}</p>}
    {status&&<p role="status">{status}</p>}
  </section>
}
