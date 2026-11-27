import {edit,leaveToken,same,read} from '../../../lib/store.mjs';
import {stop} from '../../../lib/domain.mjs';
function valid(req){const u=new URL(req.url),id=u.searchParams.get('id')||'';return /^[a-f\d-]{36}$/i.test(id)&&same(u.searchParams.get('t'),leaveToken(id))?id:null}
export async function GET(req){if(!valid(req))return new Response('Invalid unsubscribe link.',{status:400});return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Unsubscribe · Oparax</title><main><h1>Stop outreach emails</h1><form method="post"><button>Unsubscribe</button></form></main></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}
export async function POST(req){const id=valid(req);if(!id)return new Response('Invalid link.',{status:400});await edit(d=>{const l=d.leads.find(x=>x.id===id);if(l&&l.status!=='stopped')stop(d,l,'stopped')});return new Response('You have been unsubscribed.')}
