function note(botId,role,content,at){return {id:crypto.randomUUID(),botId,role,content,at}}

export function runSample(workspace,at,agentId=workspace.bots[0].id){
  const lead=workspace.sampleLeads?.find(item=>item.botId===agentId)||{...workspace.sampleLead,id:'sample-'+agentId,botId:agentId};
  const exists=workspace.leads.some(item=>item.id===lead.id);
  const summary=exists?`${lead.person} is already in this conversation’s sample prospects.`:`I found ${lead.person}, ${lead.role} at ${lead.company}, in the fictional staff profile. I prepared a first outreach draft for your review.`;
  return {...workspace,
    bots:workspace.bots.map(item=>item.id===agentId?{...item,last:at,lastRun:{status:exists?'duplicates':'saved',summary,at,sampleSteps:[
      'Read the fictional staff profile for '+lead.company+'.',
      'Matched '+lead.person+' to the role of '+lead.role+'.',
      exists?'Kept the existing sample prospect.':'Saved the sample prospect and their outreach drafts.'
    ]}}:item),
    leads:exists?workspace.leads:[{...lead},...workspace.leads],
    messages:[...workspace.messages,note(agentId,'assistant',summary,at)],
    events:[{id:crypto.randomUUID(),text:summary,at},...workspace.events]
  };
}
export function sampleMessage(workspace,{id,message,requestId,searchSource},at){
  const agentId=id||'demo-'+requestId;
  const original=workspace.bots.find(b=>b.id===agentId);
  if(workspace.messages.some(m=>m.requestId===requestId))return {...workspace,agentId};
  const agent=original||{...workspace.bots[0],id:agentId,name:message.split(/\s+/).slice(0,5).join(' ').slice(0,48),
    brief:message,searchSource:null,lastRun:null,last:null,active:false,autoEmail:false};
  const userMessage={...note(agentId,'user',message,at),requestId};
  let next={...workspace,agentId,bots:original?workspace.bots:[...workspace.bots,agent],messages:[...workspace.messages,userMessage]};
  const lead=next.leads.find(l=>l.botId===agentId);
  let reply;
  if(!original)reply='I created this sample agent. Where should I search for this audience?';
  else if(searchSource){
    next.bots=next.bots.map(b=>b.id===agentId?{...b,searchSource}:b);
    if(searchSource==='web')return runSample(next,at,agentId);
    reply='This source needs your signed-in agent computer. Sign in to Oparax to connect a real account, or choose Public web to try the fictional sample.';
  }
  else if(/status|progress|how many|update me/i.test(message))reply=lead?`This conversation has a sample prospect, ${lead.person} at ${lead.company}. Their draft is ready to review.`:'The sample account is ready to research. Choose “Run sample research” to look up its buyer.';
  else if(/draft|introduction|write/i.test(message))reply=lead?(message.toLowerCase().includes('email')?lead.subject+'\n\n'+lead.body:lead.linkedin):'Run the sample research first. I can prepare a draft for the person it finds.';
  else if(/update the target|instead|change the target|refine/i.test(message)){
    next.bots=next.bots.map(b=>b.id===agentId?{...b,brief:message}:b);
    reply='Saved your revised demo brief. This walkthrough uses a fixed fictional account. Sign in to research that target live.';
  }else if(/research|buyer|find|sourcing|search/i.test(message)){
    if(agent.searchSource==='web'||!Object.hasOwn(agent,'searchSource'))return runSample(next,at,agentId);
    reply=agent.searchSource?'This source requires a real signed-in agent computer. Switch to Public web to use this fictional sample.':'Where should I search for this audience?';
  }
  else reply='In this local demo I can research the fictional account, report progress, or prepare a draft for its buyer.';
  const answered=note(agentId,'assistant',reply,at);
  if(!original||reply==='Where should I search for this audience?')answered.details={type:'sourceChoice'};
  if(searchSource&&searchSource!=='web')answered.details={type:'browserConnection'};
  if(original&&lead&&/draft|introduction|write/i.test(message)){
    const isEmail=/email/i.test(message);
    const draft={id:'draft-'+requestId,botId:agentId,at,channel:isEmail?'email':'linkedin',...(isEmail?{subject:lead.subject,body:lead.body}:{linkedin:lead.linkedin})};
    next.leads=next.leads.map(person=>person.id===lead.id?{...person,reviewDrafts:[draft,...(person.reviewDrafts||[])]}:person);
    answered.details={...draft,type:'prospectDraft',prospectId:lead.id,person:lead.person,company:lead.company};
  }
  return {...next,messages:[...next.messages,answered]};
}
