import {createHash} from 'node:crypto';
import {dbUrl,pubKey,rpc,Fault,failure} from '../../../lib/store.mjs';

export async function POST(req) {
  try {
    const input = await req.json().catch(() => null);
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) {
      throw new Fault('Enter a valid email address.');
    }
    const digest = createHash('sha256').update(email).digest('hex');
    const claim = await rpc('outreach_signin_claim', {digest});
    if (claim === 'accepted') return Response.json({ok:true});
    if (claim !== 'claimed') throw new Fault('A sign-in request is already in progress. Check your email in a moment.',429);
    let accepted = false;
    try {
      const endpoint = new URL(dbUrl()+'/auth/v1/otp');
      endpoint.searchParams.set('redirect_to','https://oparax.ai/');
      const response = await fetch(endpoint, {
        method:'POST', headers:{apikey:pubKey(),'Content-Type':'application/json'},
        body:JSON.stringify({email,create_user:true}), cache:'no-store',signal:AbortSignal.timeout(18000)
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.warn('Sign-in email request failed',response.status,String(error.code||'unknown').slice(0,80));
        if (response.status === 429) throw new Fault('Too many sign-in requests. Please wait before requesting a new link.',429);
        if (error.code === 'email_address_invalid') throw new Fault('Check the spelling of the email address.');
        throw new Fault('The email provider could not accept the request. Try again shortly.',503);
      }
      accepted = true;
    } finally {
      await rpc('outreach_signin_finish',{digest,ok:accepted});
    }
    return Response.json({ok:true});
  } catch (error) {return failure(error);}
}
