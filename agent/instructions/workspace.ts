import {defineDynamic,defineInstructions} from 'eve/instructions';
import {eveSalesContext} from '../../lib/eve-context.mjs';

export default defineDynamic(async ctx=>{
  if(!ctx.turn||!ctx.session.auth.current?.attributes?.requestId)return null;
  const context=await ctx.memo('workspace/'+ctx.turn.id,()=>eveSalesContext(ctx));
  return defineInstructions({role:'user',content:'Current Oparax workspace data for this bot and turn.\n'+JSON.stringify(context)});
});
