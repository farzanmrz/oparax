// AI SDK surface (confirmed against installed versions in Task A1):
//   ai: 6.0.206  @ai-sdk/xai: 3.0.95  @ai-sdk/react: 3.0.208
//   structured output param: output  (NOT experimental_output — that's the v5 deprecated alias)
//   partial stream getter:   partialOutputStream  (experimental_partialOutputStream is deprecated alias)
//   final structured object:  await result.output  (PromiseLike<InferCompleteOutput<OUTPUT>>)
//
//   xai.responses(modelId) — confirmed on XaiProvider.responses
//   xai.tools.xSearch({ allowedXHandles?, excludedXHandles?, fromDate?, toDate?,
//                        enableImageUnderstanding?, enableVideoUnderstanding? })
//   NOTE: NO handle-count cap in the type definition.
//   NOTE: The plan mentions `allowedXHandles` — confirmed. NOT `includedXHandles`
//         (that name appears only inside searchParameters.sources[type:"x"], a different API).
//   xai.tools.webSearch({ allowedDomains?, excludedDomains?, enableImageSearch?,
//                          enableImageUnderstanding? })
//   xai responses include option ONLY accepts "file_search_call.results" (not "no_inline_citations");
//   omit the include field in B1 providerOptions.
//
//   Output: `import { Output } from "ai"` (module does `export { output as Output }`, public name is Output)
//   Output.object({ schema }) — confirmed
//   convertToModelMessages, generateObject, streamText, stepCountIs — all confirmed exports from "ai"
import { xai } from "@ai-sdk/xai";

// Gateway models for search-free calls (chat, draft). Cheapest tier; requires paid Gateway credits.
export const CHAT_MODEL = "deepseek/deepseek-v4-flash";
export const DRAFT_MODEL = "deepseek/deepseek-v4-flash";

// Failover for Gateway calls (xSearch never routes here). grok-4.3 is verified-accessible on this Gateway.
// Not `as const` so callers can spread { ...GATEWAY_PROVIDER_OPTIONS } into providerOptions without readonly friction.
export const GATEWAY_PROVIDER_OPTIONS = {
  gateway: {
    models: ["xai/grok-4.3"],
    // Prefer the cheapest BYOK provider that can serve the requested model.
    sort: "cost",
  },
};

// Direct xAI Responses model id for search-bound calls (the scan).
export const SCAN_MODEL = "grok-4.3";

export { xai };
