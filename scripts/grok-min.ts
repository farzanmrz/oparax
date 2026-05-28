// Imports
import OpenAI from 'openai';

// Load .env.local so plain `node ...` and the VSCode Run button can find the key
process.loadEnvFile('.env.local');

// Model configuration knobs
const MODEL = 'grok-4.3';
const REASONING_EFFORT = 'low';
const REASONING_SUMMARY = 'detailed';
const TEMPERATURE = 0;
const TOP_P = 1;
const MAX_OUTPUT_TOKENS = 1_000_000;
const MAX_TURNS = 5;
const REQUEST_TIMEOUT_MS = 180_000;
const FROM_DATE = '2026-05-20';
const TO_DATE = '2026-05-28';
const STRUCTURED_OUTPUT_FORMAT = {
  type: 'json_schema',
  name: 'atomic_news_items',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            urls: {
              type: 'array',
              minItems: 1,
              description:
                'Direct x.com or twitter.com source post/profile URLs from x_search.',
              items: {
                type: 'string',
                format: 'uri',
                pattern: 'https://(x|twitter)\\.com/.+',
              },
            },
          },
          required: ['title', 'body', 'urls'],
        },
      },
    },
    required: ['items'],
  },
};
const ALLOWED_X_HANDLES = [
  'talkfcb_',
  'EduardoHagn',
  'FabrizioRomano',
  'DavidOrnstein',
  'Glongari',
  'cfcpys',
  'Barza_Buzz',
  'Messilizer0',
  'fcbarcelona',
  'BarcaSpaces',
  'NealGardner_',
];
const TOOLS = [
  {
    type: 'x_search',
    allowed_x_handles: ALLOWED_X_HANDLES,
    from_date: FROM_DATE,
    to_date: TO_DATE,
  },
];

// The system instruction for the model role and rules
const SYSPROMPT = `You are a source-grounded news aggregation assistant for professional reporters. You take the user prompt and retrieve relevant news about it.

Rules:
- Build one news item per atomic angle.
- Do not merge separate quotes, claims, or developments just because they involve the same person, club, interview, press conference, or match.
- Put direct x.com or twitter.com source post/profile URLs in each item's urls array.
- Do not put external websites, article URLs, or links merely mentioned inside X posts in urls.
- If an X post links to an article, include the X post URL itself, not the article URL.
- Return all distinct, non-overlapping news items you can find in reverse chronological order. Do not cap the list to a top-N summary.`;

// The user brief for this test run
const USERPROMPT = `All news around FC Barcelona, including transfers, league news, rumors, murmurs, and anything relevant around the club.`;

// Point the OpenAI client at xAI servers instead of OpenAI's
const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
  timeout: REQUEST_TIMEOUT_MS,
});

// Stream the response; xAI adds custom fields that the SDK types don't know about
const stream = await client.responses.create({
  model: MODEL,
  instructions: SYSPROMPT,
  temperature: TEMPERATURE,
  top_p: TOP_P,
  max_output_tokens: MAX_OUTPUT_TOKENS,
  max_turns: MAX_TURNS,
  reasoning: { effort: REASONING_EFFORT, summary: REASONING_SUMMARY },
  tools: TOOLS,
  text: { format: STRUCTURED_OUTPUT_FORMAT },
  stream: true,
  input: [{ role: 'user', content: USERPROMPT }],
} as unknown as OpenAI.Responses.ResponseCreateParamsStreaming);

/**
 * Checks whether an unknown value is a plain object we can safely inspect.
 * @param value - the value to check before reading dynamic response fields
 * @returns true when the value is object-like and non-null
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Returns the scan telemetry useful for comparing test runs.
 * @param response - the completed response object returned by xAI
 * @returns x_search call count and USD cost
 */
function responseTelemetry(response: unknown) {
  if (!isRecord(response)) {
    return { x_search_calls: null, cost_usd: null };
  }

  // Usage fields needed for the tiny final metrics block
  const usage = response.usage;
  if (!isRecord(usage)) {
    return { x_search_calls: null, cost_usd: null };
  }

  // Tool and cost fields we expose after streaming finishes
  const toolUsage = usage.server_side_tool_usage_details;
  const costTicks = usage.cost_in_usd_ticks;

  return {
    x_search_calls:
      isRecord(toolUsage) && typeof toolUsage.x_search_calls === 'number'
        ? toolUsage.x_search_calls
        : null,
    cost_usd:
      typeof costTicks === 'number'
        ? Number((costTicks / 1e10).toFixed(6))
        : null,
  };
}

