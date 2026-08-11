import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertionForFixture, type RegressionFixture } from "./cases";

const FIXTURES: Array<{
  id: string;
  sourcePostId: string;
  contextSourcePostId?: string;
}> = [
  { id: "deco", sourcePostId: "5ab0d6dc-46d7-4d2f-a7f8-7d4d1255d23b" },
  {
    id: "rodri-fabricated-real-madrid",
    sourcePostId: "d3e4bdd8-ff91-4a12-9ae9-aa946283020b",
  },
  { id: "rodri-nationality", sourcePostId: "297cabdc-28d7-4879-81fe-565a06fc025c" },
  { id: "offbeat-tycsports", sourcePostId: "a73fd4da-0f88-422a-8f0b-7bde04369806" },
  {
    id: "media-only",
    sourcePostId: "df6d72d8-245a-46ec-bf83-116ef828ad28",
    contextSourcePostId: "5ab0d6dc-46d7-4d2f-a7f8-7d4d1255d23b",
  },
  { id: "supplemental-es-website", sourcePostId: "28379caa-6357-4689-ad1e-65b0f71e7b34" },
  { id: "supplemental-es-x", sourcePostId: "be016b7a-9170-42ac-b9e7-eec34e6839ac" },
  { id: "supplemental-fr-x", sourcePostId: "10cf08f2-5fa0-44ea-ba72-b899b5e6742a" },
  { id: "supplemental-ar-x", sourcePostId: "e2805bd0-919c-4558-8f5d-5c56040e8800" },
  { id: "supplemental-ca-website", sourcePostId: "a0fb3b1b-aa92-4202-b2b4-f89b469711ac" },
  { id: "supplemental-ca-x", sourcePostId: "ac98b12c-d0ef-4314-b29a-3db72a93a047" },
  { id: "supplemental-it-x", sourcePostId: "db8e885e-d3f6-4b60-8c84-f29a3b1b69e1" },
  { id: "supplemental-pt-x", sourcePostId: "65e87374-0a14-449e-a28e-bf343d1c30d7" },
  { id: "supplemental-ro-x", sourcePostId: "641b19d0-18a3-44db-b065-528ed5fc12d2" },
  { id: "supplemental-de-x", sourcePostId: "9ae13903-3a85-4755-979c-f144f808e387" },
  { id: "supplemental-pl-x", sourcePostId: "413a0b61-18b5-40df-8ce1-cb874b521ea5" },
  { id: "supplemental-ht-x", sourcePostId: "825142e9-cebf-4729-86c0-af88b8b21142" },
];

const DEFAULT_CONTEXT_SOURCE_POST_ID = "5ab0d6dc-46d7-4d2f-a7f8-7d4d1255d23b";

const stable = (value: unknown) => JSON.stringify(value);
const hash = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");

export function withHashes(fixture: Omit<RegressionFixture, "hashes">): RegressionFixture {
  return {
    ...fixture,
    hashes: {
      source: hash(fixture.source),
      context: hash(fixture.context),
      fixture: hash(fixture),
    },
  };
}

