export type DirectionProps = {
  page: 'landing' | 'feed';
  dark: boolean;
  feedMode: 'direct' | 'clustered';
  onFeedMode: (mode: 'direct' | 'clustered') => void;
  onTheme: () => void;
  onFeed: () => void;
  onLanding: () => void;
  onSignup: () => void;
  onStory: (id: string) => void;
};
