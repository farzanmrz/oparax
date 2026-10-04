// The recorded sample run beside the setup form (design preview v2/one/setup.tsx): what one sentence became in a
// recorded onboarding run. Fixed example copy, labelled "Sample" on the page; never read as this person's data.
// Source rows are real rows of docs/source-table-seed.json; the stories are verified cards from that run's sources.

export type SampleSource = { name: string; kind: "x" | "site"; mark: string };

export const setupSample = {
  beat: "AI developer tools and model releases, especially Next.js, Vercel and open models",
  interests: ["Next.js", "Vercel and its AI Gateway", "open models", "developer tools", "AI SDK"],
  groups: [
    {
      label: "X accounts",
      sources: [
        { name: "@nextjs", kind: "x", mark: "nextjs" },
        { name: "@vercel", kind: "x", mark: "vercel" },
        { name: "@rauchg", kind: "x", mark: "rauchg" },
        { name: "@leerob", kind: "x", mark: "leerob" },
        { name: "@huggingface", kind: "x", mark: "huggingface" },
        { name: "@simonw", kind: "x", mark: "simonw" },
        { name: "@alibaba_qwen", kind: "x", mark: "alibaba_qwen" },
      ],
    },
    {
      label: "RSS feeds",
      sources: [
        { name: "Vercel", kind: "site", mark: "vercel.com" },
        { name: "Hugging Face", kind: "site", mark: "huggingface.co" },
        { name: "Simon Willison", kind: "site", mark: "simonwillison.net" },
        { name: "Nathan Lambert", kind: "site", mark: "interconnects.ai" },
        { name: "Latent Space", kind: "site", mark: "latent.space" },
        { name: "Builder.io", kind: "site", mark: "builder.io" },
        { name: "OpenRouter", kind: "site", mark: "openrouter.ai" },
        { name: "Mistral AI", kind: "site", mark: "mistral.ai" },
        { name: "The Decoder", kind: "site", mark: "the-decoder.com" },
      ],
    },
    {
      label: "Websites",
      sources: [{ name: "Cursor", kind: "site", mark: "cursor.com" }],
    },
  ] satisfies { label: string; sources: SampleSource[] }[],
  stories: [
    {
      headline: "OpenAI launches GPT-6.1 Sol at a fifth of Astra's price",
      time: "Sep 30, 05:53",
      image: "https://static.simonwillison.net/static/2026/live-20260929-092441.webp",
    },
    {
      headline: "Olmo-core 3 scales open MoE training past a trillion parameters",
      time: "Oct 1, 15:01",
      image:
        "https://cdn-uploads.huggingface.co/production/uploads/638e39b249de7ae552d977b5/uKnK93gjkKbmJmSx94WO2.png",
    },
    {
      headline: "Microsoft AI models arrive on Vercel's AI Gateway",
      time: "Oct 1, 00:00",
      image:
        "https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/4VUQPah80J1WYBwplwXQjh/341d68a8100d89550907348d511d49db/image__111_.png",
    },
  ],
} as const;
