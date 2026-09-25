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
  account: {
    text: "When you sign in with Google or X, Oparax receives your name, email address and profile picture and uses them only to create and secure your account.",
    link: "Read the privacy policy",
    href: "/privacy",
  },
  footer: "Monitoring is being rebuilt.",
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
