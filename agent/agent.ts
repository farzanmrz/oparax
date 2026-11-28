import {defineAgent,defineDynamic} from 'eve';
import {gateway,wrapLanguageModel} from 'ai';
import {eveModelCall} from '../lib/eve-bridge.mjs';
import {actionMiddleware,modelReceipt,recordNoAction,localSalesCall} from '../lib/eve-action-model.mjs';
export default defineAgent({model:defineDynamic(async ctx=>{
  const {modelId,onUsage,review}=await eveModelCall(ctx);
  const reviewer=review ? gateway(review.modelId) : null;
  return wrapLanguageModel({model:gateway(modelId),middleware:actionMiddleware({
    review:reviewer && review ? {generate:reviewer.doGenerate.bind(reviewer),onUsage:review.onUsage} : null,
    onUsage,getReceipt:()=>modelReceipt(ctx),getLocalCall:()=>localSalesCall(ctx),fail:(reason?:string)=>recordNoAction(ctx,{},reason)
  })});
})});
