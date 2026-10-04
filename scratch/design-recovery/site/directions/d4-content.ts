import { fiveEvidence } from "../content/evidence";

export const sourceStoriesCopy = {
  hero: "Your sources become stories.",
  intro:
    "Oparax watches what matters to you, connects related reports and sends the useful story to your X messages.",
  signup: "Sign Up",
  feedAction: "Explore the feed",
  journeyLabel: "Reports become one story, delivered on X",
  sources: "Sources",
  oparax: "Oparax",
  delivery: "Delivery",
  sourcesIntro: "A post, an article, a mission update.",
  storyIntro: "Related facts come together in one story.",
  deliveryIntro: "The story reaches your X messages.",
  sourceSelection: "Choose a report to see what it adds",
  sourceNavigation: "Incoming reports",
  connectAction: "See reports connect",
  postAlt: "NASA's account avatar",
  photoAlt: "Europa Clipper launches from Kennedy Space Center",
  synthesisLabel: "One connected story",
  connectingLabel: "Connecting the reports",
  historicalExample: "Historical example, October 2024",
  gathered: "Connected from the original reports",
  sourceNote: "Each report adds to the same story.",
  originalReports: "Original reports",
  read: "Read story",
  feedTitle: "Your Feed",
  feedIntro:
    "Related reports, gathered into stories. Read the useful facts and follow the originals.",
  directIntro: "The useful facts from each individual report, synthesized by Oparax.",
  monitor: "Space missions & discovery",
  monitorIntro: "Planetary missions, ocean worlds and space telescopes.",
  sample: "Historical preview",
  endTitle: "Keep the story. Follow the sources.",
  endIntro: "Your feed brings the facts together and keeps every original report within reach.",
  synthesis: "Synthesized by Oparax",
} as const;

// These URLs tie each contributed fact to its verified report, independent of display order.
export const sourceContributions = [
  { sourceUrl: fiveEvidence.post.url, fact: fiveEvidence.story.firstFact },
  { sourceUrl: fiveEvidence.article.url, fact: fiveEvidence.story.secondFact },
  { sourceUrl: fiveEvidence.followup.url, fact: fiveEvidence.story.addedFact },
] as const;
