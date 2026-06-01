import OpenAI from 'openai';

const MODEL = 'grok-4.3';
const REASONING_EFFORT = 'high';
const DEFAULT_SCAN_TOPIC =
  'I want the most recent up to date news regarding FC Barcelona meaning anything remotely related to the club I want to know';

type SourceType = 'tweet' | 'site';

interface ScanSource {
  type: SourceType;
  title: string;
  url: string;
  publisher: string;
}

interface NewsItem {
  id: string;
  title: string;
  explanation: string;
  sources: ScanSource[];
  sourceTweetUrls: string[];
  sourceSiteUrls: string[];
  sourceHandles: string[];
}

interface ScanResult {
  generatedAt: string;
  newsItems: NewsItem[];
}

interface ScriptConfig {
  topic: string;
  handles: string[];
  fromDate: string;
  toDate: string;
  dryRun: boolean;
}

const scanResultJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    generatedAt: {
      type: 'string',
      description: 'ISO timestamp for when the scan result was generated.',
    },
    newsItems: {
      type: 'array',
      description:
        'Every distinct source-grounded news item found from X and/or web search.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
            description: 'Stable slug-like identifier for the scan item.',
          },
          title: {
            type: 'string',
            maxLength: 180,
            description: 'Short title for one atomic news angle.',
          },
          explanation: {
            type: 'string',
            maxLength: 4000,
            description:
              'Plain-language explanation of what happened, combining only what the sources support.',
          },
          sources: {
            type: 'array',
            minItems: 1,
            description:
              'All tweet and website sources used for this scan item.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: {
                  type: 'string',
                  enum: ['tweet', 'site'],
                },
                title: {
                  type: 'string',
                  description:
                    'Tweet/post title, article headline, page title, or short source label.',
                },
                url: {
                  type: 'string',
                  description: 'Source URL.',
                },
                publisher: {
                  type: 'string',
                  description:
                    'X handle without @ for tweets, or publisher/site name for websites.',
                },
              },
              required: ['type', 'title', 'url', 'publisher'],
            },
          },
          sourceTweetUrls: {
            type: 'array',
            items: { type: 'string' },
            description: 'X post/profile URLs used for this item.',
          },
          sourceSiteUrls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Non-X website URLs used for this item.',
          },
          sourceHandles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Supporting X handles without @ symbols.',
          },
        },
        required: [
          'id',
          'title',
          'explanation',
          'sources',
          'sourceTweetUrls',
          'sourceSiteUrls',
          'sourceHandles',
        ],
      },
    },
  },
  required: ['generatedAt', 'newsItems'],
} as const;

const systemPrompt = `You are a source-grounded news aggregation assistant for professional reporters.

Rules:
- Use x_search to search the monitored X handles.
- Use web_search to search the wider web for relevant supporting or standalone site coverage.
- Search broadly and deeply. Create multiple X and web search queries as needed for the monitoring brief, including obvious aliases, clubs, people, competitions, transfer targets, quoted claims, and related terminology.
- Do not treat the first results page as enough. Keep searching until the returned sources stop revealing new relevant angles within the API tool budget.
- The monitored X handles are a required X scope, but the scan is not limited to them; web coverage may produce site-only scan items when the story is relevant and source-grounded.
- Never simulate searches, source retrieval, URLs, or tool calls. If real retrieved sources do not support an item, omit it.
- Build one news item per atomic angle.
- Do not merge separate quotes, claims, or developments just because they involve the same club, person, interview, press conference, or match.
- Only include information supported by retrieved X or web sources.
- Write neutral reportorial aggregation only. Do not add drafting style, persuasion, jokes, flourish, or engagement framing.
- Do not include confidence markers, confidence scores, tool strategy commentary, or internal reasoning in any news item.
- Return tweet sources with type "tweet" and website sources with type "site".
- A news item may be supported by tweets, sites, or both.
- Put X post/profile URLs in sourceTweetUrls and non-X website URLs in sourceSiteUrls.
- Do not choose a primary source. Sources are peers unless the explanation itself says one outlet first reported or confirmed something.
- Do not write separate evidence bullets. Put the useful explanation in the explanation field.
- Return all distinct, non-overlapping news items you can find in reverse chronological order. Do not cap the list to a top-N summary.
- If nothing relevant is found in the date window, return an empty newsItems array.`;

function maybeLoadEnvFile() {
  const loadEnvFile = (
    process as typeof process & {
      loadEnvFile?: (path?: string) => void;
    }
  ).loadEnvFile;

  if (!process.env.XAI_API_KEY && loadEnvFile) {
    try {
      loadEnvFile('.env.local');
    } catch {
      // .env.local is optional for this scratchpad.
    }
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function splitCsv(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined) {
    return fallback;
  }

  return [
    ...new Set(
      value
        .split(',')
        .map((part) => part.trim().replace(/^@/, ''))
        .filter(Boolean),
    ),
  ];
}

function buildConfig(): ScriptConfig {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    topic: process.env.SCAN_TOPIC?.trim() || DEFAULT_SCAN_TOPIC,
    handles: splitCsv(process.env.SCAN_HANDLES, ['FabrizioRomano']),
    fromDate: process.env.SCAN_FROM?.trim() || toIsoDate(yesterday),
    toDate: process.env.SCAN_TO?.trim() || toIsoDate(today),
    dryRun: process.argv.includes('--dry-run'),
  };
}

