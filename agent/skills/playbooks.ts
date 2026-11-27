import {defineDynamic,defineSkill} from 'eve/skills';
import {evePlaybooks} from '../../lib/eve-context.mjs';

export default defineDynamic(async ctx=>{
  if(!ctx.turn||!ctx.session.auth.current?.attributes?.requestId)return null;
  const assigned=await ctx.memo('playbooks/'+ctx.turn.id,()=>evePlaybooks(ctx));
  if(!assigned.length)return null;
  return Object.fromEntries(assigned.map(skill=>['skill_'+skill.id,defineSkill({
    description:'Apply the sales playbook '+skill.name+' when the current request calls for it.',
    content:skill.instructions
  })]));
});
