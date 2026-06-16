// Imports
import type OpenAI from "openai";

// Defaults shared by the test form and the terminal script.
export const allowedXHandles = [
  "talkfcb_",
  "EduardoHagn",
  "FabrizioRomano",
  "DavidOrnstein",
  "Glongari",
  "cfcpys",
  "Barza_Buzz",
  "Messilizer0",
  "fcbarcelona",
  "BarcaSpaces",
  "NealGardner_",
];
export const defaultUserPrompt =
  "All news around FC Barcelona, including transfers, league news, rumors, murmurs, and anything relevant around the club.";
export const maxXHandles = 20;
export const requestTimeoutMs = 180_000;
export const scanningInstructionsMaxChars = 4_000;
export const scanningInstructionsMaxLines = 40;

// Supported schedule modes for the test workflow page.
export const testScheduleFrequencies = [
  "hourly",
  "daily",
  "weekly",
] as const;
export type TestScheduleFrequency = (typeof testScheduleFrequencies)[number];

// Weekday values use JavaScript's local Date.getDay() numbering.
export const weekdayOptions = [
  {
    value: 0,
    shortLabel: "Sun",
    label: "Sunday",
  },
  {
    value: 1,
    shortLabel: "Mon",
    label: "Monday",
  },
  {
    value: 2,
    shortLabel: "Tue",
    label: "Tuesday",
  },
  {
    value: 3,
    shortLabel: "Wed",
    label: "Wednesday",
  },
  {
    value: 4,
    shortLabel: "Thu",
    label: "Thursday",
  },
  {
    value: 5,
    shortLabel: "Fri",
    label: "Friday",
  },
  {
    value: 6,
    shortLabel: "Sat",
    label: "Saturday",
  },
] as const;
export type WeekdayValue = (typeof weekdayOptions)[number]["value"];

export interface TestScanSchedule {
  frequency: TestScheduleFrequency;
  interval: number;
  startsOn: string;
  timezone: string;
  windowStart: string;
  windowEnd: string;
  runAt: string;
  weekdays: WeekdayValue[];
}

export interface TestScanItem {
  title: string;
  body: string;
  urls: string[];
}

export interface TestScanMetrics {
  costUsd: number | null;
  elapsedMs: number;
  xSearchCalls: number | null;
}

export type TestScanStreamEvent =
  | {
      type: "reasoning_delta";
      text: string;
    }
  | {
      type: "tool_call_started";
      id: string;
      name: string;
    }
  | {
      type: "tool_call_input_delta";
      id: string;
      text: string;
    }
  | {
      type: "tool_call_completed";
      id: string;
      input: string;
    }
  | {
      type: "completed";
      items: TestScanItem[];
      metrics: TestScanMetrics;
    }
  | {
      type: "error";
      message: string;
    };

/**
 * Checks whether an unknown value is object-like and safe to inspect.
 * @param value - the value to check before reading dynamic fields
 * @returns true when the value is a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Checks whether a value is one of the supported schedule frequencies.
 * @param value - the raw frequency value to inspect
 * @returns true when the value is hourly, daily, or weekly
 */
export function isTestScheduleFrequency(value: unknown): value is TestScheduleFrequency {
  return (
    typeof value === "string" && testScheduleFrequencies.includes(value as TestScheduleFrequency)
  );
}

/**
 * Counts user-visible instruction lines after newline normalization.
 * @param value - the scanning instructions text
 * @returns the number of lines, with empty text counted as zero
 */
export function countScanningInstructionLines(value: string): number {
  return value ? value.replace(/\r\n?/g, "\n").split("\n").length : 0;
}

/**
 * Trims scanning instructions to the supported char and line caps.
 * @param value - the raw textarea value
 * @returns normalized instructions that fit the configured limits
 */
export function limitScanningInstructions(value: string): string {
  // Normalize platform-specific newlines before applying the line cap.
  const normalized = value.replace(/\r\n?/g, "\n");

  // Keep only the supported number of instruction lines.
  const limitedLines = normalized.split("\n").slice(0, scanningInstructionsMaxLines).join("\n");

  return limitedLines.slice(0, scanningInstructionsMaxChars);
}

