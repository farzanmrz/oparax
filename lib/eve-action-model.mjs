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
function validCall(part){
  if(part?.type!=='tool-call'||part.toolName!==name||part.providerExecuted||!part.toolCallId||typeof part.input!=='string')return false;
  try{
    const p=JSON.parse(part.input);
    return p&&Object.keys(p).length===keys.length&&keys.every(k=>Object.hasOwn(p,k))&&
      ['status','results','research','refine','draft','send','answer','clarify'].includes(p.action)&&
      [p.text,p.name,p.prospectId].every(v=>v===null||typeof v==='string')&&[null,'email','linkedin','both'].includes(p.channel)&&
      [p.existingDraft,p.concrete].every(v=>v===null||typeof v==='boolean');
  }catch{return false;}
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
export function actionMiddleware({getReceipt,getLocalCall=async()=>null,onUsage,fail}){
  async function completed(){const turn=await getReceipt();return turn?.status==='confirmed'||turn?.status==='failed'?safeReply(turn):null;}
  return {
    specificationVersion:'v4',
    async transformParams({params}){
      return {...params,tools:(params.tools||[]).filter(t=>t.name===name),toolChoice:{type:'tool',toolName:name}};
    },
    async wrapGenerate({doGenerate}){
      const done=await completed();
      const local=done?null:await getLocalCall();
      if(local)return {usage:emptyUsage,warnings:[],content:[local],finishReason:finishReason('tool-calls')};
      let result;
      try{result=done?{usage:emptyUsage,warnings:[]}:await doGenerate();}
      catch(error){return {usage:emptyUsage,warnings:[],content:[{type:'text',text:await fail(failureReason(error))}],finishReason:finishReason('stop')};}
      if(!done)await onUsage?.({model:result.response?.modelId,usage:result.usage,providerMetadata:result.providerMetadata});
      const calls=(result.content||[]).filter(p=>p.type==='tool-call');
      if(!done&&calls.length===1&&validCall(calls[0]))return {...result,content:calls,structuredOutputText:undefined,finishReason:finishReason('tool-calls')};
      const reply=done||await fail();
      return {...result,content:[{type:'text',text:reply}],structuredOutputText:undefined,finishReason:finishReason('stop')};
    },
    async wrapStream({doStream}){
      const done=await completed();if(done)return {stream:fromParts([{type:'stream-start',warnings:[]},...canonicalParts(done)])};
      const local=await getLocalCall();
      if(local)return {stream:fromParts([{type:'stream-start',warnings:[]},local,{type:'finish',finishReason:finishReason('tool-calls'),usage:emptyUsage}])};
      let result;
      try{result=await doStream();}catch(error){return {stream:fromParts([{type:'stream-start',warnings:[]},...canonicalParts(await fail(failureReason(error)))])};}
      let count=0,call,finish,reportedModel;
      const reader=result.stream.getReader();
      const stream=new ReadableStream({async start(controller){
        try{
          for(;;){const next=await reader.read();if(next.done)break;const part=next.value;
            if(part.type==='error')throw part.error||new Error('The model request failed.');
            if(part.type==='stream-start'||part.type==='response-metadata')controller.enqueue(part);
            if(part.type==='response-metadata'&&part.modelId)reportedModel=part.modelId;
            if(part.type==='tool-call'){count++;if(validCall(part))call=part;}
            if(part.type==='finish')finish=part;
          }
          if(finish)await onUsage?.({model:reportedModel,usage:finish.usage,providerMetadata:finish.providerMetadata});
          if(finish&&count===1&&call){controller.enqueue(call);controller.enqueue({...finish,finishReason:finishReason('tool-calls')});}
          else {const reply=await fail();for(const part of canonicalParts(reply,finish?.usage))controller.enqueue(part);}
          controller.close();
        }catch(error){try{for(const part of canonicalParts(await fail(failureReason(error))))controller.enqueue(part);controller.close();}catch(e){controller.error(e);}}
        finally{reader.releaseLock();}
      },cancel(){return reader.cancel();}});
      return {...result,stream};
    }
  };
}
