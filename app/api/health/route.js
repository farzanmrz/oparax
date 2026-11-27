import {read,pubKey,dbUrl} from '../../../lib/store.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{const {data}=await read();if(!Array.isArray(data.bots)||!pubKey()||!dbUrl())throw Error();return Response.json({app:'oparax-outreach',status:'ready'})}catch{return Response.json({app:'oparax-outreach',status:'unavailable'},{status:503})}}