function buildUserPrompt(config: ScriptConfig): string {
  return JSON.stringify(
    {
      monitoringBrief: config.topic,
      monitoredHandles: config.handles,
      scanWindow: {
        fromDate: config.fromDate,
        toDate: config.toDate,
      },
      validationGoals: [
        'Verify x_search was used for the monitored handles.',
        'Verify web_search was used for wider web coverage.',
        'Verify each news item can cite tweet sources, website sources, or both.',
        'Include site-only scan items when relevant web coverage exists without a matching monitored-handle tweet.',
        'Do not stop at a small top-results list; return every distinct relevant source-grounded news angle found.',
        'Never simulate sources or tool use. Return only information grounded in retrieved sources.',
        'Keep explanations neutral and informational; drafting style comes later.',
      ],
    },
    null,
    2,
  );
}

function buildRequest(config: ScriptConfig) {
  return {
    model: MODEL,
    reasoning: {
      effort: REASONING_EFFORT,
      summary: 'detailed',
    },
    input: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: buildUserPrompt(config),
      },
    ],
    tools: [
      {
        type: 'web_search',
      },
      {
        type: 'x_search',
        ...(config.handles.length > 0 && {
          allowed_x_handles: config.handles,
        }),
        from_date: config.fromDate,
        to_date: config.toDate,
      },
    ],
    include: ['no_inline_citations'],
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: 'web_and_x_scan',
        schema: scanResultJsonSchema,
        strict: true,
      },
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractResponseText(response: unknown): string | null {
  if (
    isObject(response) &&
    typeof response.output_text === 'string' &&
    response.output_text.trim()
  ) {
    return response.output_text;
  }

  if (!isObject(response) || !Array.isArray(response.output)) {
    return null;
  }

  for (const item of response.output) {
    if (
      !isObject(item) ||
      item.type !== 'message' ||
      !Array.isArray(item.content)
    ) {
      continue;
    }

    for (const content of item.content) {
      if (
        isObject(content) &&
        content.type === 'output_text' &&
        typeof content.text === 'string'
      ) {
        return content.text;
      }
    }
  }

  return null;
}

function extractReasoningSummary(response: unknown): string {
  if (!isObject(response) || !Array.isArray(response.output)) {
    return '';
  }

  const summaries: string[] = [];

  for (const item of response.output) {
    if (
      !isObject(item) ||
      item.type !== 'reasoning' ||
      !Array.isArray(item.summary)
    ) {
      continue;
    }

    for (const summary of item.summary) {
      if (
        isObject(summary) &&
        summary.type === 'summary_text' &&
        typeof summary.text === 'string'
      ) {
        summaries.push(summary.text.trim());
      }
    }
  }

  return summaries.filter(Boolean).join('\n\n');
}

function parseScanResult(outputText: string): ScanResult {
  const parsed = JSON.parse(outputText) as unknown;

  if (
    !isObject(parsed) ||
    typeof parsed.generatedAt !== 'string' ||
    !Array.isArray(parsed.newsItems)
  ) {
    throw new Error('Response did not match the expected scan result shape.');
  }

  return parsed as unknown as ScanResult;
}

function printRequestSummary(config: ScriptConfig) {
  console.log('=== REQUEST SUMMARY ===');
  console.log(
    JSON.stringify(
      {
        model: MODEL,
        reasoning: { effort: REASONING_EFFORT, summary: 'detailed' },
        tools: ['web_search', 'x_search'],
        xSearch: {
          allowed_x_handles: config.handles,
          from_date: config.fromDate,
          to_date: config.toDate,
        },
        topic: config.topic,
        itemLimit: 'none requested',
      },
      null,
      2,
    ),
  );
}

function printScanResult(result: ScanResult) {
  console.log('\n=== SCAN ITEMS ===');
  console.log(`Generated at: ${result.generatedAt}`);
  console.log(`Items: ${result.newsItems.length}`);

  result.newsItems.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.title}`);
    console.log(`ID: ${item.id}`);
    console.log(`Explanation: ${item.explanation}`);

    console.log('Sources:');
    for (const source of item.sources) {
      console.log(`- [${source.type}] ${source.publisher}: ${source.url}`);
    }
  });
}

function getCostInUsdTicks(response: unknown): number | null {
  if (!isObject(response) || !isObject(response.usage)) {
    return null;
  }

  const ticks = response.usage.cost_in_usd_ticks;
  if (typeof ticks === 'number' && Number.isFinite(ticks)) {
    return ticks;
  }

  if (typeof ticks === 'string' && /^\d+$/.test(ticks)) {
    return Number(ticks);
  }

  return null;
}

function printValidation(response: unknown) {
  console.log('\n=== VALIDATION SIGNALS ===');

  if (isObject(response) && isObject(response.usage)) {
    console.log(JSON.stringify(response.usage, null, 2));
  } else {
    console.log('No usage object returned.');
  }

  const costTicks = getCostInUsdTicks(response);
  if (costTicks === null) {
    console.log('\nCost: unavailable');
  } else {
    console.log(`\nCost: $${(costTicks / 10_000_000_000).toFixed(6)}`);
  }
}

async function main() {
  maybeLoadEnvFile();

  const config = buildConfig();
  const request = buildRequest(config);

  printRequestSummary(config);

  if (config.dryRun) {
    console.log('\nDry run only. Remove --dry-run to call xAI.');
    return;
  }

  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY is not configured.');
  }

  const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
    timeout: 360_000,
  });

  const response = await client.responses.create(
    request as unknown as Parameters<typeof client.responses.create>[0],
  );

  const reasoningSummary = extractReasoningSummary(response);
  console.log('\n=== REASONING SUMMARY ===');
  console.log(reasoningSummary || 'No reasoning summary returned.');

  const outputText = extractResponseText(response);
  if (!outputText) {
    console.log('\n=== RAW RESPONSE ===');
    console.log(JSON.stringify(response, null, 2));
    throw new Error('No output_text returned.');
  }

  const scanResult = parseScanResult(outputText);

  printScanResult(scanResult);
  printValidation(response);
}

main().catch((error) => {
  console.error('\nScratchpad scan failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
