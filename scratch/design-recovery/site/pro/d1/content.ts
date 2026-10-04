// Direction 1 (Transform) copy. Shared facts, stories and plans come from ../content; this file only
// holds wording and short fact labels specific to this direction's composition.
import { evidence, stories, directItems } from "../content";

export const transform = {
  // Short labels emitted as each source crosses the engine. Each restates a fact in pro/content.ts.
  labels: {
    post: ["Launched on Falcon Heavy"],
    article: ["Bound for Europa", "Launched from Kennedy"],
    followup: ["Solar arrays deployed"],
  },
  interest: "Your interest: Space missions and discovery",
  stageLabel: "Picture of Oparax turning three reports into one story",
};

export const modes = {
  id: "reading",
  title: "Two ways to read your feed",
  intro: "Switch between them on your feed whenever you like. Either way, every item links back to where it came from.",
  items: [
    {
      id: "direct" as const,
      title: "Direct: one source, summarized",
      body: "Each post or article becomes its own item, with a clear headline, the useful facts and a link to the original.",
      caption: "One report from ESA/Webb, summarized by Oparax",
    },
    {
      id: "clustered" as const,
      title: "Clustered: one event, every source",
      body: "When several sources report the same event, Oparax joins them into one story and lists each source once.",
      caption: "Two reports about Euclid, joined into one story",
    },
  ],
  directSample: directItems[0],
  clusteredSample: stories[1],
};

export const roadmapCopy = {
  todayLead: "Works today",
  hub: "Oparax",
};

export const pricingCopy = {
  cta: "Sign Up",
  cadenceLabel: "Alerts",
  includedLabel: "Every plan includes",
  selectLabel: "Choose a plan",
};

export const feedCopy = {
  sourcesLabel: "Sources",
  sourceLabel: "Source",
  photoCredit: "Photo",
  added: evidence.story.updatedLabel,
  addedFact: evidence.story.addedFact,
  postKind: "Post on X",
};
