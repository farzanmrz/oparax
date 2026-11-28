import {Fault} from './store.mjs';
import {linkedinMessagingState} from './linkedin-messaging.mjs';
import {discoverySource,selectedSearchSources} from './search-source.mjs';
import {queueResearch} from './research-job.mjs';

const definitions=[
  ['public_research','Public web research','Find people using indexed professional profiles and independent employer evidence.','web'],
  ['linkedin_research','LinkedIn research','Find matching people from publicly indexed LinkedIn profiles and check their employer and role.','web'],
  ['sales_navigator_research','Sales Navigator research','Check private leads you add from Sales Navigator.','computer'],
  ['rocketreach_research','RocketReach research','Search the directory and enrich eligible verified contacts.','rocketreach'],
  ['mailbox_research','Mailbox research','Find correspondents inside an authorized company, domain and time window.','mailbox'],
  ['draft_outreach','Outreach drafting','Write and edit personalized email and LinkedIn drafts.','ai'],
  ['email_delivery','Email delivery','Deliver email through the assigned AgentMail inbox or connected SMTP account.','email'],
  ['linkedin_delivery','LinkedIn messaging','Send reviewed messages through an approved LinkedIn Messaging account.','linkedin_messaging'],
  ['computer_use','Private computer','Open your shared workspace browser and review public sources.','computer']
];
const skills=new Map(definitions.map(([id,label,description,connector])=>[id,{id,label,description,connector}]));
const sourceSkill=Object.freeze({web:'public_research',linkedin:'linkedin_research',sales_navigator:'sales_navigator_research',rocketreach:'rocketreach_research',email:'mailbox_research'});
export const skillForSource=source=>Object.hasOwn(sourceSkill,source)?sourceSkill[source]:null;
export function skillEnabled(b,key){return skills.has(key)&&b?.skillSettings?.[key]!==false;}
export function requireSkill(b,key){
  if(!skillEnabled(b,key))throw new Fault((skills.get(key)?.label||'This skill')+' is disabled for this agent. Enable it in the agent’s skills to continue.',403);
  return b;
}
export function sourceSkillEnabled(b,source){return skillEnabled(b,skillForSource(source));}
export function salesConnectors(d) {
  const ai=!!(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN);
  const vm=!!(process.env.VERCEL_OIDC_TOKEN||process.env.VERCEL_TOKEN&&process.env.VERCEL_TEAM_ID&&process.env.VERCEL_PROJECT_ID);
  const li=linkedinMessagingState(d),mail=!!d.mailbox?.id,inbox=!!d.agentMailKey;
  const item=(id,label,status,summary)=>({id,label,status,summary});
  return [
    item('ai','AI Gateway',ai?'configured':'unconfigured',ai?'Model gateway credentials are configured.':'Configure the model gateway.'),
    item('web','Public search',ai?'configured':'unconfigured',ai?'Public search uses the configured model gateway.':'Configure the model gateway for web search.'),
    item('computer','Agent computer',vm?'configured':'unconfigured',vm?'Your bots share one private workspace browser.':'Configure Vercel Sandbox credentials.'),
    item('rocketreach','RocketReach',d.rocketReach?.key?'connected':'disconnected',d.rocketReach?.key?'Your bots can use the connected directory account.':'Connect your RocketReach account once for this workspace.'),
    item('mailbox','Connected mailbox',mail?'connected':'disconnected',mail?'An IMAP/SMTP mailbox is connected.':'Connect an IMAP/SMTP mailbox.'),
    item('agentmail','AgentMail',inbox?'connected':'disconnected',inbox?'An AgentMail account is connected.':'Connect AgentMail to provision agent inboxes.'),
    item('linkedin_messaging','LinkedIn Messaging',li.connected?'connected':li.available?'disconnected':'unavailable',li.connected?'The authorized Messaging account is connected.':li.available?'Authorize the approved Messaging application.':'An approved LinkedIn Messaging integration is required.')
  ];
}
export function salesSkills(d,b){
  const connectors=Object.fromEntries(salesConnectors(d).map(c=>[c.id,c.status]));
  const emailReady=!!(d.mailbox?.id||d.agentMailKey&&b.inbox?.id);
  return [...skills.values()].map(item=>({...item,...(item.connector==='email'||item.id==='mailbox_research'?{connector:d.agentMailKey&&b.inbox?.id?'agentmail':'mailbox'}:{}),enabled:skillEnabled(b,item.id),connectorState:
    item.connector==='email'||item.id==='mailbox_research'?emailReady?'connected':'disconnected':connectors[item.connector]}));
}
export function setSalesSkill(d,b,key,enabled) {
  if(!skills.has(key)||typeof enabled!=='boolean')throw new Fault('Choose a built-in skill and its enabled state.');
  if(skillEnabled(b,key)===enabled)return;
  const previousSource=discoverySource(b);
  b.skillSettings={...b.skillSettings,[key]:enabled};
  const nextSource=discoverySource(b);
  // Pre-source-picker jobs ran on the public web and may have no stored source.
  const legacyWeb=!Array.isArray(b.searchSources)&&!selectedSearchSources(b).length&&key==='public_research'&&!enabled;
  if((previousSource!==nextSource||legacyWeb)&&(b.researchRequestedAt||b.lease)){
    if(b.lease&&Date.parse(b.lease.until)>Date.now()&&!b.lease.supersededWorker)b.lease={id:crypto.randomUUID(),until:b.lease.until,supersededWorker:b.lease.id};
    const wasRequested=!!b.researchRequestedAt;
    delete b.researchRequestedAt;delete b.researchWake;
    if(wasRequested&&nextSource){
      // Start a fresh search. Candidates from the old scope must not enter the new run.
      if(b.researchJob)b.researchJob.status='superseded';
      queueResearch(b);
      b.researchJob.searchSource=nextSource;
      b.lastRun={at:new Date().toISOString(),status:'queued',summary:'Research is queued with the enabled sources.'};
    }else if(wasRequested&&b.researchJob){
      b.researchJob.status='paused_skill';
      b.lastRun={...b.lastRun,status:'paused_skill',summary:'Research paused because its search skill was disabled.'};
    }
  }
  const provider=key==='mailbox_research'?'email':key==='rocketreach_research'?'rocketreach':null;
  const task=provider&&b.sourceTask?.providers?.[provider];
  if(!enabled&&task&&['queued','running'].includes(task.status)){task.status='paused_skill';delete task.until;}
  if(enabled&&task?.status==='paused_skill')task.status='queued';
}
