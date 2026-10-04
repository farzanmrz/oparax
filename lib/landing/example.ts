// Historical source and avatar provenance: .feature/plan-151/design-refs/examples/PROVENANCE.md.
// NASA X post: https://x.com/NASA/status/1845859399178264640
// NASA release: https://www.nasa.gov/news-release/liftoff-nasas-europa-clipper-sails-toward-ocean-moon-of-jupiter/
// NASA Science update: https://science.nasa.gov/blogs/europa-clipper/2024/10/14/solar-arrays-on-nasas-europa-clipper-fully-deployed-in-space-2/
// The Oparax story and X message are authored previews, not historical product output.
export const landingExample = {
  date: "Oct 14, 2024",
  dateISO: "2024-10-14",
  post: {
    author: "NASA",
    handle: "@NASA",
    avatar: "/examples/nasa-x-avatar-official-normal.jpg",
    excerpt:
      "@EuropaClipper launched from @NASAKennedy at 12:06pm ET (16:06 UTC) on a @SpaceX Falcon Heavy",
  },
  release: {
    publisher: "NASA",
    headline: "Liftoff! NASA's Europa Clipper Sails Toward Ocean Moon of Jupiter",
  },
  update: {
    publisher: "NASA Science",
    headline: "Solar Arrays on NASA's Europa Clipper Fully Deployed in Space",
  },
  story: {
    title: "Europa Clipper is on its way to Jupiter",
    firstFact: "NASA's Europa Clipper launched on a Falcon Heavy from Kennedy Space Center.",
    releaseCitation: "[1]",
    sources: ["NASA release", "@NASA", "Mission update"],
  },
  message: {
    sender: "Oparax",
    handle: "@oparax_ai",
    intro: "Oparax: 1 new story for you",
    url: "oparax.ai/your-handle/...",
  },
} as const;
