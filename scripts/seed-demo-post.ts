// scripts/seed-demo-post.ts
//
// The slice's "done when" trigger: a hand-seeded source post produces a Slack message
// carrying a draft in the reporter's voice. This script is a CLIENT of the delivery
// interface, never of the runner — it POSTs to `/api/ingest`, the exact interface Slice
// 3's always-on forwarder will use. It must NOT import draft-pipeline, draft-council-run,
// lib/notify/*, or lib/voice/* — proving that path would prove a code path the forwarder
// never takes.
//
// Requires: the dev server running (`pnpm dev`), and the Slack + Resend env vars
// configured (the draft pipeline notifies through them). Makes REAL paid model calls —
// the council is ~2 model calls + a judge. DO NOT run this from an agent session.
//
// Usage:
//   pnpm dlx tsx --env-file=.env.local scripts/seed-demo-post.ts <reporterHandle> <ownerEmail> "<source post text>" [sourceAuthorHandle]
//
// sourceAuthorHandle defaults to "OptaJoe" — the source post is authored by someone the
// reporter *tracks*, never by the reporter themself, so the reporter's own handle is wrong
// here. Pass the fourth arg to use a real tracked handle instead.
import { createAdminClient } from "@/lib/supabase/admin";

/** X handles are [A-Za-z0-9_], 1-15 chars. */
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

const DEFAULT_SOURCE_AUTHOR_HANDLE = "OptaJoe";

async function main() {
  const [reporterHandle, ownerEmail, text, sourceAuthorHandleArg] = process.argv.slice(2);
  if (!reporterHandle || !ownerEmail || !text) {
    throw new Error(
      'Usage: pnpm dlx tsx --env-file=.env.local scripts/seed-demo-post.ts <reporterHandle> <ownerEmail> "<source post text>" [sourceAuthorHandle]\n' +
        `  sourceAuthorHandle defaults to "${DEFAULT_SOURCE_AUTHOR_HANDLE}" (the source post's author, someone the reporter tracks — never the reporter's own handle).`,
    );
  }
  const sourceAuthorHandle = sourceAuthorHandleArg || DEFAULT_SOURCE_AUTHOR_HANDLE;

  if (!HANDLE_RE.test(reporterHandle)) {
    throw new Error(
      `Not a valid X handle: "${reporterHandle}" (expected [A-Za-z0-9_], 1-15 chars).`,
    );
  }
  if (!HANDLE_RE.test(sourceAuthorHandle)) {
    throw new Error(
      `Not a valid X handle: "${sourceAuthorHandle}" (expected [A-Za-z0-9_], 1-15 chars).`,
    );
  }

  const ingestSecret = process.env.INGEST_SECRET;
  if (!ingestSecret) {
    throw new Error("INGEST_SECRET is not set. Add it to .env.local before running this script.");
  }

  const admin = createAdminClient();
  const ownerId = await resolveOwnerId(admin, ownerEmail);

  // Find the experiment. Never create it here — a missing experiment means the slice-1
  // extraction script hasn't run for this reporter yet, and creating one from a demo
  // script would give the "no persistence until earned" guard a second, unaudited path.
  const { data: experiments, error: experimentError } = await admin
    .from("experiments")
    .select("id, tracked_handles")
    .eq("owner_id", ownerId)
    .eq("reporter_handle", reporterHandle)
    .order("created_at", { ascending: true })
    .limit(1);
  if (experimentError) throw experimentError;

  const experiment = experiments?.[0];
  if (!experiment) {
    throw new Error(
      `No experiments row for owner "${ownerEmail}" + reporter "@${reporterHandle}". ` +
        "Run scripts/extract-voice-guide.ts first to seed it.",
    );
  }

  // Ensure the source author is tracked — the pipeline routes deliveries by author, so
  // without this the post matches no experiment and nothing drafts.
  if (
    !experiment.tracked_handles.some(
      (h: string) => h.toLowerCase() === sourceAuthorHandle.toLowerCase(),
    )
  ) {
    const trackedHandles = [...experiment.tracked_handles, sourceAuthorHandle];
    const { error: updateError } = await admin
      .from("experiments")
      .update({ tracked_handles: trackedHandles })
      .eq("id", experiment.id);
    if (updateError) throw updateError;
    console.log(
      `Added "${sourceAuthorHandle}" to tracked_handles for experiment ${experiment.id} (now: ${trackedHandles.join(", ")}).`,
    );
  } else {
    console.log(`"${sourceAuthorHandle}" is already tracked for experiment ${experiment.id}.`);
  }

  // Verify a voice guide exists. Never create one here — an extraction is a paid call
  // that only scripts/extract-voice-guide.ts is allowed to trigger.
  const { data: voiceGuides, error: voiceGuideError } = await admin
    .from("voice_guides")
    .select("id")
    .eq("reporter_handle", reporterHandle)
    .limit(1);
  if (voiceGuideError) throw voiceGuideError;
  if (!voiceGuides?.length) {
    throw new Error(
      `No voice_guides row for reporter "@${reporterHandle}". ` +
        "Run scripts/extract-voice-guide.ts first to extract one.",
    );
  }

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const body = {
    x_post_id: `demo-${Date.now()}`,
    author_handle: sourceAuthorHandle,
    text,
    posted_at: new Date().toISOString(),
    raw: { seededBy: "scripts/seed-demo-post.ts" },
  };

  console.log(`POST ${baseUrl}/api/ingest`);
  const res = await fetch(`${baseUrl}/api/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ingestSecret}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  let responseJson: unknown;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = responseText;
  }

  console.log(`Status: ${res.status}`);
  console.log(JSON.stringify(responseJson, null, 2));

  if (!res.ok) {
    process.exit(1);
  }

  console.log("");
  console.log(
    "Check the Slack channel for the drafted post, and the `post_drafts` / `model_calls` / " +
      "`usage_events` rows for the sourcePostId returned above.",
  );
}

async function resolveOwnerId(
  admin: ReturnType<typeof createAdminClient>,
  ownerEmail: string,
): Promise<string> {
  const wanted = ownerEmail.toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  throw new Error(`No auth.users row found for email "${ownerEmail}".`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
