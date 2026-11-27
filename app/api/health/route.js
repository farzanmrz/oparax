import {rpc,pubKey,dbUrl} from '../../../lib/store.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{if(!await rpc('outreach_ready')||!pubKey()||!dbUrl())throw Error();return Response.json({app:'oparax-outreach',status:'ready'})}catch{return Response.json({app:'oparax-outreach',status:'unavailable'},{status:503})}}
