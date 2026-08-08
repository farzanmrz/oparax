/** Raw HTML is capped before any synchronous parser sees it. The same ceiling applies to
 * article extraction and listing pages so one hostile response cannot exhaust the worker. */
export const MAX_HTML_LENGTH = 5_000_000;

export async function readHtmlWithinLimit(res: Response, url: string): Promise<string> {
  const contentLength = Number(res.headers.get("content-length") ?? "0");
  if (contentLength > MAX_HTML_LENGTH) {
    await res.body?.cancel();
    throw new Error(`HTML ${url} declared body too large (${contentLength} bytes)`);
  }

  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0;
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return html + decoder.decode();
    bytes += value.byteLength;
    if (bytes > MAX_HTML_LENGTH) {
      await reader.cancel();
      throw new Error(`HTML ${url} body too large (${bytes} bytes)`);
    }
    html += decoder.decode(value, { stream: true });
  }
}
