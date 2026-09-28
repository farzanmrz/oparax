const brand = "Oparax";

export const landingCtas = {
  sign_up: { label: "Sign up", destination: "/signup" },
  log_in: { label: "Log in", destination: "/login" },
} as const;

export type LandingCtaName = keyof typeof landingCtas;
export type LandingCtaPlacement = "header" | "hero";

export const landingContent = {
  brand,
  navigation: {
    skipToContent: "Skip to content",
    logOut: "Log out",
    pending: "Signing out",
    error: "Could not sign out. Try again.",
  },
  hero: {
    headline: "Your Beat, Watched for You",
    description:
      "Oparax watches the internet, GitHub and Product Hunt for you, and brings the stories that matter to you on X.",
    promise: "Your X handle and a sentence about your beat. No account needed to start.",
  },
  box: {
    handle: "X handle",
    prefix: "@",
    handlePlaceholder: "your_handle",
    beat: "What do you follow?",
    beatPlaceholder: "The tools and ideas changing how people build with AI",
    submit: "Build my agent",
    pending: "Checking your handle…",
    closed: "Builds are unavailable right now. You can leave your handle.",
    leaveHandle: "Leave my handle",
    saving: "Saving your handle…",
    saved: "Your handle is saved.",
    noAgent: "You have no agent yet. Type your handle and beat to build one.",
    browserError: "Could not verify this browser. Reload and try again.",
    requestError: "Could not build your agent. Try again.",
    waitlistError: "Could not save your handle. Try again.",
    errors: {
      handle: "Enter a valid X handle.",
      beat: "Write a sentence about what you follow.",
      notfound: "Handle not found",
      lookup: "The X lookup could not finish. Try again.",
    },
  },
  howItWorks: {
    title: "How It Works",
    steps: [
      {
        number: "1",
        title: "Tell Us Your Beat",
        description: "Type your X handle and a sentence about what you want to follow.",
      },
      {
        number: "2",
        title: "Meet Your Agent",
        description:
          "Oparax reads your public profile and posts, then picks sites, feeds and X accounts for your beat.",
      },
      {
        number: "3",
        title: "Get News on X",
        description:
          "Connect to the Oparax bot for alerts. Each story is sent once, with a link to its card on your page.",
      },
    ],
  },
  example: {
    handle: "farzanmrz",
    title: "Here is @farzanmrz's agent",
    open: "Open @farzanmrz's agent",
  },
  pricing: {
    title: "Pick Your Pace",
    trial: "Start with a free week. Choose a plan on your agent's page when the week ends.",
    unlimited: "Sites and feeds unlimited.",
    period: "a month",
    cta: "Build my agent",
    tiers: [
      {
        name: "Hobby",
        price: "$5",
        pool: "100 watched X posts a month",
        cadence: "Daily alerts on X.",
      },
      {
        name: "Creator",
        price: "$30",
        pool: "3,000 watched X posts a month",
        cadence: "Daily alerts on X.",
      },
      {
        name: "Wire",
        price: "$99",
        pool: "4,000 watched X posts a month",
        cadence: "Alerts every 15 minutes when there is news.",
      },
    ],
  },
  contact: {
    trigger: "Contact",
    title: "Contact Us",
    description: "Tell us what you think of Oparax, what you want it to watch, or what went wrong.",
    email: "Email",
    emailPlaceholder: "you@example.com",
    invalidEmail: "Enter a valid email address.",
    label: "Message",
    placeholder: "Your feedback",
    empty: "Write a message before sending.",
    send: "Send",
    sending: "Saving your message…",
    tooLong: "Keep your message to 2,000 characters.",
    error: "Could not save your message. Try again.",
    rateLimit: "You can send up to 3 messages a day. Try again tomorrow.",
    thanks: "Thanks, we got your message.",
    close: "Close",
  },
  sharing: {
    title: "Oparax",
    headline: "Your beat, watched for you",
    description:
      "Oparax watches the internet, GitHub and Product Hunt for your beat, and alerts you on X.",
    alt: "Oparax. Your beat, watched for you.",
    domain: "oparax.ai",
    origin: "https://oparax.ai",
  },
} as const;
