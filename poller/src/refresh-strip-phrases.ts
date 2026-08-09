import { INGEST_MAX_DURATION_MS } from "./deliver";
import { fetchWithTimeout } from "./http";

/** Asks the app — the only model-running authority — to refresh a legacy active source. The
 * app rechecks both active status and null strip_phrases before doing any work, so this is safe
 * to call on every serial poll tick until the refresh persists `[]` or measured phrases. */
export async function refreshLegacyStripPhrases(
  ingestUrl: string,
  ingestSecret: string,
  sourceConfigId: string,
): Promise<void> {
  const url = new URL("/api/sources/refresh-strip-phrases", ingestUrl);
  const res = await fetchWithTimeout(
    "StripPhraseRefresh",
    sourceConfigId,
    url.toString(),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ingestSecret}`,
      },
      body: JSON.stringify({ sourceConfigId }),
    },
    INGEST_MAX_DURATION_MS,
  );
  if (res.ok || res.status === 409) return;
  throw new Error(`strip phrase refresh ${sourceConfigId} ${res.status}: ${await res.text()}`);
}
