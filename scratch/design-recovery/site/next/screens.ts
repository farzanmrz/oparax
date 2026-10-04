// Review tooling only: every screen and state of the structure-stage render.
export const screens: { group: string; links: { label: string; href: string }[] }[] = [
  {
    group: "Feed directions (council)",
    links: [
      { label: "All three side by side", href: "/next/feed/directions" },
      { label: "Window", href: "/next/feed/window" },
      { label: "Newsroom", href: "/next/feed/newsroom" },
      { label: "Deck", href: "/next/feed/deck" },
    ],
  },
  {
    group: "Landing",
    links: [
      { label: "Landing (hero animates)", href: "/next/landing" },
      { label: "Landing, hero settled", href: "/next/landing?settled=1" },
    ],
  },
  {
    group: "Auth (stock)",
    links: [
      { label: "Sign up", href: "/next/signup" },
      { label: "Confirmation email sent", href: "/next/signup/sent" },
      { label: "Log in", href: "/next/login" },
      { label: "Forgot password", href: "/next/forgot" },
      { label: "Forgot password, sent", href: "/next/forgot?state=sent" },
    ],
  },
  {
    group: "Setup",
    links: [
      { label: "Signed in with X", href: "/next/setup" },
      { label: "Typed handle", href: "/next/setup?handle=typed" },
      { label: "Handle not found (X sign-in)", href: "/next/setup?error=handle_not_found" },
      { label: "Handle not found (typed)", href: "/next/setup?handle=typed&error=handle_not_found" },
      { label: "Blank sentence on submit", href: "/next/setup?error=blank" },
      { label: "Builds closed, waitlist", href: "/next/setup?state=waitlist" },
    ],
  },
  {
    group: "Building",
    links: [
      { label: "Replay once", href: "/next/building" },
      { label: "At stage 1", href: "/next/building?at=1" },
      { label: "At stage 2", href: "/next/building?at=2" },
      { label: "At stage 3", href: "/next/building?at=3" },
      { label: "At stage 4", href: "/next/building?at=4" },
      { label: "At stage 5", href: "/next/building?at=5" },
      { label: "Done", href: "/next/building?at=done" },
      { label: "Failed", href: "/next/building?state=failed" },
    ],
  },
  {
    group: "Ready (first feed visit)",
    links: [{ label: "Ready", href: "/next/ready" }],
  },
  {
    group: "Feed, app shell",
    links: [
      { label: "Clustered", href: "/next/feed/shell?view=clustered" },
      { label: "Direct", href: "/next/feed/shell?view=direct" },
      { label: "Story in feed", href: "/next/feed/shell?story=st-next-15" },
      { label: "Empty", href: "/next/feed/shell?state=empty" },
      { label: "Checking", href: "/next/feed/shell?state=checking" },
      { label: "Could not process 1 item", href: "/next/feed/shell?state=failed-items" },
      { label: "Alerts active", href: "/next/feed/shell?alerts=active" },
    ],
  },
  {
    group: "Feed, simple page",
    links: [
      { label: "Clustered", href: "/next/feed/page?view=clustered" },
      { label: "Direct", href: "/next/feed/page?view=direct" },
      { label: "Story in feed (Direct)", href: "/next/feed/page?story=st-boe-cnbc" },
      { label: "Story in feed (Clustered)", href: "/next/feed/page?story=st-boe-story" },
      { label: "Empty", href: "/next/feed/page?state=empty" },
      { label: "Checking", href: "/next/feed/page?state=checking" },
      { label: "Could not process 1 item", href: "/next/feed/page?state=failed-items" },
      { label: "Alerts active", href: "/next/feed/page?alerts=active" },
      { label: "Alerts paused", href: "/next/feed/page?alerts=paused" },
      { label: "Alerts stopped", href: "/next/feed/page?alerts=stopped" },
      { label: "Alerts connection error", href: "/next/feed/page?alerts=error" },
      { label: "Free week pool used up", href: "/next/feed/page?pool=out" },
    ],
  },
  {
    group: "Plans",
    links: [
      { label: "Free week ended", href: "/next/free-week-ended" },
      { label: "Allowance used early", href: "/next/exhausted" },
      { label: "Checkout confirmed", href: "/next/checkout-return?state=confirmed" },
      { label: "Checkout pending", href: "/next/checkout-return?state=pending" },
      { label: "Checkout unpaid", href: "/next/checkout-return?state=unpaid" },
      { label: "Checkout unavailable", href: "/next/checkout-return?state=unavailable" },
    ],
  },
];
