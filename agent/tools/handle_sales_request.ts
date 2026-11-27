import {defineTool} from 'eve/tools';
import {z} from 'zod';
import {recordNoAction,failureReason} from '../../lib/eve-action-model.mjs';
import {runEveSalesTurn} from '../../lib/eve-bridge.mjs';
export default defineTool({
  description:'Apply a proposed response to the current signed user message. The server verifies the audience, recipient, enabled skills and sender permissions and returns the recorded result.',
  inputSchema:z.object({
    action:z.enum(['answer','clarify','status','results','research','refine','draft','send']),
    text:z.string().nullable().describe('The answer, clarification question or exact user-provided delivery purpose. Use null for a lookup or research.'),
    name:z.string().nullable().describe('Short descriptive name when creating a research bot. Otherwise null.'),
    prospectId:z.string().nullable().describe('For a draft or send, an exact verified prospect ID from the current workspace context.'),
    channel:z.enum(['email','linkedin','both']).nullable(),
    existingDraft:z.boolean().nullable().describe('True only when the user refers to a saved draft.'),
    concrete:z.boolean().nullable().describe('True if the current sender instruction specifies the message or purpose.')
  }).strict(),
  async execute(input,ctx){
    const {text,...proposal}=input;
    try {return await runEveSalesTurn(ctx,{},{
      ...proposal,
      answer:input.action==='answer'?text:null,
      question:input.action==='clarify'?text:null,
      purpose:input.action==='send'?text:null
    });} catch(error){return {reply:await recordNoAction(ctx,{},failureReason(error))};}
  }
});
