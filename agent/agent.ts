import { defineAgent } from "eve";

export default defineAgent({
  // The rebuild's DeepSeek chat leg in embryo. Gateway model string, proven in
  // this env; this slice keeps it a thin orchestrator around the scan tool.
  model: "deepseek/deepseek-v4-flash",
});
