import {Fault,edit,event,failure,now,verifiedUser,withWorkspace,read,view} from '../../../lib/store.mjs';
import {addLead,bot,createBot,email,lead,settings,stop,text} from '../../../lib/domain.mjs';
import {inbox,linkKey} from '../../../lib/agentmail.mjs';
import {visualReview} from '../../../lib/visual.mjs';
import {chat,research} from '../../../lib/agent.mjs';
import {connect} from '../../../lib/mail.mjs';
export const runtime='nodejs',maxDuration=300,dynamic='force-dynamic';
async function authenticated(req, action) {
  try {
    const user=await verifiedUser(req);
    return await withWorkspace(user.id,()=>action(user));
  } catch(error) {return failure(error);}
}
async function dashboard(user) {
  return Response.json({...view((await read()).data),userEmail:user.email},{headers:{'Cache-Control':'private, no-store'}});
}
export function GET(req){return authenticated(req,dashboard);}
export function POST(req){return authenticated(req,async user=>{const raw=await req.text();if(raw.length>20000)throw new Fault('Request is too large.',413);let p;try{p=JSON.parse(raw)}catch{throw new Fault('Invalid request.')};if(!p||typeof p!=='object')throw new Fault('Invalid request.');
 const {action,id}=p;
 if(action==='agentmail')await linkKey(p.key);
 else if(['inboxCreate','inboxSync','inboxReply'].includes(action))await inbox(id,action,p);
 else if(action==='visual')await visualReview(id);
 else if(action==='research')await research(id);
 else if(action==='chat'){if(!text(p.message,2000))throw new Fault('Write a message first.');await chat(id,text(p.message,2000))}
 else if(action==='connect')await connect(p);
 else await edit(d=>{switch(action){
 case 'create':createBot(d,p);break;
 case 'save':{const b=bot(d,id);Object.assign(b,settings(p));event(d,'Updated '+b.name);break}
 case 'activate':{const b=bot(d,id);if(p.autoEmail===true&&!d.mailbox)throw new Fault('Connect a mailbox before enabling email.');b.active=true;b.autoEmail=p.autoEmail===true;b.next=now();event(d,b.name+' · campaign activated');break}
 case 'pause':{const b=bot(d,id);b.active=false;b.autoEmail=false;event(d,'Paused '+b.name);break}
 case 'manual':{const b=bot(d,id);if(p.email&&!email(p.email))throw new Fault('Enter a valid email.');if(!addLead(d,b,p))throw new Fault('This prospect already exists.',409);event(d,'Added '+text(p.company,150));break}
 case 'draft':{const l=lead(d,id);if(l.linkedinState==='sent')throw new Fault('This note was already marked sent.');if(!text(p.linkedin,1500))throw new Fault('Write a LinkedIn note first.');l.linkedin=text(p.linkedin,1500);break}
 case 'linked':{const l=lead(d,id);if(l.linkedinState==='sent')return;l.linkedinState='sent';event(d,l.company+' · LinkedIn marked sent');break}
 case 'suppress':stop(d,lead(d,id),'stopped');break;
 case 'disconnect':d.mailbox=null;for(const b of d.bots)b.autoEmail=false;event(d,'Mailbox disconnected');break;
 default:throw new Fault('Unknown action.')
 }});
 return dashboard(user);});}
