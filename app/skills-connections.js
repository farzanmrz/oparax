'use client';
import {useRef,useState} from 'react';
import CustomSkills from './custom-skills';
import './skills-connections.css';

const states={
  connected:'Connected',disconnected:'Not connected',configured:'Configured',
  unconfigured:'Not configured',unavailable:'Unavailable',demo:'Sample'
};
function ConnectorActions({item,workspace,onOpen,onAction,getToken,onRefresh,busy}){
  const [key,setKey]=useState(''),[editing,setEditing]=useState(false);
  const [pending,setPending]=useState(false),[error,setError]=useState('');
  const lock=useRef(false);
  const connected=item.status==='connected',disabled=busy||pending;
  async function perform(action){
    if(lock.current)return;
    lock.current=true;setPending(true);setError('');
    try{
      const ok=await action();
      if(ok===false)throw Error('The connection could not be updated. Check the workspace message.');
      setEditing(false);setKey('');
    }catch(e){setError(e.message||'The connection could not be updated.');}
    finally{lock.current=false;setPending(false);}
  }
  async function linkedIn(){
    const response=await fetch('/api/linkedin-messaging/connect',{
      method:connected?'DELETE':'POST',headers:{Authorization:'Bearer '+await getToken()},cache:'no-store'
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||'The LinkedIn connection could not be updated.');
    if(connected){await onRefresh();return;}
    const url=new URL(result.url);
    if(url.origin!=='https://www.linkedin.com'||url.pathname!=='/oauth/v2/authorization')throw Error('The LinkedIn authorization URL is invalid.');
    window.location.assign(url.href);
  }
  let controls;
  if(item.id==='rocketreach')controls=connected?
    <button type="button" disabled={disabled} onClick={()=>perform(()=>onAction('rocketReachDisconnect',{}))}>Disconnect RocketReach</button>:
    editing?<form onSubmit={e=>{e.preventDefault();perform(()=>onAction('rocketReachConnect',{apiKey:key.trim()}))}}>
      <label>RocketReach API key<input type="password" autoComplete="off" required maxLength={600} value={key} onChange={e=>setKey(e.target.value)}/></label>
      <div><button type="submit" disabled={disabled||!key.trim()}>Connect account</button><button type="button" disabled={disabled} onClick={()=>{setEditing(false);setKey('');setError('')}}>Cancel</button></div>
    </form>:<button type="button" disabled={disabled} onClick={()=>setEditing(true)}>Connect RocketReach</button>;
  else if(item.id==='mailbox')controls=<>
    <button type="button" disabled={disabled} onClick={()=>onOpen('connect')}>{connected?'Change mailbox':'Connect mailbox'}</button>
    {connected&&<button type="button" disabled={disabled} onClick={()=>perform(()=>onAction('disconnect',{}))}>Disconnect mailbox</button>}
  </>;
  else if(item.id==='agentmail')controls=<button type="button" disabled={disabled} onClick={()=>onOpen('agentmail')}>{connected?'Change AgentMail key':'Connect AgentMail'}</button>;
  else if(item.id==='linkedin_messaging'&&workspace.linkedinMessaging?.available)controls=<button type="button" disabled={disabled} onClick={()=>perform(linkedIn)}>{connected?'Disconnect LinkedIn messaging':'Connect LinkedIn messaging'}</button>;
  if(!controls)return null;
  return <div className="sales-connector-actions">{controls}{error&&<p role="alert" className="error">{error}</p>}</div>;
}
export default function SkillsConnections({workspace,agent,requestedAgentId,onSelectAgent,getToken,onRefresh,isDemo=false,busy=false,onAction,onOpen,onBackToBot}){
  const bots=workspace.bots||[],connectors=workspace.salesConnectors||[],skills=agent?.salesSkills||[];
  return <section className="sales-settings" aria-label="Skills and connections">
    <div className="panel sales-scope">
      <label>Skill settings for<select value={agent?.id||''} onChange={e=>onSelectAgent(e.target.value||null)}>
        <option value="">Account library</option>{bots.map(bot=><option key={bot.id} value={bot.id}>{bot.name}</option>)}
      </select></label>
      {agent&&onBackToBot&&<button type="button" onClick={()=>onBackToBot(agent.id)}>Back to bot</button>}
      {requestedAgentId&&!agent&&<p role="status">This bot is unavailable in this workspace.</p>}
      {isDemo&&<p>Sample workspace. <a href="/">Sign in to manage your skills and connections</a>.</p>}
    </div>
    <div className="panel"><CustomSkills workspace={workspace} agent={agent} getToken={getToken} onRefresh={onRefresh} isDemo={isDemo}/></div>
    {agent&&<section className="panel" aria-label="Built-in bot skills"><h2>Built-in skills</h2>
      <p>Choose what {agent.name} can do. Each skill uses the connections shown below.</p>
      <ul className="sales-capabilities">{skills.map(skill=><li key={skill.id}>
        <label><input type="checkbox" checked={!!skill.enabled} disabled={isDemo||busy} onChange={e=>onAction('setSalesSkill',{id:agent.id,skill:skill.id,enabled:e.target.checked})}/><strong>{skill.label}</strong></label>
        <p>{skill.description}</p><small>{states[skill.connectorState]||'Unavailable'}</small>
      </li>)}</ul>
    </section>}
    <section className="panel" aria-label="Account connections"><h2>Account connections</h2>
      <ul className="sales-services">{connectors.map(item=><li key={item.id}>
        <div><strong>{item.label}</strong><span className="pill">{states[item.status]||'Unavailable'}</span></div>
        <p>{item.summary}</p>{!isDemo&&<ConnectorActions item={item} workspace={workspace} onOpen={onOpen} onAction={onAction} getToken={getToken} onRefresh={onRefresh} busy={busy}/>}
      </li>)}</ul>
    </section>
  </section>;
}
