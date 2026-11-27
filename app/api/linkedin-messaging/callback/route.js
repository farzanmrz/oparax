import {randomBytes} from 'node:crypto';
import {Fault,failure,verifiedUser,withWorkspace} from '../../../../lib/store.mjs';
import {browserCookie,finishLinkedInConnection} from '../../../../lib/linkedin-messaging.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
const privateHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export function GET(){
  // The token remains in this tab's normal app session. The provider does not receive it.
  const nonce=randomBytes(18).toString('base64');
  const script=`(async()=>{const status=document.getElementById('status');const params=new URLSearchParams(location.search);history.replaceState(null,'',location.pathname);try{if(params.has('error'))throw Error('LinkedIn connection was cancelled.');const session=JSON.parse(sessionStorage.getItem('oparax.sales.session')||'null');if(!session?.access)throw Error('Reopen Oparax in the tab where you signed in and connect LinkedIn again.');const res=await fetch(location.pathname,{method:'POST',credentials:'same-origin',headers:{Authorization:'Bearer '+session.access,'Content-Type':'application/json'},body:JSON.stringify({code:params.get('code'),state:params.get('state')})});const result=await res.json();if(!res.ok)throw Error(result.error||'The connection could not be completed.');status.textContent='LinkedIn messaging connected.';location.replace('/?view=drafts');}catch(error){status.textContent=error.message;}})();`;
  return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect LinkedIn · Oparax</title><main><h1>LinkedIn messaging</h1><p role="status" id="status">Finishing your connection…</p><a href="/?view=drafts">Return to Oparax</a></main><script nonce="'+nonce+'">'+script+'</script></html>',{headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}});
}
export async function POST(req){
  try{
    const user=await verifiedUser(req);
    if(req.headers.get('content-type')?.split(';')[0]!=='application/json'||Number(req.headers.get('content-length'))>6000)throw new Fault('Invalid authorization response.',400);
    const raw=await req.text();if(raw.length>6000)throw new Fault('Invalid authorization response.',400);
    let fields;try{fields=JSON.parse(raw);}catch{throw new Fault('Invalid authorization response.',400);}
    if(!fields||typeof fields!=='object')throw new Fault('Invalid authorization response.',400);
    await withWorkspace(user.id,()=>finishLinkedInConnection(req,fields));
    return Response.json({connected:true},{headers:{...privateHeaders,'Set-Cookie':browserCookie+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}});
  }catch(error){return failure(error);}
}
