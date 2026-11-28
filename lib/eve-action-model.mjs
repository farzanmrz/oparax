import {isAiBudgetError} from './ai-gateway-failure.mjs';
import {edit,now} from './store.mjs';
import {bot,note} from './domain.mjs';
import {withEveTurn} from './eve-bridge.mjs';
import {localTurnIntent} from './conversation.mjs';
import {publicTurn,noActionMessage,budgetMessage} from './eve-turn-receipt.mjs';

const name='handle_sales_request';
const emptyUsage={inputTokens:{total:0,noCache:0,cacheRead:0,cacheWrite:0},outputTokens:{total:0,text:0,reasoning:0}};
const finishReason=unified=>({unified,raw:unified});
const safeReply=turn=>turn?.answer||'This message has already been recorded.';
function canonicalParts(reply,usage=emptyUsage){
  const id='oparax-recorded-answer';
  return [{type:'text-start',id},{type:'text-delta',id,delta:reply},{type:'text-end',id},{type:'finish',finishReason:finishReason('stop'),usage}];
}
function fromParts(parts){return new ReadableStream({start(controller){for(const p of parts)controller.enqueue(p);controller.close();}});}
const keys=['action','text','name','prospectId','channel','existingDraft','concrete'];
const reviewAction='request_review';
// Only the routine provider sees the internal action. It is never registered as an executable Eve tool.
const reviewHint='When the available evidence or constraints require a difficult judgment you cannot reliably resolve, use request_review with every other field null. If essential information is missing, choose clarify.';
function salesParams(params,allowReview) {
  const tools=(params.tools||[]).filter(tool=>tool.name===name).map(tool=>{
    const schema=tool.inputSchema, spec=schema?.properties?.action;
    if(!Array.isArray(spec?.enum))return tool;
    const actions=spec.enum.filter(value=>value!==reviewAction);
    if(allowReview)actions.push(reviewAction);
    const description=(tool.description||'').replace(' '+reviewHint,'');
    return {...tool,description:allowReview?description+' '+reviewHint:description,inputSchema:{
      ...schema,properties:{...schema.properties,action:{...spec,enum:actions}}
    }};
  });
  return {...params,tools,toolChoice:{type:'tool',toolName:name}};
}
function callKind(part){
  if(part?.type!=='tool-call'||part.toolName!==name||part.providerExecuted||!part.toolCallId||typeof part.input!=='string')return null;
  try{
    const p=JSON.parse(part.input);
    if(!p||Object.keys(p).length!==keys.length||!keys.every(k=>Object.hasOwn(p,k)))return null;
    if(p.action===reviewAction)return keys.slice(1).every(k=>p[k]===null)?'review':null;
    if(['status','results','research','refine','draft','send','answer','clarify'].includes(p.action)&&
      [p.text,p.name,p.prospectId].every(v=>v===null||typeof v==='string')&&[null,'email','linkedin','both'].includes(p.channel)&&
      [p.existingDraft,p.concrete].every(v=>v===null||typeof v==='boolean'))return 'action';
    return null;
  }catch{return null;}
}
export async function modelReceipt(ctx,deps={}){
  return withEveTurn(ctx,({data,agent,command})=>publicTurn(data,agent,command.requestId),deps);
}
export async function localSalesCall(ctx,deps={}){
  return withEveTurn(ctx,({command,agent})=>{
    const {decision}=localTurnIntent(command,agent);
    if(!decision)return null;
    const action=decision.action==='remember'?'answer':decision.action;
    return {type:'tool-call',toolName:name,toolCallId:'local-'+command.requestId,
      input:JSON.stringify({action,text:decision.question||null,name:decision.name||null,prospectId:null,channel:null,existingDraft:null,concrete:null})};
  },deps);
}
export const failureReason=error=>isAiBudgetError(error)?'model_budget':'no_action';
export async function recordNoAction(ctx,deps={},reason='no_action'){
  return withEveTurn(ctx,({id,command})=>(deps.edit||edit)(d=>{
    const b=bot(d,id),row=b.eveInputs[command.requestId],status=publicTurn(d,b,command.requestId);
    if(status.status!=='unconfirmed')return safeReply(status);
    const expected=ctx.session.auth.current.attributes.deliveryKey||command.requestId;
    if(expected!==(row.deliveryKey||command.requestId))return noActionMessage;
    const message=reason==='model_budget'?budgetMessage:noActionMessage;
    row.failure={key:expected,at:now(),reason};
    if(!d.messages.some(m=>m.botId===id&&m.eveNoAction===command.requestId)){
      note(d,id,'user',command.message);Object.assign(d.messages.at(-1),{requestId:command.requestId,eveNoAction:command.requestId});
      note(d,id,'assistant',message);d.messages.at(-1).eveNoAction=command.requestId;
    }
    return message;
  }),deps);
}
// Validation is applied at the AI SDK provider boundary before Eve sees model output.
// Only a single correctly shaped registered tool-call can leave the first step.
export function actionMiddleware({getReceipt,getLocalCall=async()=>null,onUsage,fail,review=null}){
  async function completed(){const turn=await getReceipt();return turn?.status==='confirmed'||turn?.status==='failed'?safeReply(turn):null;}
  async function resolveCall(params,calls,reason) {
    const kind=calls.length===1?callKind(calls[0]):null;
    if(kind==='action')return {call:calls[0]};
    if(kind!=='review'||!review||!['tool-calls','stop'].includes(reason?.unified))return {reply:await fail()};
    const receipt=await completed();
    if(receipt)return {reply:receipt};
    const result=await review.generate(salesParams(params,false));
    await review.onUsage({model:result.response?.modelId,usage:result.usage,providerMetadata:result.providerMetadata});
    const reviewed=(result.content||[]).filter(p=>p.type==='tool-call');
    if(['tool-calls','stop'].includes(result.finishReason?.unified)&&reviewed.length===1&&callKind(reviewed[0])==='action')return {call:reviewed[0],result};
    return {reply:await fail(),result};
  }
  return {
    specificationVersion:'v4',
    async transformParams({params}){return salesParams(params,Boolean(review));},
    async wrapGenerate({params,doGenerate}){
      const done=await completed();
      if(done)return {usage:emptyUsage,warnings:[],content:[{type:'text',text:done}],finishReason:finishReason('stop')};
      const local=await getLocalCall();
      if(local)return {usage:emptyUsage,warnings:[],content:[local],finishReason:finishReason('tool-calls')};
      try{
        const primary=await doGenerate();
        await onUsage?.({model:primary.response?.modelId,usage:primary.usage,providerMetadata:primary.providerMetadata});
        const chosen=await resolveCall(params,(primary.content||[]).filter(p=>p.type==='tool-call'),primary.finishReason);
        const result=chosen.result||primary;
        return {...result,content:chosen.call?[chosen.call]:[{type:'text',text:chosen.reply}],
          structuredOutputText:undefined,finishReason:finishReason(chosen.call?'tool-calls':'stop')};
      }catch(error){return {usage:emptyUsage,warnings:[],content:[{type:'text',text:await fail(failureReason(error))}],finishReason:finishReason('stop')};}
    },
    async wrapStream({params,doStream}){
      const done=await completed();if(done)return {stream:fromParts([{type:'stream-start',warnings:[]},...canonicalParts(done)])};
      const local=await getLocalCall();
      if(local)return {stream:fromParts([{type:'stream-start',warnings:[]},local,{type:'finish',finishReason:finishReason('tool-calls'),usage:emptyUsage}])};
      let result;
      try{result=await doStream();}catch(error){return {stream:fromParts([{type:'stream-start',warnings:[]},...canonicalParts(await fail(failureReason(error)))])};}
      const reader=result.stream.getReader();
      const stream=new ReadableStream({async start(controller){
        try{
          const calls=[];
          let finish,metadata;
          for(;;){const next=await reader.read();if(next.done)break;const part=next.value;
            if(part.type==='error')throw part.error||new Error('The model request failed.');
            if(part.type==='stream-start')controller.enqueue(part);
            if(part.type==='response-metadata')metadata=part;
            if(part.type==='tool-call'&&calls.length<2)calls.push(part);
            if(part.type==='finish')finish=part;
          }
          if(finish)await onUsage?.({model:metadata?.modelId,usage:finish.usage,providerMetadata:finish.providerMetadata});
          const chosen=finish?await resolveCall(params,calls,finish.finishReason):{reply:await fail()};
          const usage=chosen.result?.usage||finish?.usage;
          if(chosen.result){
            const response=chosen.result.response;
            if(response)controller.enqueue({type:'response-metadata',id:response.id,timestamp:response.timestamp,modelId:response.modelId});
          }else if(metadata)controller.enqueue(metadata);
          if(chosen.call){
            controller.enqueue(chosen.call);
            controller.enqueue({type:'finish',finishReason:finishReason('tool-calls'),usage,
              providerMetadata:chosen.result?chosen.result.providerMetadata:finish.providerMetadata});
          }else for(const part of canonicalParts(chosen.reply,usage))controller.enqueue(part);
          controller.close();
        }catch(error){try{for(const part of canonicalParts(await fail(failureReason(error))))controller.enqueue(part);controller.close();}catch(e){controller.error(e);}}
        finally{reader.releaseLock();}
      },cancel(){return reader.cancel();}});
      return {...result,stream};
    }
  };
}
