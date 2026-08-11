export type FixtureAssertion = {
  required?: string[];
  forbidden?: string[];
  expectedOnBeat?: boolean;
  maxPoints?: number;
  minPoints?: number;
  requiresMediaEvidence?: boolean;
};

export type RegressionFixture = {
  id: string;
  source: {
    sourcePostId: string;
    xPostId: string | null;
    identity: { kind: "x"; handle: string } | { kind: "website"; publisher: string };
    text: string;
    title: string | null;
    lang: string | null;
    media: { kind: string; imageUrl: string }[];
  };
  context: {
    beat: string;
    siteGuidance: { onBeat: string; offBeat: string } | null;
    publisherClaimKind: "official" | "insider-sourced" | "outlet-characterization" | "aggregator";
    reporterTier: string | null;
    accountTier: "standard" | "premium";
    voiceGuide: { guideRaw: string; guideDeploy: string; measuredFacts: string; rules: unknown[] };
  };
  provenance: Record<string, string | null>;
  hashes: { source: string; context: string; fixture: string };
  assertions?: FixtureAssertion;
};

/** Human-authored contracts for replay seeds; the exporter fills the immutable source/context. */
export const assertionForFixture = (id: string): FixtureAssertion => {
  switch (id) {
    case "deco":
      return {
        expectedOnBeat: true,
        minPoints: 10,
        required: ["Atletico", "Tottenham", "no loan"],
        forbidden: ["Deco confirms", "Deco confirmed", "Deco has confirmed"],
      };
    case "offbeat-tycsports":
    case "supplemental-ar-x":
    case "supplemental-ca-website":
    case "supplemental-es-website":
    case "supplemental-es-x":
    case "supplemental-fr-x":
    case "supplemental-it-x":
    case "supplemental-pt-x":
      return { expectedOnBeat: false };
    case "lazy-x":
      return {
        expectedOnBeat: true,
        minPoints: 1,
        maxPoints: 3,
        required: ["waiting for Barcelona"],
        forbidden: ["Barcelona have made", "Barcelona has made"],
      };
    case "rodri-fabricated-real-madrid":
      return {
        expectedOnBeat: true,
        required: ["Rodri", "100% agreed personal terms"],
        forbidden: ["Real Madrid"],
      };
    case "rodri-nationality":
      return {
        expectedOnBeat: true,
        required: ["Rodri", "Man City", "first offer"],
        forbidden: ["Real Madrid", "Spanish midfielder", "Spain midfielder"],
      };
    case "media-only":
      return {
        expectedOnBeat: true,
        minPoints: 1,
        required: ["Barcelona"],
        requiresMediaEvidence: true,
      };
    case "supplemental-ca-x":
      return {
        expectedOnBeat: true,
        required: ["Joan Garcia", "Barcelona"],
        requiresMediaEvidence: true,
      };
    case "supplemental-de-x":
      return {
        expectedOnBeat: true,
        required: ["Borussia Dortmund", "Barcelona midfielder"],
      };
    case "supplemental-ht-x":
      return {
        expectedOnBeat: true,
        required: ["Raphinha", "Adeyemi"],
        requiresMediaEvidence: true,
      };
    case "supplemental-pl-x":
      return {
        expectedOnBeat: true,
        required: ["Barcelona"],
        requiresMediaEvidence: true,
      };
    case "supplemental-ro-x":
      return {
        expectedOnBeat: true,
        required: ["Julián Álvarez", "Atlético Madrid", "Barcelona's offer"],
      };
    case "quote-tweet-sticky-kind":
      return {
        expectedOnBeat: true,
        required: ["fixture_aggregator", "Joan Garcia", "2031"],
        forbidden: ["Barcelona confirms", "Barcelona confirmed"],
      };
    case "offbeat-text-onbeat-image":
    case "image-emoji":
      return {
        expectedOnBeat: true,
        required: ["Joan Garcia", "FC Barcelona"],
        requiresMediaEvidence: true,
      };
    case "empty-voice-guide":
    case "mislabeled-lang":
      return {
        expectedOnBeat: true,
        required: ["Barcelona", "Alex Smith"],
        ...(id === "mislabeled-lang"
          ? { forbidden: ["Barcelona ha fichado", "ha firmado a Alex Smith"] }
          : {}),
      };
    default:
      throw new Error(`Missing human-authored assertions for regression fixture ${id}`);
  }
};
