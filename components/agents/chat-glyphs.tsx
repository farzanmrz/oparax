// Small inline SVG glyph components for the agent chat chrome.
// All are currentColor, ~16px by default. Matches the style of shell-icons.tsx.

type GlyphProps = {
  width?: number;
  height?: number;
};

export function ChatIcon({ width = 16, height = 16 }: GlyphProps) {
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
        d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8.5L4 20.5V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FormIcon({ width = 16, height = 16 }: GlyphProps) {
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
      <rect x="4" y="5" width="16" height="3" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="10.5" width="16" height="3" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="16" width="10" height="3" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function PlusGlyph({ width = 16, height = 16 }: GlyphProps) {
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
      <line
        x1="12"
        y1="5.2"
        x2="12"
        y2="18.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <line
        x1="5.2"
        y1="12"
        x2="18.8"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

export function WrenchGlyph({ width = 14, height = 14 }: GlyphProps) {
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
        d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z"
        stroke="currentColor"
        strokeWidth="1.7"
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
