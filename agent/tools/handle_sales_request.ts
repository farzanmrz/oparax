import {defineTool} from 'eve/tools';
import {z} from 'zod';
import {runEveSalesTurn} from '../../lib/eve-bridge.mjs';
export default defineTool({
  description:'Process the signed-in operator’s current message using the research, memory, draft, connection and delivery tools permitted for this bot, and return the persisted result.',
  inputSchema:z.object({}).strict(),
  async execute(_input,ctx){return await runEveSalesTurn(ctx);}
});
