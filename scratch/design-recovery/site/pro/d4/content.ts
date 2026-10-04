// Direction 4 copy. Shared facts, plans and sources stay in ../content; this file only frames them.
import { evidence, stories } from "../content";

export const scrollStory = {
  id: "updates",
  title: "One story, kept up to date",
  intro:
    "When a later report covers an event you already have, Oparax adds what is new to that story instead of starting another one. Scroll to follow one launch day.",
  reportColumn: "Report arrives",
  storyColumn: "Your story",
  sample: "Sample from public NASA reports, October 14, 2024.",
  steps: [
    {
      id: "post",
      label: "NASA posts on X",
      change: "New story",
      facts: [evidence.story.firstFact],
      tag: null,
    },
    {
      id: "release",
      label: "NASA publishes its release",
      change: "Joined the same story",
      facts: [evidence.story.secondFact],
      tag: "Photo attached from the release",
    },
    {
      id: "update",
      label: "Mission update",
      change: evidence.story.updatedLabel,
      facts: [evidence.story.addedFact],
      tag: null,
    },
  ],
  finale: "The finished story in your feed",
  finaleAction: "Open the sample feed",
} as const;

export const europa = stories[0];

export const roadmapCopy = {
  title: "Where Oparax goes next",
  intro: "More places to watch and more ways to reach you. Planned, with no release dates yet.",
  sourcesHint: "Platforms Oparax will read",
  outputsHint: "Places your stories will arrive",
};

export const pricingCopy = {
  question: "How many X posts should Oparax watch each month?",
  sliderLabel: "Watched X posts a month",
  plansLabel: "Plans",
  choose: (plan: string) => `Sign Up for ${plan}`,
  includedTitle: "Every plan includes",
};

export const feedCopy = {
  photoCredit: "Photo",
  sources: "Sources",
};
