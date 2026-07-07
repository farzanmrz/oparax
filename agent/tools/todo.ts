import { disableTool } from "eve/tools";

// `todo` is eve's durable per-session task list (the model adds/checks items to
// track a multi-step task, and compaction re-injects it). Not needed for a
// conversational chat; disabled — this file also documents that it exists.
export default disableTool();
