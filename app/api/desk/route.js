import {setSalesSkill,requireSkill,skillEnabled} from '../../../lib/sales-skills.mjs';
import {setModelPreference} from '../../../lib/agent-models.mjs';
import {Fault,edit,event,failure,now,verifiedUser,withWorkspace,read,view} from '../../../lib/store.mjs';
import {addLead,bot,createBot,email,lead,note,settings,stop,text} from '../../../lib/domain.mjs';
import {inbox,linkKey} from '../../../lib/agentmail.mjs';
import {visualReview} from '../../../lib/visual.mjs';
import {after} from 'next/server';
import {queueResearch,runResearchBatch} from '../../../lib/research-job.mjs';
import {normalizeSearchSources,selectedSearchSources} from '../../../lib/search-source.mjs';
import {showSourceGate,publicJobAuthorized} from '../../../lib/research-access.mjs';
import {stageSourceTasks,runSourceTask} from '../../../lib/source-tasks.mjs';
import {connect} from '../../../lib/mail.mjs';
import {linkedinProfileUrl} from '../../../lib/profile-url.mjs';
export const runtime='nodejs',maxDuration=300,dynamic='force-dynamic';
async function authenticated(req, action) {
  try {
    const user=await verifiedUser(req);
    return await withWorkspace(user.id,()=>action(user));
  } catch(error) {return failure(error);}
}
async function dashboard(user,metadata={}) {
  return Response.json({...view((await read()).data),userEmail:user.email,...metadata},{headers:{'Cache-Control':'private, no-store'}});
}
function dispatchResearch(uid,id,work,sourceWork=[]) {
  if(!work&&!sourceWork.length)return;
  after(()=>withWorkspace(uid,async()=>{
    const jobs=sourceWork.map(p=>runSourceTask(id,p));
    if(work)jobs.push(runResearchBatch(id,work));
    await Promise.allSettled(jobs);
  }));
}
export function GET(req){return authenticated(req,dashboard);}
export function POST(req){return authenticated(req,async user=>{const raw=await req.text();if(raw.length>20000)throw new Fault('Request is too large.',413);let p;try{p=JSON.parse(raw)}catch{throw new Fault('Invalid request.')};if(!p||typeof p!=='object')throw new Fault('Invalid request.');
 const {action,id}=p;
 if(action==='messageAgent'||action==='chat')throw new Fault('Reload Oparax to open this bot’s current conversation.',410);
 if(action==='importSelectedLeads'){
   const {importSelectedLeads}=await import('../../../lib/selected-leads.mjs');
   await importSelectedLeads(id,p);
 }
 else if(['rocketReachConnect','rocketReachDisconnect','rocketReachSearch','rocketReachImport','rocketReachEnrich'].includes(action)){
   const {rocketReachAction}=await import('../../../lib/rocketreach.mjs');await rocketReachAction(id||p.agentId,p);
   if(action==='rocketReachConnect'&&(id||p.agentId)){const agentId=id||p.agentId;const tasks=await edit(d=>stageSourceTasks(d,bot(d,agentId)));dispatchResearch(user.id,agentId,null,tasks);}
 }
 else if(action==='agentmail')await linkKey(p.key);
 else if(['inboxCreate','inboxSync','inboxReply'].includes(action))await inbox(id,action,p);
 else if(action==='visual')await visualReview(id);
 else if(action==='research'||action==='clarifyResearch'){
   const request=await edit(d=>{
     const b=bot(d,id);

     if(action==='clarifyResearch'){
       const question=b.lastRun?.question,answer=text(p.answer,1500);
       if(!question||question!==p.question||b.researchRequestedAt)throw new Fault('This research question has changed. Refresh the agent to see the latest run.',409);
       if(!answer)throw new Fault('Enter an answer so the agent can continue.');
       b.clarifications=[...(b.clarifications||[]),{question,answer}].slice(-12);
       note(d,id,'user',answer);
     }else if(b.lastRun?.status==='needs_input'&&!b.researchRequestedAt){
       throw new Fault(b.lastRun.question||'Answer the research question to continue.',409);
     }
     const sourceWork=stageSourceTasks(d,b);
     if(!selectedSearchSources(b).includes('web')||!skillEnabled(b,'public_research')){showSourceGate(d,b);return {sourceWork};}
     if(b.lease&&Date.parse(b.lease.until)>Date.now())return {sourceWork};
     delete b.searchGate;
     const requestedAt=queueResearch(b,{resume:action==='clarifyResearch'||b.researchJob?.status==='paused_skill'});
     if(b.researchJob)b.researchJob.searchSource='web';
     return {work:{requestedAt,page:b.researchJob?.pages||0},sourceWork};
   });
   if(request)dispatchResearch(user.id,id,request.work,request.sourceWork);
 }
 else if(action==='connect')await connect(p);
 else await edit(d=>{switch(action){
 case 'setSalesSkill':{setSalesSkill(d,bot(d,id),p.skill,p.enabled);break;}
 case 'setModelPreference':{setModelPreference(d,bot(d,id),p.modelPreference);break;}
 case 'create':{const created=bot(d,createBot(d,p));if(p.modelPreference!==undefined)setModelPreference(d,created,p.modelPreference);const sources=normalizeSearchSources(p.searchSources??p.searchSource);if(sources.length){created.searchSource=sources[0];created.searchSources=sources;}break;}
 case 'save':{
   const b=bot(d,id),next=settings(p);
   if(b.brief!==next.brief){
     if(b.researchRequestedAt||(b.lease&&Date.parse(b.lease.until)>Date.now()))throw new Fault('Wait for the current run before changing its brief.',409);
     delete b.sourceTask;delete b.lastRun;delete b.researchJob;delete b.researchWake;delete b.clarifications;b.error=null;
   }
   Object.assign(b,next);event(d,'Updated '+b.name);break
 }
 case 'activate':{const b=bot(d,id);if(p.autoEmail===true)requireSkill(b,'email_delivery');if(p.autoEmail===true&&!d.mailbox)throw new Fault('Connect a mailbox before enabling email.');b.active=true;b.autoEmail=p.autoEmail===true;b.next=now();stageSourceTasks(d,b);if(!selectedSearchSources(b).includes('web')||!skillEnabled(b,'public_research'))showSourceGate(d,b);event(d,b.name+' · campaign activated');break}
 case 'pause':{const b=bot(d,id);b.active=false;b.autoEmail=false;event(d,'Paused '+b.name);break}
 case 'manual':{const b=bot(d,id);if(p.linkedinUrl&&(!text(p.person)||!linkedinProfileUrl(p.linkedinUrl)))throw new Fault('A LinkedIn profile needs a contact name and an HTTPS linkedin.com/in/ profile link.');if(p.email&&!email(p.email))throw new Fault('Enter a valid email.');if(!addLead(d,b,{...p,companyVerification:null,linkedinEvidence:''}))throw new Fault('This prospect already exists.',409);event(d,'Added '+text(p.company,150));break}
 case 'draft':{const l=lead(d,id);requireSkill(bot(d,l.botId),'draft_outreach');if(l.linkedinState==='sent')throw new Fault('This note was already marked sent.');if(!text(p.linkedin,1500))throw new Fault('Write a LinkedIn note first.');l.linkedin=text(p.linkedin,1500);break}
 case 'linked':{const l=lead(d,id);if(l.linkedinState==='sent')return;l.linkedinState='sent';event(d,l.company+' · LinkedIn marked sent');break}
 case 'suppress':stop(d,lead(d,id),'stopped');break;
 case 'disconnect':d.mailbox=null;for(const b of d.bots)b.autoEmail=false;event(d,'Mailbox disconnected');break;
 default:throw new Fault('Unknown action.')
 }});
 return dashboard(user);});}
