import { disableTool } from "eve/tools";

// web_search is deferred (see .claude/references/agent.md "Web search"). It's a
// gateway-executed Parallel search that bills ~$5/1k if called, so keep it OFF
// until a slice deliberately enables web scanning. web_fetch stays enabled.
export default disableTool();
