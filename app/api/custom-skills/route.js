import {edit,Fault,failure,verifiedUser,withWorkspace} from '../../../lib/store.mjs';
import {changeCustomSkills} from '../../../lib/custom-skills.mjs';

export const runtime='nodejs',dynamic='force-dynamic';
export async function POST(request) {
  try {
    const user=await verifiedUser(request);
    const raw=await request.text();
    if(raw.length>18000)throw new Fault('This skill request is too large.',413);
    let input;
    try {input=JSON.parse(raw);}catch{throw new Fault('Invalid sales skill.');}
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Fault('Choose a sales skill.');
    const data=await withWorkspace(user.id,()=>edit(d=>changeCustomSkills(d,input)));
    return Response.json(data,{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {
    const response=failure(error);
    response.headers.set('Cache-Control','private, no-store');
    return response;
  }
}