async function exportFixture(
  id: string,
  sourcePostId: string,
  contextSourcePostId = sourcePostId,
): Promise<RegressionFixture> {
  const admin = createAdminClient();
  const { data: source, error: sourceError } = await admin
    .from("source_posts")
    .select("id, x_post_id, author_handle, text, title, lang, raw, source, source_config_id, url")
    .eq("id", sourcePostId)
    .single();
  if (sourceError || !source) throw sourceError ?? new Error(`Missing source ${sourcePostId}`);
  const { data: draft } = await admin
    .from("drafts")
    .select("agent_id, id")
    .eq("source_post_id", contextSourcePostId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const { data: exclusion } = draft
    ? { data: null }
    : await admin
        .from("excluded_posts")
        .select("agent_id")
        .eq("source_post_id", contextSourcePostId)
        .maybeSingle();
  const agentId = draft?.agent_id ?? exclusion?.agent_id;
  if (!agentId && contextSourcePostId !== DEFAULT_CONTEXT_SOURCE_POST_ID) {
    return exportFixture(id, sourcePostId, DEFAULT_CONTEXT_SOURCE_POST_ID);
  }
  if (!agentId) throw new Error(`No desk provenance for source context ${contextSourcePostId}`);
  const { data: agent, error: agentError } = await admin
    .from("agents")
    .select("id, owner_id, beat, reporter_tier")
    .eq("id", agentId)
    .single();
  if (agentError || !agent) throw agentError ?? new Error(`Missing agent ${agentId}`);
  const [{ data: config }, { data: guide }, { data: rules }, { data: account }] = await Promise.all(
    [
      source.source_config_id
        ? admin
            .from("source_configs")
            .select("id, beat_guidance, language")
            .eq("id", source.source_config_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("voice_guides")
        .select("id, guide_raw, guide_deploy, measured_facts")
        .eq("agent_id", agent.id)
        .maybeSingle(),
      admin
        .from("voice_rules")
        .select("rule, sort_order, enabled")
        .eq("agent_id", agent.id)
        .order("sort_order", { ascending: true }),
      admin.from("x_accounts").select("tier").eq("user_id", agent.owner_id).maybeSingle(),
    ],
  );
  if (!guide) throw new Error(`No voice guide for source ${sourcePostId}`);
  type RawMedia = {
    type?: string;
    kind?: string;
    imageUrl?: string;
    url?: string;
    preview_image_url?: string;
  };
  const raw = source.raw as { media?: RawMedia[]; includes?: { media?: RawMedia[] } } | null;
  const media = (raw?.media ?? raw?.includes?.media ?? [])
    .map((item) => ({
      kind: item.kind ?? item.type ?? "image",
      imageUrl: item.imageUrl ?? item.url ?? item.preview_image_url ?? "",
    }))
    .filter((item) => item.imageUrl.startsWith("https://"));
  const fixtureWithoutHashes = {
    id,
    source: {
      sourcePostId: source.id,
      xPostId: source.x_post_id,
      identity:
        source.source === "website"
          ? {
              kind: "website" as const,
              publisher: new URL(source.url ?? "https://unknown.invalid").hostname,
            }
          : { kind: "x" as const, handle: source.author_handle ?? "unknown" },
      text: source.text,
      title: source.title,
      lang: source.lang ?? config?.language ?? null,
      media,
    },
    context: {
      beat: agent.beat,
      siteGuidance: (config?.beat_guidance as { onBeat: string; offBeat: string } | null) ?? null,
      publisherClaimKind:
        source.source === "website"
          ? ("outlet-characterization" as const)
          : ("aggregator" as const),
      reporterTier: agent.reporter_tier,
      accountTier: account?.tier === "premium" ? ("premium" as const) : ("standard" as const),
      voiceGuide: {
        guideRaw: guide.guide_raw,
        guideDeploy: guide.guide_deploy,
        measuredFacts: guide.measured_facts,
        rules: rules ?? [],
      },
    },
    provenance: {
      sourcePostId: source.id,
      sourceConfigId: source.source_config_id,
      contextSourcePostId,
      agentId: agent.id,
      voiceGuideId: guide.id,
      draftId: draft?.id ?? null,
    },
    assertions: assertionForFixture(id),
  };
  return withHashes(fixtureWithoutHashes);
}

function lazyFixture(seed: RegressionFixture): RegressionFixture {
  return withHashes({
    id: "lazy-x",
    source: {
      sourcePostId: "fixture-lazy-x",
      xPostId: "fixture-lazy-x",
      identity: { kind: "x", handle: "fixture_news" },
      text: "Cuti Romero is still waiting for Barcelona before deciding his future.",
      title: null,
      lang: "en",
      media: [],
    },
    context: {
      ...seed.context,
      publisherClaimKind: "aggregator",
    },
    provenance: {
      sourcePostId: "fixture-lazy-x",
      sourceConfigId: null,
      agentId: seed.provenance.agentId,
      voiceGuideId: seed.provenance.voiceGuideId,
      draftId: null,
    },
    assertions: assertionForFixture("lazy-x"),
  });
}

export function handBuiltFixtures(seed: RegressionFixture): RegressionFixture[] {
  const sourceDefaults = {
    title: null,
    media: [] as { kind: string; imageUrl: string }[],
  };
  const fixture = (
    id: string,
    source: RegressionFixture["source"],
    context: RegressionFixture["context"] = seed.context,
  ) =>
    withHashes({
      id,
      source,
      context,
      provenance: {
        sourcePostId: source.sourcePostId,
        sourceConfigId: null,
        agentId: seed.provenance.agentId,
        voiceGuideId: context.voiceGuide.guideDeploy ? seed.provenance.voiceGuideId : null,
        draftId: null,
      },
      assertions: assertionForFixture(id),
    });
  const joanGarciaCard = {
    kind: "photo",
    imageUrl: "https://pbs.twimg.com/media/HPYs4aQWcAABFts.jpg",
  };
  return [
    fixture("quote-tweet-sticky-kind", {
      ...sourceDefaults,
      sourcePostId: "fixture-quote-tweet-sticky-kind",
      xPostId: "fixture-quote-tweet-sticky-kind",
      identity: { kind: "x", handle: "fixture_aggregator" },
      text: 'FC Barcelona: "Joan Garcia has signed a new contract until 2031."',
      lang: "en",
    }),
    fixture("offbeat-text-onbeat-image", {
      ...sourceDefaults,
      sourcePostId: "fixture-offbeat-text-onbeat-image",
      xPostId: "fixture-offbeat-text-onbeat-image",
      identity: { kind: "x", handle: "fixture_mixed" },
      text: "Se reveló el origen de la bandera de Malvinas usada en los festejos de Argentina.",
      lang: "es",
      media: [joanGarciaCard],
    }),
    fixture("image-emoji", {
      ...sourceDefaults,
      sourcePostId: "fixture-image-emoji",
      xPostId: "fixture-image-emoji",
      identity: { kind: "x", handle: "fixture_image" },
      text: "🔵🔴",
      lang: "zxx",
      media: [joanGarciaCard],
    }),
    fixture(
      "empty-voice-guide",
      {
        ...sourceDefaults,
        sourcePostId: "fixture-empty-voice-guide",
        xPostId: "fixture-empty-voice-guide",
        identity: { kind: "x", handle: "fixture_news" },
        text: "Barcelona have signed Alex Smith on a contract until 2030, according to Fixture News.",
        lang: "en",
      },
      {
        ...seed.context,
        publisherClaimKind: "aggregator",
        voiceGuide: { guideRaw: "", guideDeploy: "", measuredFacts: "", rules: [] },
      },
    ),
    fixture("mislabeled-lang", {
      ...sourceDefaults,
      sourcePostId: "fixture-mislabeled-lang",
      xPostId: "fixture-mislabeled-lang",
      identity: { kind: "x", handle: "fixture_news" },
      text: "Barcelona have signed Alex Smith on a contract until 2030, according to Fixture News.",
      lang: "es",
    }),
  ];
}

async function main() {
  const directory = join(process.cwd(), "lab/draft-pipeline-regression/fixtures");
  await mkdir(directory, { recursive: true });
  const manifest: { fixtures: string[] } = { fixtures: [] };
  for (const descriptor of FIXTURES) {
    const fixture = await exportFixture(
      descriptor.id,
      descriptor.sourcePostId,
      descriptor.contextSourcePostId,
    );
    const filename = `${descriptor.id}.json`;
    await writeFile(join(directory, filename), `${JSON.stringify(fixture, null, 2)}\n`);
    manifest.fixtures.push(filename);
  }
  const deco = await exportFixture("deco", DEFAULT_CONTEXT_SOURCE_POST_ID);
  const lazy = lazyFixture(deco);
  await writeFile(join(directory, "lazy-x.json"), `${JSON.stringify(lazy, null, 2)}\n`);
  manifest.fixtures.push("lazy-x.json");
  for (const fixture of handBuiltFixtures(deco)) {
    const filename = `${fixture.id}.json`;
    await writeFile(join(directory, filename), `${JSON.stringify(fixture, null, 2)}\n`);
    manifest.fixtures.push(filename);
  }
  await writeFile(join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
