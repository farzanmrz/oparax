export type PageView = "landing" | "feed";
export type FeedMode = "direct" | "clustered";

export type DirectionProps = {
  page: PageView;
  dark: boolean;
  feedMode: FeedMode;
  onFeedMode: (mode: FeedMode) => void;
  onFeed: () => void;
  onLanding: () => void;
  onSignup: () => void;
};
