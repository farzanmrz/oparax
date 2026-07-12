import { disableTool } from "eve/tools";

// A reporter chat agent has no need for shell/filesystem access; lock it down
// (per eve default-harness guidance).
export default disableTool();