/**
 * Builds the validation message for the scanning instructions field.
 * @param value - the current scanning instructions text
 * @returns a validation message, or null when the value is valid
 */
export function getScanningInstructionsError(value: string): string | null {
  // Text after trimming whitespace-only input.
  const trimmed = value.trim();
  if (!trimmed) {
    return "Scanning instructions are required.";
  }

  if (value.length > scanningInstructionsMaxChars) {
    return `Keep scanning instructions under ${scanningInstructionsMaxChars} characters.`;
  }

  if (countScanningInstructionLines(value) > scanningInstructionsMaxLines) {
    return `Keep scanning instructions under ${scanningInstructionsMaxLines} lines.`;
  }

  return null;
}

/**
 * Returns the inclusive interval range for the selected frequency.
 * @param frequency - the selected schedule frequency
 * @returns the minimum and maximum interval for that frequency
 */
export function getScheduleIntervalRange(frequency: TestScheduleFrequency) {
  // Map each frequency to the interval range used by the UI and API.
  switch (frequency) {
    case "hourly":
      return {
        min: 1,
        max: 24,
      };
    case "daily":
      return {
        min: 1,
        max: 31,
      };
    case "weekly":
      return {
        min: 1,
        max: 52,
      };
  }
}

/**
 * Checks whether a time string uses the HH:MM input format.
 * @param value - the raw time value to validate
 * @returns true when the value is a valid 24-hour time string
 */
