// Vercel AI Gateway published standard uncached text rates (USD per million tokens), checked 2026-11-27.
export const MODEL_CHOICES=Object.freeze([
  {id:'auto',label:'Auto',description:'Sol for everyday work. Astra for complex planning and conflicting evidence.'},
  {id:'efficient',label:'GPT-6.2 Sol',model:'openai/gpt-6.2-sol',input:2,output:10,longContextAt:272001,longInput:4,longOutput:15,description:'Cost-efficient research, chat and outreach.'},
  {id:'premium',label:'GPT-6.2 Astra',model:'openai/gpt-6.2-astra',input:8,output:40,longContextAt:272001,longInput:16,longOutput:60,description:'Frontier reasoning for difficult research and detailed instructions.'},
  {id:'grok',label:'Grok 4.3',model:'spacexai/grok-4.3',input:1.25,output:2.50,longContextAt:200001,longInput:2.50,longOutput:5,description:'Grok reasoning with tool calling.'},
].map(choice=>Object.freeze({...choice,...(choice.model?{sourceUrl:'https://vercel.com/ai-gateway/models/'+choice.model}:{})})));
const byId=id=>MODEL_CHOICES.find(choice=>choice.id===id);
export const normalizeModelPreference=id=>byId(id)?.id||'auto';
export function setModelPreference(workspace,agent,choice){
  if(!byId(choice)){const e=new Error('Choose an available agent model.');e.status=400;throw e;}
  agent.modelPreference=choice;
}
export function resolveAgentModel(agent,{task='conversation',message='',complex=false}={}){
  const preference=normalizeModelPreference(agent?.modelPreference);
  // Escalation applies to one planning/analysis call only, never to whole pages of search, draft batches or retries.
  const canEscalate=['conversation','planning'].includes(task);
  const challenge=/\b(?:reconcile|disambiguate|resolve)\b.{0,100}\b(?:conflict(?:ing)?|contradictory|ambigu(?:ity|ous)|namesakes?|different sources|identities)\b|\b(?:conflicting|contradictory)\s+(?:evidence|sources|records|constraints)\b|\b(?:multi[- ]market|cross[- ]border|multi[- ]jurisdiction)\b.{0,140}\b(?:compare|prioriti[sz]e|rank|strategy)\b/i;
  const premium=preference==='auto'&&canEscalate&&(complex||challenge.test(String(message).slice(0,5000)));
  const choice=byId(preference==='auto'?(premium?'premium':'efficient'):preference);
  return {modelId:choice.model,preference,task,reason:preference!=='auto'?'Pinned model':premium?'Complex planning':'Routine work'};
}
export function modelUsage(value,route,at=new Date().toISOString()){
  const u=value?.usage||{},reportedModel=typeof value?.model==='string'?value.model:route.modelId;
  const result={at,requestedModel:route.modelId,modelId:reportedModel,preference:route.preference,task:route.task};
  const i=u.prompt_tokens??u.input_tokens??u.inputTokens?.total,o=u.completion_tokens??u.output_tokens??u.outputTokens?.total;
  if(Number.isSafeInteger(i)&&i>=0)result.inputTokens=i;
  if(Number.isSafeInteger(o)&&o>=0)result.outputTokens=o;
  const cost=u.cost??value?.providerMetadata?.gateway?.cost??value?.provider_metadata?.gateway?.cost;
  if(cost!==null&&cost!==undefined&&cost!==''&&Number.isFinite(Number(cost))&&Number(cost)>=0){
    result.costUsd=Number(cost);result.costBasis='gateway';
  }else{
    const choice=MODEL_CHOICES.find(m=>m.model&&(m.model===reportedModel||m.model.split('/')[1]===reportedModel));
    if(choice&&result.inputTokens!==undefined&&result.outputTokens!==undefined){
      const long=i>=choice.longContextAt;
      result.costUsd=((long?choice.longInput:choice.input)*i+(long?choice.longOutput:choice.output)*o)/1000000;
      result.costBasis='estimated_standard_text';
    }
  }
  return result;
}
