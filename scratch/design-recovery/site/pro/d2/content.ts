// Direction 2 (Workspace) copy. Shared facts, plans and stories come from ../content; this file only holds
// the wording this direction adds. Setup lines are the product's real onboarding labels and report messages
// (lib/monitor/content.ts steps and lib/onboarding/engine.ts report calls), with counts omitted because no
// real run is captured here and @yourhandle standing in for the visitor's handle.

export const panes = {
  windowLabel: "Picture of the Oparax workspace with sample reports",
  interest: "Your interest",
  joined: "Joined into the story",
  storySources: "Sources",
  photoCredit: "Photo",
};

export const setup = {
  title: "What happens after you sign up",
  intro: "Oparax starts from your public X posts and the subject you name, then picks what to watch.",
  steps: [
    {
      title: "Tell Oparax who you are on X and what to follow",
      body: "Your handle and a few words about the subject, such as space missions and discovery.",
    },
    {
      title: "Oparax builds your agent",
      body: "It reads your public posts, scores candidate sources and picks the sites, feeds and X accounts to watch.",
    },
    {
      title: "Your free week starts when the agent is ready",
      body: "It includes 300 watched X posts. Stories arrive in your feed and your X DMs.",
    },
  ],
  log: {
    title: "Building Your Agent",
    status: "Ready",
    caption: "A picture of the setup log. @yourhandle stands for your X handle.",
    phases: [
      { label: "Looking up @yourhandle on X", messages: [] as string[] },
      { label: "Reading @yourhandle’s newest posts", messages: [] as string[] },
      {
        label: "Choosing sources and X accounts",
        messages: ["Jev is scoring candidate sources", "Choosing recommendations and writing the brief"],
      },
    ],
  },
};

export const roadmapCopy = {
  inputsNote: "Platforms Oparax plans to read, alongside X accounts, sites and RSS.",
  outputsNote: "Places Oparax plans to send your stories, alongside X DMs.",
  deliveredTo: "delivered to",
};

export const pricingCopy = {
  cta: "Sign Up",
  rows: {
    posts: "Watched X posts a month",
    alerts: "Alerts on X",
  },
  alertShort: ["Daily", "Daily", "Every 15 minutes when there is news"],
  selectLabel: "Select a plan to compare",
  included: "Included",
};

export const feedCopy = {
  search: "Search your feed",
  empty: "Nothing in your feed matches that search.",
  clear: "Clear search",
  back: "Back to your feed",
  listLabel: { clustered: "Stories", direct: "Items" },
  original: "Original source",
  credit: "Photo",
};
