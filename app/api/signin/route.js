import {dbUrl,pubKey,OWNER} from '../../../lib/store.mjs';
export async function POST(req){let p;try{p=await req.json()}catch{return new Response(null,{status:400})}
 if(typeof p?.email!=='string'||p.email.trim().toLowerCase()!==OWNER.toLowerCase())return Response.json({error:'Use the email address assigned to this private workspace.'},{status:403});
 const r=await fetch(dbUrl()+'/auth/v1/otp?redirect_to='+encodeURIComponent('https://oparax.ai/'),{method:'POST',headers:{apikey:pubKey(),'Content-Type':'application/json'},body:JSON.stringify({email:OWNER,create_user:true}),cache:'no-store'});
 if(!r.ok)return Response.json({error:r.status===429?'Wait a minute before requesting another link.':'Sign-in email could not be sent. Check the project email settings.'},{status:r.status===429?429:503});return Response.json({ok:true})}
