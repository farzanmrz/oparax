import type { UIMessage } from "ai";

export type Phase = "seed" | "map" | "read" | "rank" | "gaps" | "done";

export type Pick = {
  id: string;
  name: string;
  focus: string;
  target: string;
  score: number | null;
  band: "strong" | "possible";
  direction: string | null;
  directionScore: number | null;
};

export type Account = { handle: string | null; name: string; why: string };

export type Final = {
  summary: string;
  directions: { label: string; concept: string }[];
  picks: Pick[];
  added: { url: string; name: string; focus: string; direction: string; fit: number | null }[];
  accounts: Account[];
  uncovered: string[];
};

export type OnboardingData = {
  status: { phase: Phase; message: string };
  result: { final: Final | null; costUsd: number; turns: number; error: string | null };
};

export type OnboardingUIMessage = UIMessage<never, OnboardingData>;
