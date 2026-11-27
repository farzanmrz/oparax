import {Fault,failure,verifiedUser,withWorkspace} from '../../../lib/store.mjs';
import {sendOutreach} from '../../../lib/outreach-send.mjs';
export const runtime='nodejs',maxDuration=60,dynamic='force-dynamic';
export async function POST(req){
  try{
    const user=await verifiedUser(req);
    const raw=await req.text();
    if(raw.length>1800)throw new Fault('Request is too large.',413);
    let input;try{input=JSON.parse(raw);}catch{throw new Fault('Invalid send request.');}
    if(!input||typeof input!=='object')throw new Fault('Select a saved draft to send.');
    const receipt=await withWorkspace(user.id,()=>sendOutreach(input));
    return Response.json({receipt},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return failure(error);}
}