/**
 * Builds a stable key for one reasoning-summary part.
 * @param itemId - the response output item id for the summary
 * @param summaryIndex - the summary part index inside that item
 * @returns a key suitable for buffering and de-duplicating summary parts
 */
function reasoningSummaryKey(itemId: string, summaryIndex: number): string {
  return `${itemId}:${summaryIndex}`;
}

// Accumulate response and output formatting state while the stream closes
let finalResponse: OpenAI.Responses.Response | undefined;
let printedReasoningSummaryHeader = false;
let printedReasoningPartCount = 0;
let printedAnswerHeader = false;
let printedToolCallsHeader = false;
let printedToolCallItem = false;
let closedToolCallsJson = false;
let currentToolName = '';
let currentToolInput = '';
const reasoningSummaryBuffers = new Map<string, string>();
const printedReasoningSummaryKeys = new Set<string>();

/**
 * Prints one completed reasoning-summary part with clear boundaries.
 * @param key - the stable key for the reasoning-summary part
 * @param text - the completed reasoning-summary text
 * @returns nothing
 */
function printReasoningSummaryPart(key: string, text: string) {
  if (printedReasoningSummaryKeys.has(key)) return;

  if (!printedReasoningSummaryHeader) {
    console.log('\n\n=== REASONING SUMMARY ===');
    printedReasoningSummaryHeader = true;
  }

  printedReasoningPartCount += 1;
  if (printedReasoningPartCount > 1) {
    console.log('');
  }

  console.log(`--- part ${printedReasoningPartCount} ---`);
  console.log(text.trimEnd());
  printedReasoningSummaryKeys.add(key);
}

/**
 * Prints any buffered reasoning summaries that never received a done event.
 * @returns nothing
 */
function flushPendingReasoningSummaries() {

  // Print each unfinished reasoning-summary buffer once.
  for (const [key, text] of reasoningSummaryBuffers) {
    if (text.trim()) {
      printReasoningSummaryPart(key, text);
    }
  }
}

// Walk each stream event and dispatch on its type
for await (const event of stream) {

  // Route each event type to its handler
  switch (event.type) {
    case 'response.output_item.added':
      if (event.item.type === 'custom_tool_call') {
        currentToolName = event.item.name;
        currentToolInput = '';
      }
      break;
    case 'response.reasoning_summary_text.delta':
      {

        // Buffer the streamed delta until xAI sends the completed summary part.
        const key = reasoningSummaryKey(event.item_id, event.summary_index);
        const previousText = reasoningSummaryBuffers.get(key) ?? '';
        reasoningSummaryBuffers.set(key, previousText + event.delta);
      }
      break;
    case 'response.reasoning_summary_text.done':
      {

        // Prefer xAI's completed summary text over our assembled delta buffer.
        const key = reasoningSummaryKey(event.item_id, event.summary_index);
        reasoningSummaryBuffers.set(key, event.text);
        printReasoningSummaryPart(key, event.text);
      }
      break;
    case 'response.reasoning_summary_part.done':
      {

        // Some streams complete the summary part object before text.done.
        const key = reasoningSummaryKey(event.item_id, event.summary_index);
        reasoningSummaryBuffers.set(key, event.part.text);
        printReasoningSummaryPart(key, event.part.text);
      }
      break;
    case 'response.custom_tool_call_input.delta':
      currentToolInput += event.delta;
      break;
    case 'response.custom_tool_call_input.done':
      if (!printedToolCallsHeader) {
        console.log('\n\n=== TOOL CALLS ===');
        console.log('[');
        printedToolCallsHeader = true;
      }
      if (printedToolCallItem) {
        console.log(',');
      }
      process.stdout.write(
        JSON.stringify(
          {
            tool_name: currentToolName || 'unknown',
            input: currentToolInput || '(no input)',
          },
          null,
          2,
        )
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n'),
      );
      printedToolCallItem = true;
      break;
    case 'response.output_text.delta':
      if (printedToolCallsHeader && !closedToolCallsJson) {
        console.log('\n]');
        closedToolCallsJson = true;
      }
      if (!printedAnswerHeader) {
        console.log('\n\n=== STRUCTURED JSON ===');
        printedAnswerHeader = true;
      }
      process.stdout.write(event.delta);
      break;
    case 'response.completed':
      finalResponse = event.response;
      break;
  }
}

flushPendingReasoningSummaries();

if (printedToolCallsHeader && !closedToolCallsJson) {
  console.log('\n]');
}

console.log('\n\n=== RESPONSE METRICS ===');
console.log(JSON.stringify(responseTelemetry(finalResponse), null, 2));
