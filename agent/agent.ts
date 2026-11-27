import {defineAgent,defineDynamic} from 'eve';
import {gateway,wrapLanguageModel} from 'ai';
import {eveModel} from '../lib/eve-bridge.mjs';
import {actionMiddleware,modelReceipt,recordNoAction,localSalesCall} from '../lib/eve-action-model.mjs';
export default defineAgent({model:defineDynamic(async ctx=>{
  const modelId=await eveModel(ctx);
  return wrapLanguageModel({model:gateway(modelId),middleware:actionMiddleware({
    getReceipt:()=>modelReceipt(ctx),getLocalCall:()=>localSalesCall(ctx),fail:(reason?:string)=>recordNoAction(ctx,{},reason)
  })});
})});
