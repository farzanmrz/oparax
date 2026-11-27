import {randomUUID} from 'node:crypto';
import {Fault,edit,failure,verifiedUser,withWorkspace} from '../../../lib/store.mjs';
import {selectedSearchSources} from '../../../lib/search-source.mjs';
import {bot} from '../../../lib/domain.mjs';
import {openAgentDesktop} from '../../../lib/agent-desktop.mjs';

export const runtime='nodejs',maxDuration=300,dynamic='force-dynamic';
const privateHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
function starting(){return Response.json({status:'starting',retryAfterMs:3500},{status:202,headers:{...privateHeaders,'Retry-After':'4'}});}
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export async function POST(request){
  try{
    const user=await verifiedUser(request);
    const raw=await request.text();
    if(raw.length>500)throw new Fault('Request is too large.',413);
    let input;
    try{input=JSON.parse(raw);}catch{throw new Fault('Enter a valid computer request.');}
    if(!uuid.test(input?.agentId)||!uuid.test(input?.requestId)||!['linkedin','sales_navigator'].includes(input?.provider)){
      throw new Fault('Choose LinkedIn or Sales Navigator for this agent.');
    }
    return await withWorkspace(user.id,async()=>{
      const lease=randomUUID();
      const claim=await edit(data=>{
        const agent=bot(data,input.agentId);
        if(!selectedSearchSources(agent).includes(input.provider))throw new Fault('Choose this search source in the conversation first.',409);
        const at=Date.now(),previous=data.computerLaunch;
        const sameRequest=previous?.requestId===input.requestId;
        if(sameRequest&&(previous.agentId!==input.agentId||previous.provider!==input.provider)){
          throw new Fault('Open a new link for the selected agent and source.',409);
        }
        if(previous?.until>at){
          if(sameRequest)return false;
          throw new Fault('Another computer request is starting. Try again in a moment.',409);
        }
        if(sameRequest&&previous.deadline<at)throw new Fault('Startup timed out. Open the computer again to retry.',408);
        const recent=(previous?.recent||[]).filter(time=>time>at-600000);
        if(!sameRequest&&recent.length>=12)throw new Fault('Several computer sessions were opened recently. Try again in a few minutes.',429);
        data.computerLaunch={lease,until:at+90000,requestId:input.requestId,agentId:input.agentId,provider:input.provider,
          deadline:sameRequest?previous.deadline:at+13*60000,recent:sameRequest?recent:[...recent,at]};
        return true;
      });
      if(!claim)return starting();
      let desktop;
      try{desktop=await openAgentDesktop({ownerId:user.id,agentId:input.agentId,provider:input.provider,requestId:input.requestId});}
      finally{
        await edit(data=>{
          const launch=data.computerLaunch;
          if(launch?.lease!==lease)return;
          if(desktop?.status==='starting'){
            delete launch.lease;delete launch.until;
          }else data.computerLaunch={recent:launch.recent};
        });
      }
      if(desktop.status==='starting')return starting();
      return Response.json({url:desktop.url,expiresAt:desktop.expiresAt,provider:input.provider},{headers:privateHeaders});
    });
  }catch(error){
    const response=failure(error);
    response.headers.set('Cache-Control','private, no-store');
    return response;
  }
}
