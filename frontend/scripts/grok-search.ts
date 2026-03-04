import OpenAI from 'openai';
import { prompts } from './prompts';

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

async function main() {
  const response = await client.responses.create({
    model: 'grok-4-1-fast-reasoning',
    input: [
      {
        role: 'system',
        content: prompts.sysprompt_base,
      },
      {
        role: 'user',
        content: prompts.usrprompt_barca,
      },
    ],
    tools: [
      {
        // @ts-expect-error x_search is an xAI-specific tool not in the OpenAI SDK type definitions
        type: 'x_search',
        allowed_x_handles: ['FabrizioRomano'],
        from_date: '2026-03-04T03:00:00Z',
        to_date: '2026-03-04T05:00:00Z',
      },
    ],
    max_turns: 10,
  });

  console.log('=== TEXT OUTPUT ===');
  console.log(response.output_text);

  console.log('\n=== FULL RESPONSE ===');
  console.log(JSON.stringify(response, null, 2));
}

main();
