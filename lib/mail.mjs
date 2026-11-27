import nodemailer from 'nodemailer';
import {ImapFlow} from 'imapflow';
import {Fault,edit,event,leaveToken,now,read,workspaceId,seal,unseal} from './store.mjs';
import {bot,canSend,claimMail,email,lead,stop,text} from './domain.mjs';
const profiles={gmail:['smtp.gmail.com','imap.gmail.com'],yahoo:['smtp.mail.yahoo.com','imap.mail.yahoo.com'],icloud:['smtp.mail.me.com','imap.mail.me.com']};
function clients(m){const [smtp,imap]=profiles[m.provider];const auth={user:m.email,pass:unseal(m.secret)};
 return {smtp:nodemailer.createTransport({host:smtp,port:465,secure:true,auth,connectionTimeout:10000,socketTimeout:15000}),
 imap:new ImapFlow({host:imap,port:993,secure:true,auth,logger:false,connectionTimeout:10000,socketTimeout:20000})}}
export async function connect(input){const addr=email(input.email),address=text(input.address,240),pw=text(input.password,180);if(!profiles[input.provider]||!addr||!pw||!address)throw new Fault('Enter your provider, mailbox, app password and business mailing address.');
 const m={id:crypto.randomUUID(),email:addr,address,provider:input.provider,secret:seal(pw),connected:now()};const c=clients(m);try{await c.smtp.verify();await c.imap.connect();await c.imap.mailboxOpen('INBOX',{readOnly:true});m.uid=Number(c.imap.mailbox.uidNext)-1;m.validity=String(c.imap.mailbox.uidValidity)}catch{throw new Fault('The mailbox rejected the connection. Check the address, app password and IMAP access.')}finally{c.smtp.close();await c.imap.logout().catch(()=>{})}
 await edit(d=>{if(d.mailbox)throw new Fault('Disconnect the current mailbox before replacing it.',409);d.mailbox=m;event(d,'Connected '+addr)})}
export async function scanInbox(){const {data}=await read();const m=data.mailbox;if(!m)return false;const c=clients(m);let found=[],uid=m.uid,validity=m.validity,more=false;
 try{await c.imap.connect();await c.imap.mailboxOpen('INBOX',{readOnly:true});const next=Number(c.imap.mailbox.uidNext);if(String(c.imap.mailbox.uidValidity)!==validity)throw new Fault('Mailbox identifiers changed. Reconnect before resuming email.',409);
 if(next>uid+1){const end=Math.min(next-1,uid+200);more=end<next-1;for await(const msg of c.imap.fetch((uid+1)+':'+end,{uid:true,envelope:true},{uid:true})){const from=msg.envelope?.from?.map(f=>email(f.address)).filter(Boolean)||[];found.push(...from)}uid=end}
 }catch(e){throw new Fault(e.status?e.message:'Inbox sync failed. Sending is paused until sync succeeds.',503)}finally{c.smtp.close();await c.imap.logout().catch(()=>{})}
 return edit(d=>{if(d.mailbox?.id!==m.id)return false;for(const l of d.leads)if(found.includes(l.email)&&!['replied','stopped'].includes(l.status))stop(d,l,'replied');d.mailbox.uid=Math.max(d.mailbox.uid,uid);return !more})}
export async function deliverOne(){const item=await edit(d=>{for(const b of d.bots)for(const l of d.leads){const attempt=claimMail(d,b,l);if(attempt)return {l:{...l},attempt,m:d.mailbox}}return null});if(!item)return false;
 const {l,m,attempt}=item;const fresh=(await read()).data;const b=bot(fresh,l.botId),current=lead(fresh,l.id);
 if(fresh.mailbox?.id!==m.id||!b.active||!b.autoEmail||current.status!=='sending'||current.attempt!==attempt||fresh.suppressed.includes(l.email)){await edit(d=>{const x=lead(d,l.id);if(x.status==='sending'&&x.attempt===attempt)x.status=x.stage?'sent':'queued'});return false}
 const uid=workspaceId();const url='https://oparax.ai/api/leave?w='+uid+'&id='+l.id+'&t='+leaveToken(uid+'/'+l.id);const {smtp}=clients(m);
 try{await smtp.sendMail({from:m.email,to:l.email,subject:(l.stage?'Re: ':'')+l.subject,text:(l.stage?'Following up on my note about '+l.subject+'. Is this relevant for your team?':l.body)+'\n\n'+m.email+'\n'+m.address+'\nUnsubscribe: '+url,messageId:'<'+attempt+'@'+m.email.split('@')[1]+'>',headers:{'List-Unsubscribe':'<'+url+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}})}
 catch{await edit(d=>{const x=lead(d,l.id);if(x.attempt===attempt&&x.status==='sending')x.status='needs review';event(d,l.company+' · verify delivery in Sent before taking further action')});return false}finally{smtp.close()}
 await edit(d=>{const x=lead(d,l.id);if(x.attempt!==attempt)return;x.stage++;if(x.status==='sending')x.status=x.stage>=2?'complete':'sent';x.due=new Date(Date.now()+bot(d,x.botId).delay*86400000).toISOString();event(d,l.company+' · email '+x.stage+' sent')});return true}
export async function tickMail(){const d=(await read()).data;if(!d.mailbox)return;if(!await scanInbox())return;
 for(let i=0;i<5;i++)if(!await deliverOne())break}
