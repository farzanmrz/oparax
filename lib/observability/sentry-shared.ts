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
 * 10% in production, everything in development.
 *
 * The wizard's default was 1 everywhere, which this app cannot afford: the create-agent screen
 * polls `getExtractionProgress` every 1.75s for the whole length of an extraction (minutes), and
 * a server action is a POST — so one reporter watching one extraction generates ~34
 * transactions/minute on its own. At 100% sampling that is the dominant source of transaction
 * volume in the entire product, and it is the least interesting thing in it.
 *
 * Errors are NOT sampled by this — `tracesSampleRate` governs performance transactions only.
 * Every exception is still captured at 100%.
 */
export const TRACES_SAMPLE_RATE = process.env.NODE_ENV === "production" ? 0.1 : 1;

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
 * A request body, a cookie, or a genAI input/output here routinely carries the Supabase session
 * JWT (`cookies`/`httpHeaders`, since the JWT lives in the Cookie header), a reporter's
 * unpublished draft, their beat, the source posts behind a story, or the extracted voice guide —
 * their own unpublished journalism. That is the most sensitive content the product handles and
 * it has no place in a third-party error report; a stack trace plus the user identity is enough
 * to debug with. `userInfo` stays on: knowing WHICH reporter hit an error is most of the
 * diagnostic value, and it is their own account identity, not their work. `frameContextLines`
 * stays on too: source lines around a frame are code, not user data.
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
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  stackFrameVariables: false,
  frameContextLines: 5,
};
