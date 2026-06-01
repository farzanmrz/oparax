// Imports
import OpenAI from 'openai';
import {
  ScanOutputWriter,
  allowedXHandles,
  buildResponseParams,
  defaultUserPrompt,
  requestTimeoutMs,
} from '../lib/test-scan-config.ts';

// Load .env.local so plain `node ...` and the VSCode Run button can find the key
process.loadEnvFile('.env.local');

// Point the OpenAI client at xAI servers instead of OpenAI's
const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
  timeout: requestTimeoutMs,
});

// Stream one x_search-backed test scan using the shared test config
const stream = await client.responses.create(
  buildResponseParams({
    handles: allowedXHandles,
    userPrompt: defaultUserPrompt,
  }),
);

// Shared terminal writer for reasoning, tool calls, and structured JSON
const output = new ScanOutputWriter((value) => process.stdout.write(value));

// Walk each stream event and let the shared writer format it
for await (const event of stream) {
  output.handle(event);
}

output.finish();
