import { defineAgent } from "eve";

export default defineAgent({
  // DeepSeek chat leg, routed through the Vercel AI Gateway (plain gateway
  // string). A thin orchestrator around the scan tool for now.
  model: "deepseek/deepseek-v4-flash",
  // Reasoning explicitly ON for now (ft/44): confirm the toggle actually fires
  // and observe its effect before deciding the default. Flip to "none" to
  // compare cost / latency / output style once evals exist.
  reasoning: "medium",
  modelOptions: {
    providerOptions: {
      // Route DeepSeek to the cheapest available provider through the gateway
      // (BYOK, no surcharge). Not a reasoning key, so it coexists with the
      // top-level `reasoning` field above.
      gateway: { sort: "cost" },
    },
  },
});
