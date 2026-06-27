// Small inline SVG glyph components for the agent chat chrome.
// All are currentColor, ~16px by default. Matches the style of shell-icons.tsx.

type GlyphProps = {
  width?: number;
  height?: number;
};

export function SendGlyph({ width = 16, height = 16 }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      width={width}
      height={height}
      style={{
        display: "block",
        flexShrink: 0,
      }}
    >
      <path
        d="M12 19V5M6 11l6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExternalGlyph({ width = 16, height = 16 }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      width={width}
      height={height}
      style={{
        display: "block",
        flexShrink: 0,
      }}
    >
      <path
        d="M13 5h6v6M19 5l-9 9M10 7H5v12h12v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
