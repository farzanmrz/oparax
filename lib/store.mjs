import {createCipheriv,createDecipheriv,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
export const OWNER=process.env.OUTREACH_OWNER_EMAIL || 'farzan@oparax.ai';
export const serviceKey=()=>process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const dbUrl=()=>process.env.NEXT_PUBLIC_SUPABASE_URL;
export const pubKey=()=>process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export class Fault extends Error{constructor(message,status=400){super(message);this.status=status}}
export const now=()=>new Date().toISOString();
export function same(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length && timingSafeEqual(x,y)}
function key(purpose){if(!serviceKey())throw new Fault('Database credential is missing.',503);return createHmac('sha256',serviceKey()).update('oparax-outreach-v1/'+purpose).digest()}
export function seal(value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key('mailbox'),iv),data=Buffer.concat([c.update(value,'utf8'),c.final()]);return [iv,c.getAuthTag(),data].map(v=>v.toString('base64url')).join('.')}
export function unseal(value){const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64url'));const c=createDecipheriv('aes-256-gcm',key('mailbox'),iv);c.setAuthTag(tag);return Buffer.concat([c.update(data),c.final()]).toString()}
export function leaveToken(id){return createHmac('sha256',key('unsubscribe')).update(id).digest('base64url')}
export async function rpc(name,body={}){const secret=serviceKey();if(!secret||!dbUrl())throw new Fault('Database configuration is unavailable.',503);
const res=await fetch(dbUrl()+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:secret,...(secret.startsWith('eyJ')?{Authorization:'Bearer '+secret}:{}),'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)});
if(!res.ok)throw new Fault('Workspace storage is unavailable ('+res.status+').',503);return res.json()}
export const read=()=>rpc('outreach_read');
export async function edit(change){for(let attempt=0;attempt<12;attempt++){const {rev,data}=await read();const result=change(data);if(await rpc('outreach_save',{expected:rev,next_data:data}))return result}throw new Fault('Workspace changed during this action. Try again.',409)}
export function event(d,text){d.events.unshift({id:crypto.randomUUID(),at:now(),text});d.events=d.events.slice(0,350)}
export function view(d){const {mailbox,suppressed,agentMailKey,tick,...rest}=d;return {...rest,agentMailConnected:!!agentMailKey,mailbox:mailbox?{email:mailbox.email,address:mailbox.address}:null}}
export async function owner(req){const token=req.headers.get('authorization')||'';if(!/^Bearer [^ ]+$/.test(token))throw new Fault('Sign in to your workspace.',401);
const r=await fetch(dbUrl()+'/auth/v1/user',{headers:{apikey:pubKey(),authorization:token},cache:'no-store'});if(!r.ok)throw new Fault('Please sign in again.',401);const u=await r.json();if(!u.email_confirmed_at||u.email?.toLowerCase()!==OWNER.toLowerCase())throw new Fault('This is a private workspace.',403);return u}
export function failure(e){if(!e.status)console.error('Outreach operation failed',e.name);return Response.json({error:e.status?e.message:'The operation could not finish. Please try again.'},{status:e.status||500})}
