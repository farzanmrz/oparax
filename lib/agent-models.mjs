const routineModel = 'spacexai/grok-4.7';
const reviewModel = 'openai/gpt-6.2-sol';

// Previous releases let customers pin individual bots. Their stored settings and
// retried requests remain readable, but every bot now uses the same Auto policy.
const compatiblePreferences = new Set(['auto', 'efficient', 'premium', 'grok']);
export const normalizeModelPreference = () => 'auto';
export function setModelPreference(_workspace, agent, choice) {
  if (!compatiblePreferences.has(choice)) {
    const error = new Error('The available model setting is Auto.');
    error.status = 400;
    throw error;
  }
  agent.modelPreference = 'auto';
}

const judgmentTasks = new Set(['conversation', 'planning']);
const difficultJudgment = /\b(?:reconcile|disambiguate|resolve)\b.{0,100}\b(?:conflict(?:ing)?|contradictory|ambigu(?:ity|ous)|namesakes?|different sources|identities)\b|\b(?:conflicting|contradictory)\s+(?:evidence|sources|records|constraints)\b|\b(?:multi[- ]market|cross[- ]border|multi[- ]jurisdiction)\b.{0,140}\b(?:compare|prioriti[sz]e|rank|strategy)\b/i;

export function resolveAgentModel(_agent, {task = 'conversation', message = '', complex = false} = {}) {
  const review = judgmentTasks.has(task) && (complex || difficultJudgment.test(String(message).slice(0, 5000)));
  return {modelId: review ? reviewModel : routineModel, preference: 'auto', task,
    reason: review ? 'Difficult judgment' : 'Routine work'};
}

export function canRequestReasoningReview(route) {
  return route.preference === 'auto' && route.modelId === routineModel && judgmentTasks.has(route.task);
}

// Vercel AI Gateway standard uncached text rates, USD per million. Older
// identifiers remain here only to label usage from in-flight or historical calls.
const pricedModels = [
  {model:routineModel, input:2, output:6, longContextAt:200001, longInput:4, longOutput:12},
  {model:reviewModel, input:2, output:10, longContextAt:272001, longInput:4, longOutput:15},
  {model:'openai/gpt-6.2-astra', input:8, output:40, longContextAt:272001, longInput:16, longOutput:60},
  {model:'spacexai/grok-4.3', input:1.25, output:2.50, longContextAt:200001, longInput:4, longOutput:5},
];
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
    const choice=pricedModels.find(m=>m.model===reportedModel||m.model.split('/')[1]===reportedModel);
    if(choice&&result.inputTokens!==undefined&&result.outputTokens!==undefined){
      const long=i>=choice.longContextAt;
      result.costUsd=((long?choice.longInput:choice.input)*i+(long?choice.longOutput:choice.output)*o)/1000000;
      result.costBasis='estimated_standard_text';
    }
  }
  return result;
}
