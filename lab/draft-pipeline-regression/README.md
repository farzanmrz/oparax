# Drafting pipeline regression

Run `pnpm regression:drafting:export` once against the connected project to materialize immutable source, desk, guide, and provenance fixtures. The exporter selects only the X account tier and never exports account tokens.

Run `pnpm regression:drafting` after prompt or pipeline changes. It verifies fixture hashes before calling the pure stage functions, writes `.feature/regression-120.json`, collects every case, and exits nonzero if a contract or the direct-language translator-removal gate fails.

The frozen old-path comparison resolves prompts from Git SHA `1ce4d55`; ordinary runs do not read or write product rows, model-call rows, usage rows, stories, drafts, or exclusions.
