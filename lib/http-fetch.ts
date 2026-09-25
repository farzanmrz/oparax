// lib/http-fetch.ts
//
// assertFetchOk is the only export, keeping non-2xx errors consistent across callers
// while preserving their provider-specific labels and endpoint names.
export async function assertFetchOk(label: string, endpoint: string, res: Response): Promise<void> {
  if (res.ok) return;
  const text = await res.text();
  throw new Error(`${label} ${endpoint} ${res.status}: ${text.slice(0, 500)}`);
}
