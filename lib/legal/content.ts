// Every string on the privacy and terms pages. Google's OAuth verification reads the privacy
// page, so each claim must match what the product actually does; change this file first when
// data handling changes.

export type LegalItem = { readonly label?: string; readonly text: string };

// A paragraph may carry an inline link that opens the Contact dialog between two pieces of text;
// no email address is ever shown (owner, September 24).
export type LegalParagraph = string | { readonly before: string; readonly after: string };

export type LegalSection = {
  readonly heading: string;
  readonly paragraphs: readonly LegalParagraph[];
  // A bullet may lead with a bold label ("Account details") followed by its text.
  readonly items?: readonly LegalItem[];
};

export type LegalDocument = {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly updated: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
};

export const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export const privacyPolicy: LegalDocument = {
  path: "/privacy",
  title: "Privacy Policy",
  description:
    "How Oparax collects, uses, stores and shares information, including data from Google sign-in.",
  updated: "September 24, 2026",
  intro:
    'Oparax is operated by OPARAX AI, Inc. ("Oparax", "we"). This policy explains what information we collect when you use oparax.ai, why we collect it, who processes it for us, how long we keep it and how you can have it deleted.',
  sections: [
    {
      heading: "Information We Collect",
      paragraphs: [
        "We collect only what we need to run your account and understand how the site is used:",
      ],
      items: [
        {
          label: "Account Details",
          text: "Your email address, and a password if you sign up with email. Passwords are stored only as a secure hash by our authentication provider.",
        },
        {
          label: "Google Sign-In",
          text: "If you choose Sign in with Google, Google shares your name, email address, profile picture and a Google account identifier with us. We request only the basic openid, email and profile permissions. We never receive your Google password and we do not access your Gmail, contacts, calendar, files or any other Google data.",
        },
        {
          label: "X Sign-In",
          text: "If you choose Sign in with X, X shares your account identifier, handle, display name, profile picture and, when X provides it, your email address.",
        },
        {
          label: "Usage Information",
          text: "Pages you visit, buttons you click, your browser and device type, and approximate location derived from your IP address. We also record sessions to see how pages are used; these recordings capture what appears on the page and what you type into ordinary fields, but never the contents of password fields.",
        },
      ],
    },
    {
      heading: "Usage",
      paragraphs: ["We use this information to:"],
      items: [
        { text: "Create your account, sign you in and keep your account secure." },
        { text: "Send account emails, such as sign-up confirmation and password reset." },
        { text: "Understand how the site is used, find errors and improve Oparax." },
        { text: "Respond to you when you contact us." },
      ],
    },
    {
      heading: "Google User Data",
      paragraphs: [
        "We use the name, email address, profile picture and account identifier received from Google only to create and identify your Oparax account and to show you who is signed in. We do not sell Google user data, use it for advertising, share it with anyone except the service providers listed below that run Oparax for us, or use it to train artificial intelligence models.",
        "Oparax's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including its Limited Use requirements.",
      ],
    },
    {
      heading: "Service Providers",
      paragraphs: [
        "We do not sell personal information. We share it only with the service providers that run Oparax on our behalf, under their own security and privacy terms:",
      ],
      items: [
        { label: "Supabase", text: "Account and sign-in storage." },
        {
          label: "Vercel",
          text: "Website hosting and anonymous traffic and performance measurement.",
        },
        { label: "PostHog", text: "Product analytics, error tracking and session recordings." },
        { label: "Google Workspace", text: "Delivery of account emails." },
      ],
    },
    {
      heading: "Storage and Security",
      paragraphs: [
        "Information is stored with the providers above, in the United States. Connections to Oparax are encrypted, and access to our systems is limited to the people who operate Oparax.",
      ],
    },
    {
      heading: "Retention and Deletion",
      paragraphs: [
        "We keep account information for as long as your account exists. Usage analytics and session recordings are kept for a limited period under our analytics provider's retention settings.",
        {
          before:
            "To delete your account and the personal information linked to it, send a request through ",
          after:
            " and include the email address on your account. We complete deletion within 30 days. If you signed in with Google, you can also remove Oparax's access at any time from your Google Account's third-party connections page.",
        },
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "Oparax is not directed to children under 13, and we do not knowingly collect their information.",
      ],
    },
    {
      heading: "Policy Changes",
      paragraphs: [
        "When we change how we handle information, we update this page and the date above before the change takes effect. If a change affects how we use data you already gave us, we will ask for your consent where the law requires it.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        { before: "For questions or requests about your information, use ", after: "." },
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  path: "/terms",
  title: "Terms of Service",
  description: "The terms for using Oparax.",
  updated: "September 24, 2026",
  intro:
    'These terms govern your use of oparax.ai and the Oparax service, operated by OPARAX AI, Inc. ("Oparax", "we"). By creating an account or using Oparax, you agree to them.',
  sections: [
    {
      heading: "The Service",
      paragraphs: [
        "Oparax watches public sources on the internet, GitHub and Product Hunt for the topics you choose and brings what it finds to you. The service is being rebuilt and features may change, pause or be removed.",
      ],
    },
    {
      heading: "Your Account",
      paragraphs: [
        "You must give accurate information, keep your sign-in details secure and be at least 13 years old. You are responsible for activity on your account. You may stop using Oparax and ask us to delete your account at any time.",
      ],
    },
    {
      heading: "Acceptable Use",
      paragraphs: [
        "Do not use Oparax to break the law, to harass anyone, to interfere with the service or other people's use of it, or to try to access data that is not yours. We may suspend or close accounts that do.",
      ],
    },
    {
      heading: "Third-Party Content",
      paragraphs: [
        "Oparax shows and summarizes material published by others. That material belongs to its owners, and we do not guarantee that it or our summaries are complete or accurate. Check the original source before relying on it.",
      ],
    },
    {
      heading: "Payment",
      paragraphs: [
        "Oparax is free while it is being rebuilt. If paid plans are introduced, their price and terms will be shown before you are asked to pay.",
      ],
    },
    {
      heading: "Warranty and Liability",
      paragraphs: [
        "Oparax is provided as is, without warranties of any kind. To the fullest extent the law allows, Oparax is not liable for indirect or consequential losses, and our total liability for any claim is limited to the amount you paid us in the twelve months before it arose.",
      ],
    },
    {
      heading: "Changes and Privacy",
      paragraphs: [
        "We may update these terms; we will change the date above and, for significant changes, tell you before they apply. Our privacy policy explains how we handle your information.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [{ before: "For questions about these terms, use ", after: "." }],
    },
  ],
};
