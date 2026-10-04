// Direction 3 (Bento Wire) copy. Shared facts, plans and sources stay in ../content.ts.
import { directItems, stories } from "../content";

export const demo = {
  label: "How Oparax works, pictured with public reports",
  caption: "Sample: public reports from October 14, 2024. Hover or focus a source to trace it into the story.",
};

// Same event, both ways: ESA's single report (Direct) and the story that joins ESA and NASA (Clustered).
export const modes = {
  title: "Two ways to read the same news",
  intro: "Switch between Direct and Clustered whenever you like. Here is one event, both ways.",
  direct: {
    name: "Direct",
    line: "One source, summarized by Oparax as it arrives.",
    action: "Open the Direct feed",
    item: directItems[1],
  },
  clustered: {
    name: "Clustered",
    line: "Every source on the same event, joined into one story.",
    action: "Open the Clustered feed",
    story: stories[1],
  },
};

export const pricingCopy = {
  includedTitle: "Every plan includes",
  cta: "Sign Up",
};

export const roadmapCopy = {
  todayInputs: "Watching",
  todayOutputs: "Delivering to",
};
