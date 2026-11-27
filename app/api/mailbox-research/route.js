import {Fault,failure,verifiedUser,withWorkspace} from '../../../lib/store.mjs';
import {runMailboxResearch} from '../../../lib/mailbox-research.mjs';

export const runtime='nodejs',maxDuration=300,dynamic='force-dynamic';
export async function POST(request) {
  try {
    const user=await verifiedUser(request);
    const raw=await request.text();
    if(raw.length>1800)throw new Fault('Mailbox search request is too large.',413);
    let input;
    try{input=JSON.parse(raw);}catch{throw new Fault('Enter a valid mailbox search scope.');}
    if(!input||typeof input!=='object')throw new Fault('Choose a mailbox search scope.');
    const receipt=await withWorkspace(user.id,()=>runMailboxResearch(input.agentId,input));
    return Response.json({receipt},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){const response=failure(error);response.headers.set('Cache-Control','private, no-store');return response;}
}
