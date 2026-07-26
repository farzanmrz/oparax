// lib/observability/sentry-shared.ts
//
// The options all three Sentry runtimes (client / server / edge) must agree on. Pure constants,
// no side effects, no imports — safe to load from the edge config, which runs in the most
// restricted environment of the three.
//
// The three `sentry.*.config.ts` / `instrumentation-client.ts` files stay separate because
// Sentry's build plugin looks for them by name at the repo root. What lives here is only the
// values that would silently drift if written out three times.

/** Public by design — a DSN identifies a project, it does not authorize writes, and Sentry ships
 *  it to every browser. Kept inline rather than in `.env.local` for that reason: making it an env
 *  var would imply a secret and add a key that fails the build when absent. The one Sentry value
 *  that IS a secret is `SENTRY_AUTH_TOKEN` (source-map upload at build time), which lives in the
 *  gitignored `.env.sentry-build-plugin`. */
export const SENTRY_DSN =
  "https://03696c61b0352eb06d6fb34ac57e1b06@o4511794561548288.ingest.us.sentry.io/4511794564694016";

/**
 * 100%, everywhere — deliberately raised from the 10%-in-production this carried before.
 *
 * The reason it was 10% is unchanged and still true: the create-agent screen polls
 * `getExtractionProgress` every 1.75s for the whole length of an extraction, and a server action
 * is a POST, so one reporter watching one extraction produces ~34 transactions/minute on its own.
 * What changed is the fix. Sampling was the wrong instrument for it, because **an agent run is a
 * span tree and sampling decides at the ROOT**: the `gen_ai.*` spans are children of the route
 * that triggered them, so a 10% rate does not thin AI data, it deletes nine out of ten extractions
 * whole. For a product whose core is an LLM pipeline, that is the one thing sampling must not do.
 *
 * The polling is now dropped at its actual source instead — see `dropProgressPollTransactions`,
 * which discards exactly the poll and nothing else. A rate cannot make that distinction here:
 * `getExtractionProgress` and the extraction it reports on are server actions on the SAME routes
 * (`/agents/new`, `/agents/[id]/voice`), so no `tracesSampler` keyed on transaction name can keep
 * one and drop the other.
 *
 * Revisit if span volume becomes a quota problem — the lever is this constant, and the reason to
 * pull it would be cost, not noise.
 *
 * Errors are NOT sampled by this — `tracesSampleRate` governs performance transactions only.
 * Every exception is still captured at 100%.
 */
export const TRACES_SAMPLE_RATE = 1;

/** Tag key + value marking a transaction as the progress poll, set by `getExtractionProgress` and
 *  read back by `dropProgressPollTransactions`. Exported as constants so the writer and the reader
 *  cannot drift into disagreeing about a string literal — the failure mode there is silent
 *  (nothing dropped, no error) and would only show up as a quota bill. */
export const TRANSACTION_KIND_TAG = "oparax.transaction_kind";
export const PROGRESS_POLL_KIND = "progress_poll";

/**
 * `beforeSendTransaction` — drop the extraction progress poll, keep everything else.
 *
 * Runs after sampling, which is the point: the tag it keys on is set by application code INSIDE
 * the request, and a `tracesSampler` fires when the root span is created, before any of our code
 * has run. So the poll cannot be sampled out; it can only be discarded on the way out. That still
 * saves the quota, which is the entire cost being managed.
 *
 * Deliberately not a rate. Dropping 90% of polls would leave a tenth of a self-similar stream —
 * all noise, no new information. Dropping all of them loses nothing: the poll's own latency is
 * uninteresting, and if it ever fails it raises an ERROR, which this does not touch.
 */
export function dropProgressPollTransactions<T extends { tags?: { [k: string]: unknown } }>(
  event: T,
): T | null {
  return event.tags?.[TRANSACTION_KIND_TAG] === PROGRESS_POLL_KIND ? null : event;
}

/**
 * Every category spelled out explicitly — none left to the SDK's defaults.
 *
 * The trap: `resolveDataCollectionOptions` picks its base on ONE condition — whether
 * `dataCollection` is non-null, not on which keys it names. Passing ANY object, even one with a
 * single key set, selects the permissive `DEFAULTS` (userInfo, cookies, headers, bodies, query
 * params, GraphQL, genAI, DB query data, and stack-frame locals all ON) as the base for every
 * category this object does NOT mention. A partial object does not "narrow the defaults" — it
 * opts into them for everything left unnamed. So this object must name every field, every time.
 *
 * `cookies`/`httpHeaders`/`httpBodies` stay OFF and are not a preference. The Supabase session JWT
 * lives in the Cookie header, so switching those on ships a live credential to a third party —
 * that is a security hole, not a privacy setting, and no amount of debugging value buys it back.
 *
 * `genAI` is ON, reversing this file's original position, because the alternative was worse in a
 * way that showed up in practice. An extraction billed $0.31, burned 9,443 thinking tokens,
 * reported `finishReason: "stop"` and returned an EMPTY guide, and nothing in the product could
 * say why — the run was reconstructed from ad-hoc scripts because the one system that could have
 * recorded the model's actual output had been configured not to. `gen_ai.input.messages` and
 * `gen_ai.output.messages` are the attributes Sentry reconstructs an LLM call from; with them off,
 * every AI span arrives shaped correctly and completely empty, which reads as a broken integration
 * rather than a deliberate blank.
 *
 * What that costs, stated plainly rather than waved past: the extraction corpus (public X posts),
 * the system prompt, the reasoning summary, and the finished voice guide are stored by Sentry
 * under its retention policy. The guide is the softest of the sensitive artifacts — AGENTS.md's
 * own argument for the shared-guide model was that a guide is derived wholly from PUBLIC posts.
 * The hard one is an unpublished draft, and drafting is gated separately: see
 * `lib/observability/ai-telemetry.ts`, which records inputs/outputs per call and turns them OFF
 * for the drafting council. Turning this key on does not by itself publish a single draft.
 *
 * `userInfo` stays on: knowing WHICH reporter hit an error is most of the diagnostic value, and it
 * is their own account identity, not their work. `frameContextLines` stays on too: source lines
 * around a frame are code, not user data.
 */
// Left un-annotated on purpose: `httpBodies` is typed `HttpBodyCollectionTarget[]` by the SDK, so
// widening the empty array to `string[]` (or freezing the object with `as const`, which makes it
// readonly) both fail to assign. Inferred `never[]` is assignable to whatever the SDK's element
// type is now or becomes later.
export const SENTRY_DATA_COLLECTION = {
  userInfo: true,
  cookies: false,
  httpHeaders: { request: false, response: false },
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: true, outputs: true },
  databaseQueryData: false,
  stackFrameVariables: false,
  frameContextLines: 5,
};
