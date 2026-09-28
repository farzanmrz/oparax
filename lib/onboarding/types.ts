import type { UIMessage } from "ai";

// score is Jev's probability, from 0 to 1, that the pick is a useful source for the beat.
type Site = {
  id: string;
  name: string;
  focus: string;
  kind: string;
  target: string;
  why: string;
  score: number;
};

type Account = { handle: string; why: string; score: number };

// The recommendation: up to ten sites and feeds from the table, the X accounts, and the one X search if it ran.
export type Final = { sites: Site[]; accounts: Account[]; searched: string | null };

// What the page shows under the handle box when X has no account for it.
export const HANDLE_NOT_FOUND = "Handle not found";

// What micro-step 1 found, as the page shows it: the profile and the pinned post with its pictures.
export type PageMedia = { type: string; src?: string; alt?: string };
export type PageProfile = {
  handle: string;
  name: string;
  bio: string;
  image: string | null;
  site: string | null;
  pinned: {
    text: string;
    links: string[];
    media: PageMedia[];
    quoted: { author: string; text: string; media: PageMedia[] } | null;
  } | null;
};

export type OnboardingData = {
  status: { message: string };
  profile: PageProfile;
  result: { final: Final | null; costUsd: number; turns: number; error: string | null };
};

export type OnboardingUIMessage = UIMessage<never, OnboardingData>;
