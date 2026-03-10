import OpenAI from "openai"

export function createXaiClient() {
  return new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
  })
}

export function extractResponseText(response: unknown): string | null {
  if (
    typeof response === "object" &&
    response !== null &&
    "output_text" in response &&
    typeof response.output_text === "string"
  ) {
    return response.output_text
  }

  if (
    typeof response !== "object" ||
    response === null ||
    !("output" in response) ||
    !Array.isArray(response.output)
  ) {
    return null
  }

  for (const item of response.output) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("type" in item) ||
      item.type !== "message" ||
      !("content" in item) ||
      !Array.isArray(item.content)
    ) {
      continue
    }

    for (const content of item.content) {
      if (
        typeof content === "object" &&
        content !== null &&
        "type" in content &&
        content.type === "output_text" &&
        "text" in content &&
        typeof content.text === "string"
      ) {
        return content.text
      }
    }
  }

  return null
}