function isTimeValue(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  // Time parts parsed from the HH:MM value.
  const [hour, minute] = value.split(":").map(Number);

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/**
 * Checks whether a date string uses the YYYY-MM-DD input format.
 * @param value - the raw date value to validate
 * @returns true when the value can be carried as a local date
 */
function isDateValue(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Checks whether a number is a supported weekday value.
 * @param value - the weekday number to inspect
 * @returns true when the value is 0 through 6
 */
function isWeekdayValue(value: unknown): value is WeekdayValue {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

/**
 * Builds the validation message for a test workflow schedule.
 * @param schedule - the schedule config to validate
 * @returns a validation message, or null when the schedule is valid
 */
export function getTestScanScheduleError(schedule: TestScanSchedule): string | null {
  // Allowed interval range for the selected frequency.
  const range = getScheduleIntervalRange(schedule.frequency);

  if (
    !Number.isInteger(schedule.interval) ||
    schedule.interval < range.min ||
    schedule.interval > range.max
  ) {
    return `Repeat interval must be ${range.min}-${range.max}.`;
  }

  if (!isDateValue(schedule.startsOn)) {
    return "Choose a valid start date.";
  }

  if (!schedule.timezone.trim()) {
    return "Choose a timezone.";
  }

  if (!isTimeValue(schedule.runAt)) {
    return "Choose a valid run time.";
  }

  if (!isTimeValue(schedule.windowStart) || !isTimeValue(schedule.windowEnd)) {
    return "Choose a valid active-hours window.";
  }

  if (schedule.frequency === "hourly" && schedule.windowStart >= schedule.windowEnd) {
    return "Active hours must end after they start.";
  }

  if (schedule.frequency === "weekly" && schedule.weekdays.length === 0) {
    return "Choose at least one weekday.";
  }

  return null;
}

/**
 * Parses an unknown request value into a test scan schedule.
 * @param value - the raw schedule payload from the request body
 * @returns a normalized schedule, or null when the payload is invalid
 */
export function parseTestScanSchedule(value: unknown): TestScanSchedule | null {
  if (!isRecord(value) || !isTestScheduleFrequency(value.frequency)) {
    return null;
  }

  // Weekdays carried by the client for weekly schedules.
  const weekdays = Array.isArray(value.weekdays) ? value.weekdays.filter(isWeekdayValue) : [];

  // Candidate schedule assembled from the request payload.
  const schedule: TestScanSchedule = {
    frequency: value.frequency,
    interval: typeof value.interval === "number" ? value.interval : Number.NaN,
    startsOn: typeof value.startsOn === "string" ? value.startsOn : "",
    timezone: typeof value.timezone === "string" ? value.timezone : "",
    windowStart: typeof value.windowStart === "string" ? value.windowStart : "",
    windowEnd: typeof value.windowEnd === "string" ? value.windowEnd : "",
    runAt: typeof value.runAt === "string" ? value.runAt : "",
    weekdays,
  };

  return getTestScanScheduleError(schedule) ? null : schedule;
}

/**
 * Encodes one typed test scan event as an NDJSON line.
 * @param event - the event to encode into the stream
 * @returns a JSON line for the browser stream reader
 */
export function encodeTestScanEvent(event: TestScanStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Builds the xAI Responses API parameters for one scan.
 * @param input - user prompt and monitored handles for this scan
 * @returns the streaming Responses API request parameters
 */
export function buildResponseParams(input: {
  handles: string[];
  userPrompt: string;
}): OpenAI.Responses.ResponseCreateParamsStreaming {
  return {
    model: "grok-4.3",
    instructions: `You are a source-grounded news aggregation assistant for professional reporters. You take the user prompt and retrieve relevant news about it.

Rules:
- Build one news item per atomic angle.
- Do not merge separate quotes, claims, or developments just because they involve the same person, club, interview, press conference, or match.
- Each item's urls array must include at least one direct X/Twitter source post/profile URL, and may include other supporting URLs.
- Return all distinct, non-overlapping news items you can find in reverse chronological order. Do not cap the list to a top-N summary.`,
    temperature: 0,
    top_p: 1,
    max_output_tokens: 1_000_000,
    max_turns: 5,
    reasoning: {
      effort: "low",
      summary: "detailed",
    },
    tools: [
      {
        type: "x_search",
        allowed_x_handles: input.handles,
        from_date: "2026-05-20",
        to_date: "2026-05-28",
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "atomic_news_items",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: {
                    type: "string",
                  },
                  body: {
                    type: "string",
                  },
                  urls: {
                    type: "array",
                    minItems: 1,
                    description:
                      "Source URLs for this item, including at least one direct X/Twitter URL.",
                    items: {
                      type: "string",
                      format: "uri",
                    },
                  },
                },
                required: [
                  "title",
                  "body",
                  "urls",
                ],
              },
            },
          },
          required: [
            "items",
          ],
        },
      },
    },
    stream: true,
    input: [
      {
        role: "user",
        content: input.userPrompt,
      },
    ],
  } as unknown as OpenAI.Responses.ResponseCreateParamsStreaming;
}

/**
 * Parses the final structured scan JSON into renderable cards.
 * @param value - the accumulated final output text
 * @returns valid scan items, or null when the output cannot be parsed
 */
function parseTestScanItems(value: string): TestScanItem[] | null {
  try {
    // Parsed structured output returned by the model.
    const parsed = JSON.parse(value) as unknown;

    if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
      return null;
    }

    return parsed.items
      .map((item) => normalizeTestScanItem(item))
      .filter((item): item is TestScanItem => item !== null);
  } catch {
    return null;
  }
}

/**
 * Normalizes one structured scan item from the model response.
 * @param value - the raw item from parsed JSON
 * @returns a safe item for the UI, or null when required fields are missing
 */
