// Imports
import OpenAI from "openai";

// Grok request timeout (ms); mirrors the proven test-scan client
export const SCAN_REQUEST_TIMEOUT_MS = 180_000;

/**
 * Build a fresh Grok client (openai SDK pointed at api.x.ai) for a scan.
 * Built per SPEC §3.2 — the legacy lib/xai.ts is intentionally not reused.
 * @returns an OpenAI client configured for the xAI Responses API
 */
export function createScanClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
    timeout: SCAN_REQUEST_TIMEOUT_MS,
  });
}
