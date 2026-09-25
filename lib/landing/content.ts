const brand = "Oparax";

export const landingCtas = {
  sign_up: { label: "Sign up", destination: "/signup" },
  log_in: { label: "Log in", destination: "/login" },
} as const;

export type LandingCtaName = keyof typeof landingCtas;
export type LandingCtaPlacement = "header" | "hero";

export const landingContent = {
  brand,
  auth: {
    logOut: "Log out",
    pending: "Signing out",
    error: "Could not sign out. Try again.",
    loginSubtitle: "Oparax is being rebuilt. Your account remains available.",
    signupSubtitle: "Oparax is being rebuilt. Your account remains available.",
  },
  hero: {
    headline:
      "Oparax watches the internet, GitHub and Product Hunt for you, and brings what matters to you on X.",
    description: "Monitoring is being rebuilt. Existing accounts can still sign in.",
  },
  contact: {
    trigger: "Contact",
    title: "Contact Us",
    description: "Tell us what you think of Oparax, what you want it to watch, or what went wrong.",
    label: "Message",
    placeholder: "Your feedback",
    empty: "Write a message before sending.",
    send: "Send",
    thanks: "Thanks for reaching out.",
    close: "Close",
  },
  sharing: {
    title: "Oparax",
    headline: "Monitoring your beat",
    description:
      "Oparax watches the internet, GitHub and Product Hunt for you. Monitoring is being rebuilt.",
    alt: "Oparax. Monitoring is being rebuilt.",
    domain: "oparax.ai",
    origin: "https://oparax.ai",
  },
} as const;