function normalizeTestScanItem(value: unknown): TestScanItem | null {
  if (!isRecord(value)) {
    return null;
  }

  // Required string fields for the final item card.
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const body = typeof value.body === "string" ? value.body.trim() : "";

  if (!title || !body || !Array.isArray(value.urls)) {
    return null;
  }

  // Unique non-empty source URLs for this item.
  const urls = [
    ...new Set(
      value.urls
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ];

  return urls.length > 0
    ? {
        title,
        body,
        urls,
      }
    : null;
}

/**
 * Reads cost and tool usage from the completed response.
 * @param response - the completed Responses API object
 * @param elapsedMs - elapsed request time in milliseconds
 * @returns metrics used by the test scan UI
 */
function buildTestScanMetrics(
  response: OpenAI.Responses.Response | undefined,
  elapsedMs: number,
): TestScanMetrics {
  // Usage fields exposed by xAI after a streamed response completes.
  const usage = isRecord(response?.usage) ? response.usage : null;
  const toolUsage = isRecord(usage?.server_side_tool_usage_details)
    ? usage.server_side_tool_usage_details
    : null;
  const costTicks = usage?.cost_in_usd_ticks;

  return {
    elapsedMs,
    xSearchCalls: typeof toolUsage?.x_search_calls === "number" ? toolUsage.x_search_calls : null,
    costUsd: typeof costTicks === "number" ? Number((costTicks / 1e10).toFixed(6)) : null,
  };
}

/**
 * Converts a Responses API stream into typed UI events.
 */
export class TestScanStreamWriter {
  private answerText = "";
  private finalResponse: OpenAI.Responses.Response | undefined;
  private readonly startedAt: number;
  private readonly toolInputs = new Map<string, string>();
  private readonly write: (event: TestScanStreamEvent) => void;

  /**
   * Creates a typed stream writer for one test scan.
   * @param write - callback that writes one typed event to the response
   */
  constructor(write: (event: TestScanStreamEvent) => void) {
    this.startedAt = Date.now();
    this.write = write;
  }

  /**
   * Routes one xAI stream event to a typed browser event.
   * @param event - one event from the Responses API stream
   * @returns nothing
   */
  handle(event: OpenAI.Responses.ResponseStreamEvent) {
    // Dispatch each Responses API event into the smaller UI event contract.
    switch (event.type) {
      case "response.output_item.added":
        if (event.item.type === "custom_tool_call") {
          // Stable id used to associate later input deltas with this tool call.
          const toolCallId = event.item.id ?? event.item.call_id;

          this.toolInputs.set(toolCallId, "");
          this.write({
            type: "tool_call_started",
            id: toolCallId,
            name: event.item.name,
          });
        }
        break;
      case "response.reasoning_summary_text.delta":
      case "response.reasoning_text.delta":
        this.write({
          type: "reasoning_delta",
          text: event.delta,
        });
        break;
      case "response.custom_tool_call_input.delta":
        this.appendToolInput(event.item_id, event.delta);
        this.write({
          type: "tool_call_input_delta",
          id: event.item_id,
          text: event.delta,
        });
        break;
      case "response.custom_tool_call_input.done":
        this.toolInputs.set(event.item_id, event.input);
        this.write({
          type: "tool_call_completed",
          id: event.item_id,
          input: event.input,
        });
        break;
      case "response.output_text.delta":
        this.answerText += event.delta;
        break;
      case "response.completed":
        this.finalResponse = event.response;
        if (!this.answerText && event.response.output_text) {
          this.answerText = event.response.output_text;
        }
        break;
      case "error":
        this.write({
          type: "error",
          message: event.message,
        });
        break;
      case "response.failed":
        this.write({
          type: "error",
          message: event.response.error?.message ?? "Scan response failed.",
        });
        break;
      case "response.incomplete":
        this.write({
          type: "error",
          message: "Scan response ended before completion.",
        });
        break;
    }
  }

  /**
   * Emits the final parsed items and metrics.
   * @returns nothing
   */
  finish() {
    // Parsed item cards from the final structured JSON.
    const items = parseTestScanItems(this.answerText);

    if (!items) {
      this.write({
        type: "error",
        message: "Scan completed, but the final JSON could not be parsed.",
      });
      return;
    }

    this.write({
      type: "completed",
      items,
      metrics: buildTestScanMetrics(this.finalResponse, Date.now() - this.startedAt),
    });
  }

  /**
   * Appends one tool input delta to the per-tool buffer.
   * @param id - the streamed tool call item id
   * @param delta - the latest tool input delta
   * @returns nothing
   */
  private appendToolInput(id: string, delta: string) {
    // Existing input for this tool call, if any.
    const previous = this.toolInputs.get(id) ?? "";

    this.toolInputs.set(id, previous + delta);
  }
}

/**
 * Formats typed scan events as terminal text for the local script.
 */
export class ScanOutputWriter {
  private answerStarted = false;
  private reasoningStarted = false;
  private toolCallsStarted = false;
  private readonly inputBuffers = new Map<string, string>();
  private readonly toolNames = new Map<string, string>();
  private readonly streamWriter: TestScanStreamWriter;
  private readonly write: (value: string) => void;

  /**
   * Creates a terminal text writer around the typed scan stream.
   * @param write - callback that writes text to the terminal
   */
  constructor(write: (value: string) => void) {
    this.write = write;
    this.streamWriter = new TestScanStreamWriter((event) => {
      this.handleTypedEvent(event);
    });
  }

  /**
   * Routes one xAI stream event through the typed writer.
   * @param event - one event from the Responses API stream
   * @returns nothing
   */
  handle(event: OpenAI.Responses.ResponseStreamEvent) {
    this.streamWriter.handle(event);
  }

  /**
   * Flushes final output from the wrapped typed writer.
   * @returns nothing
   */
  finish() {
    this.streamWriter.finish();
  }

  /**
   * Formats one typed event for terminal output.
   * @param event - the typed test scan event
   * @returns nothing
   */
  private handleTypedEvent(event: TestScanStreamEvent) {
    // Map each typed event to the legacy terminal sections.
    switch (event.type) {
      case "reasoning_delta":
        this.writeReasoningDelta(event.text);
        break;
      case "tool_call_started":
        this.inputBuffers.set(event.id, "");
        this.toolNames.set(event.id, event.name);
        break;
      case "tool_call_input_delta":
        this.inputBuffers.set(event.id, `${this.inputBuffers.get(event.id) ?? ""}${event.text}`);
        break;
      case "tool_call_completed":
        this.writeToolCall(event.id, event.input);
        break;
      case "completed":
        this.writeCompletedOutput(event.items, event.metrics);
        break;
      case "error":
        this.write(`\n\n=== ERROR ===\n${event.message}\n`);
        break;
    }
  }

  /**
   * Writes one reasoning text delta with the legacy header.
   * @param text - the latest reasoning delta
   * @returns nothing
   */
  private writeReasoningDelta(text: string) {
    if (!this.reasoningStarted) {
      this.write("\n\n=== REASONING SUMMARY ===\n");
      this.reasoningStarted = true;
    }

    this.write(text);
  }

  /**
   * Writes one completed tool call block.
   * @param id - the streamed tool call item id
   * @param input - the completed tool input
   * @returns nothing
   */
  private writeToolCall(id: string, input: string) {
    if (!this.toolCallsStarted) {
      this.write("\n\n=== TOOL CALLS ===\n");
      this.toolCallsStarted = true;
    }

    this.write(
      `${JSON.stringify(
        {
          tool_name: this.toolNames.get(id) ?? id,
          input: input || this.inputBuffers.get(id) || "(no input)",
        },
        null,
        2,
      )}\n`,
    );
  }

  /**
   * Writes final items and metrics to the terminal.
   * @param items - parsed structured scan items
   * @param metrics - scan cost and tool usage metrics
   * @returns nothing
   */
  private writeCompletedOutput(items: TestScanItem[], metrics: TestScanMetrics) {
    if (!this.answerStarted) {
      this.write("\n\n=== STRUCTURED JSON ===\n");
      this.answerStarted = true;
    }

    this.write(
      `${JSON.stringify(
        {
          items,
        },
        null,
        2,
      )}\n`,
    );
    this.write("\n\n=== RESPONSE METRICS ===\n");
    this.write(
      `${JSON.stringify(
        {
          x_search_calls: metrics.xSearchCalls,
          cost_usd: metrics.costUsd,
        },
        null,
        2,
      )}\n`,
    );
  }
}
