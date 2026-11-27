import {defineDynamic,defineInstructions} from 'eve/instructions';
import {eveSalesContext,evePlaybooks} from '../../lib/eve-context.mjs';

export default defineDynamic(async ctx=>{
  if(!ctx.turn||!ctx.session.auth.current?.attributes?.requestId)return null;
  const [context,assignedPlaybooks]=await Promise.all([ctx.memo('workspace/'+ctx.turn.id,()=>eveSalesContext(ctx)),ctx.memo('playbooks/'+ctx.turn.id,()=>evePlaybooks(ctx))]);
  return defineInstructions({role:'user',content:'Current Oparax workspace data for this bot and turn.\n'+JSON.stringify({...context,assignedPlaybooks})});
});
