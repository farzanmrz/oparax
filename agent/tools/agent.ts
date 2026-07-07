import { disableTool } from "eve/tools";

// The `agent` default lets the model spawn a subagent copy of itself. A reporter
// chat never needs to delegate, so keep it off — unnecessary surface.
export default disableTool();
