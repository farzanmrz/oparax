// Product copy, verbatim from the repository (focus-review/research/product-data.md cites each file).
// Strings marked "preview" are written for this render and are listed in NOTES.md for the council.

export const HANDLE = "farzanmrz";

export const auth = {
  login: {
    title: "Log In",
    subtitle: "Log in with X, Google or your email and password.",
    submit: "Log in",
    forgot: "Forgot password?",
    noAccount: "No account?",
    magic: "Email me a sign-in link",
  },
  signup: {
    title: "Sign Up",
    subtitle: "Create your Oparax account with X, Google or an email and password.",
    submit: "Sign up",
    haveAccount: "Already have an account?",
  },
  x: "Continue with X",
  google: "Continue with Google",
  or: "or",
  email: "Email",
  emailPlaceholder: "you@newsroom.com",
  password: "Password",
  confirm: "Confirm password",
  sent: (email: string) =>
    `If this email can be registered, we sent a confirmation link to ${email}. Check your email to continue.`,
  forgot: {
    title: "Forgot Password",
    subtitle: "We'll email you a link to reset it.",
    submit: "Send reset link",
    sent: "If an account exists for this email, we sent a password reset link.",
    back: "Back to log in",
  },
};

export const setup = {
  title: "Set Up Your Agent",
  handleLabel: "X account",
  verifiedHelp: "Your agent is built around this X account.",
  // Preview copy (round 1 change 8): the product's typed help explains the bot procedure here, too early.
  typedHelp:
    "Use the X account whose public posts describe your interests. You will connect alerts from that account after setup.",
  handlePlaceholder: "your_handle",
  beatLabel: "What do you want to follow?",
  beatPlaceholder: "The tools and ideas changing how people build with AI",
  beatMax: 300,
  // Preview copy (round 1 change 9): shown when the sentence is blank on submit.
  beatRequired: "Write a sentence about what you want to follow.",
  submit: "Build my agent",
  waitlistSubmit: "Join the waiting list",
  waitlistStatus: "Building is unavailable right now. You can join the waiting list.",
  refreshX: "Sign out and continue with X",
  notFoundVerified:
    "We could not find the X account saved by your sign-in. If you changed your handle, sign out and continue with X again.",
  notFoundTyped: (handle: string) => `We could not find @${handle} on X. Check the spelling and try again.`,
};

export const building = {
  title: "Building Your Agent",
  failed: (step: string) =>
    `Building stopped at: ${step}. Preparation could not finish. Your free week has not started.`,
  retry: "Try again",
};

export const feedCopy = {
  title: "Your Feed",
  direct: "Direct",
  clustered: "Clustered",
  checking: (n: number) => `${n} items being checked.`,
  // lib/monitor/content.ts failedItems always says "items"; the singular here is the round 1 wording.
  failedItems: (n: number) => `Could not process ${n} ${n === 1 ? "item" : "items"}.`,
  empty: "No relevant news yet.",
  trial: (days: number) => `${days} days left in your free week. Plans from $5 a month.`,
  pool: (used: number, limit: number) => `${used} of ${limit} watched posts used in your free week.`,
  poolOut: "Your free week's watched X posts are used up. Sites and feeds keep running.",
};

export const alerts = {
  get: "Get alerts on X",
  explain: `Opens a message to @oparax_ai with "Start alerts" typed. Send it from @${HANDLE} to connect alerts; that message is how Oparax confirms the account is yours. The bot will not reply.`,
  check: "Check connection",
  failed: "X connection could not start. Try again.",
  // Preview copy (round 1 change 21): the plan cadence for the fixture state, the free week.
  cadence: "Daily alerts in your free week.",
  active: "Alerts on. Send STOP to the bot to stop.",
  paused: "Alerts paused. Send RESUME to the bot to continue.",
  stopped: 'Alerts stopped. Send "Start alerts" from your X account to turn them on again.',
};

export const planStates = {
  frozenTitle: "Your free week is over.",
  frozenBody: "Your agent has stopped watching. Old cards stay readable. Pick a plan to keep it running.",
  exhausted:
    "Your free week's allowance ran out early. Updates are paused; your cards stay readable. Plans open when the week ends.",
};

export const plans = [
  { tier: "hobby", label: "Hobby, $5 a month", name: "Hobby", price: "$5", detail: "100 watched X posts a month, one DM a day" },
  {
    tier: "creator",
    label: "Creator, $30 a month",
    name: "Creator",
    price: "$30",
    detail: "3,000 watched X posts a month, one DM a day",
  },
  {
    tier: "wire",
    label: "Wire, $99 a month",
    name: "Wire",
    price: "$99",
    // Preview copy (round 1 change 23); the product says "a digest every 15 minutes".
    detail: "4,000 watched X posts a month, alerts every 15 minutes when there is news.",
  },
] as const;

export const checkout = {
  title: "Your Oparax Agent",
  confirmed: "Payment confirmed. Your agent is running again.",
  pending: "Your payment is being confirmed. Check again later, or contact Oparax before paying again.",
  unpaid: "Payment has not been confirmed. Your agent's access has not changed.",
  unavailable: "We could not load this checkout. Return to your agent to continue.",
  open: "Open your agent",
  again: "Check again",
};
