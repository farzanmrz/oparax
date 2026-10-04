// Verified source fields: scratch/design-research/round-five-components/real-content/verified-content.json.
// Story and DM are an authored preview, never a claim that Oparax processed or sent this event.
// DM line breaks follow lib/alerts/pack.ts; its placeholder URL opens the local story preview.
export const fiveEvidence = {
  date: "Oct 14, 2024",
  dateISO: "2024-10-14",
  post: {
    author: "NASA",
    handle: "@NASA",
    avatar: "/examples/nasa-x-avatar-official-normal.jpg",
    url: "https://x.com/NASA/status/1845859399178264640",
    excerpt:
      "@EuropaClipper launched from @NASAKennedy at 12:06pm ET (16:06 UTC) on a @SpaceX Falcon Heavy",
    more: "Show more",
    excerptLabel: "Excerpt from NASA’s post on X",
  },
  article: {
    publisher: "NASA",
    headline: "Liftoff! NASA’s Europa Clipper Sails Toward Ocean Moon of Jupiter",
    summary:
      "Europa Clipper launched from Kennedy Space Center on a Falcon Heavy to investigate Jupiter’s ocean moon Europa.",
    url: "https://www.nasa.gov/news-release/liftoff-nasas-europa-clipper-sails-toward-ocean-moon-of-jupiter/",
    image: "/examples/europa-clipper-launch-nasa-kim-shiflett-600.jpg",
    imageAlt:
      "A Falcon Heavy rocket lifts off from Kennedy Space Center, with the Atlantic Ocean behind the launch pad.",
    imageCredit: "NASA/Kim Shiflett",
  },
  followup: {
    publisher: "NASA Science",
    headline: "Solar Arrays on NASA’s Europa Clipper Fully Deployed in Space",
    summary: "Mission controllers confirmed that both solar arrays unfolded after launch.",
    url: "https://science.nasa.gov/blogs/europa-clipper/2024/10/14/solar-arrays-on-nasas-europa-clipper-fully-deployed-in-space-2/",
  },
  story: {
    title: "Europa Clipper is on its way to Jupiter",
    firstFact: "NASA’s Europa Clipper launched on a Falcon Heavy from Kennedy Space Center.",
    secondFact:
      "The mission will investigate whether Europa has conditions that could support life.",
    addedFact: "Both solar arrays are now fully deployed in space.",
    sourcesLabel: "Original sources",
    articleSource: "NASA release",
    postSource: "@NASA",
    followupSource: "Mission update",
    updatedLabel: "Added from the mission update",
  },
  dm: {
    name: "Oparax",
    handle: "@oparax_ai",
    intro: "Oparax: 1 new story for you",
    url: "https://oparax.ai/your-handle/...",
    localTarget: "#story",
    conversationLabel: "Conversation with Oparax on X",
    back: "Back to messages",
    info: "Conversation information",
    composer: "Start a new message",
    composerLabel: "Message composer, preview only",
    send: "Send message",
  },
} as const;
