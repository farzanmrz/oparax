import {Fault,failure,verifiedUser,withWorkspace} from '../../../lib/store.mjs';
import {reviseDraft} from '../../../lib/edit-draft.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
export async function POST(req){
  try{
    const user=await verifiedUser(req),raw=await req.text();
    if(raw.length>14000)throw new Fault('Draft is too long.',413);
    let input;try{input=JSON.parse(raw);}catch{throw new Fault('Invalid draft.');}
    if(!input||typeof input!=='object')throw new Fault('Select a saved draft.');
    const draft=await withWorkspace(user.id,()=>reviseDraft(input));
    return Response.json({draft},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return failure(error);}
}
