// Workspace-shell icons, ported verbatim from the Claude Design prototype
// (oparax-ds templates/agents-home/AgentsHome.dc.html <defs>). Two kinds:
//   • Stroke glyphs — drawn with `currentColor` for nav/footer/controls.
//   • Colored "account tiles" — rounded-square brand tiles with baked colors,
//     used in the sidebar Accounts list (distinct from the plain glyphs in
//     components/icons.tsx, hence the `*Tile` names).
// The orbit mark (OparaxMark) and the X glyph (XIcon) already exist and are
// reused from components/logo.tsx and components/icons.tsx.

type IconProps = React.SVGProps<SVGSVGElement>

/* ------------------------------------------------ stroke glyphs */

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <line x1="12" y1="5.2" x2="12" y2="18.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="5.2" y1="12" x2="18.8" y2="12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M14 7l-5 5 5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M10 7l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function InsightsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 4v16h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 14.6l3-3.3 2.6 2.2 4.4-5.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ProfileIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="8.4" r="3.6" stroke="currentColor" strokeWidth="1.9" />
      <path d="M5.5 19.6a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export function SignOutIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M14.5 7.5V5.6A1.6 1.6 0 0 0 12.9 4H6.6A1.6 1.6 0 0 0 5 5.6v12.8A1.6 1.6 0 0 0 6.6 20h6.3a1.6 1.6 0 0 0 1.6-1.6V16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 9l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function GearIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M19.4 13c.04-.32.06-.66.06-1s-.02-.68-.07-1l2.11-1.63a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.73-1l-.38-2.65A.49.49 0 0 0 13.93 2h-4a.49.49 0 0 0-.49.42l-.38 2.65a7.3 7.3 0 0 0-1.73 1l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64L4.07 11c-.05.32-.07.66-.07 1s.02.68.07 1l-2.11 1.63a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.53.4 1.11.74 1.73 1l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65c.62-.26 1.2-.6 1.73-1l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function AgentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="3.3" r="1.3" fill="currentColor" />
      <line x1="12" y1="4.4" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4.3" y="7" width="15.4" height="11.4" rx="3.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9.4" cy="12.7" r="1.5" fill="currentColor" />
      <circle cx="14.6" cy="12.7" r="1.5" fill="currentColor" />
      <line x1="9.6" y1="15.7" x2="14.4" y2="15.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="2.4" y1="11.4" x2="2.4" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="21.6" y1="11.4" x2="21.6" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------------------------ colored account tiles */

export function XTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#000000" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
      <path transform="translate(6 6) scale(0.5)" fill="#ffffff" d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
    </svg>
  )
}

export function InstagramTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="ig-grad" cx="0.32" cy="1" r="1.15">
          <stop offset="0" stopColor="#feda75" />
          <stop offset="0.32" stopColor="#fa7e1e" />
          <stop offset="0.58" stopColor="#d62976" />
          <stop offset="0.8" stopColor="#962fbf" />
          <stop offset="1" stopColor="#4f5bd5" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="url(#ig-grad)" />
      <rect x="7" y="7" width="10" height="10" rx="3" fill="none" stroke="#ffffff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke="#ffffff" strokeWidth="1.6" />
      <circle cx="16.2" cy="7.8" r="0.95" fill="#ffffff" />
    </svg>
  )
}

export function LinkedInTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#0A66C2" />
      <circle cx="7.9" cy="8.2" r="1.35" fill="#ffffff" />
      <rect x="6.7" y="10.3" width="2.4" height="7" fill="#ffffff" />
      <path fill="#ffffff" d="M10.8 10.3h2.3v.96h.03c.34-.6 1.18-1.18 2.42-1.18 2.55 0 3.02 1.56 3.02 3.66v3.56h-2.4v-3.16c0-.78-.02-1.78-1.12-1.78-1.12 0-1.29.85-1.29 1.72v3.22h-2.4Z" />
    </svg>
  )
}

export function TikTokTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#010101" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
      <g transform="translate(6 6) scale(0.5)">
        <path transform="translate(-1.1 0.2)" fill="#25F4EE" d="M16.6 3h-2.7v11.6a2.3 2.3 0 1 1-2.3-2.3c.2 0 .4 0 .6.05V9.6a5.2 5.2 0 1 0 4.4 5.1V8.85a6.3 6.3 0 0 0 3.6 1.15V7.3a3.6 3.6 0 0 1-3.3-3.5Z" />
        <path transform="translate(1.1 -0.2)" fill="#FE2C55" d="M16.6 3h-2.7v11.6a2.3 2.3 0 1 1-2.3-2.3c.2 0 .4 0 .6.05V9.6a5.2 5.2 0 1 0 4.4 5.1V8.85a6.3 6.3 0 0 0 3.6 1.15V7.3a3.6 3.6 0 0 1-3.3-3.5Z" />
        <path fill="#ffffff" d="M16.6 3h-2.7v11.6a2.3 2.3 0 1 1-2.3-2.3c.2 0 .4 0 .6.05V9.6a5.2 5.2 0 1 0 4.4 5.1V8.85a6.3 6.3 0 0 0 3.6 1.15V7.3a3.6 3.6 0 0 1-3.3-3.5Z" />
      </g>
    </svg>
  )
}

export function FacebookTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#1877F2" />
      <path fill="#ffffff" d="M14.3 19.6v-5.5h1.85l.35-2.27h-2.2v-1.45c0-.62.22-1.05 1.1-1.05h1.18V7.3a14.8 14.8 0 0 0-1.78-.1c-1.78 0-3 1.08-3 3.07v1.66H9.7v2.27h1.85v5.5Z" />
    </svg>
  )
}

export function WhatsAppTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#25D366" />
      <path fill="#ffffff" d="M12 5.6a6.3 6.3 0 0 0-5.4 9.55L5.7 18.4l3.34-.87A6.3 6.3 0 1 0 12 5.6Zm0 1.4a4.9 4.9 0 1 1-2.55 9.08l-.23-.14-1.74.45.47-1.7-.15-.24A4.9 4.9 0 0 1 12 7Zm-1.9 2.22c-.14 0-.34.05-.52.25s-.7.68-.7 1.66.72 1.92.82 2.05c.1.13 1.4 2.13 3.38 2.9 1.65.64 1.99.51 2.35.48.36-.03 1.16-.47 1.32-.93.16-.46.16-.85.12-.93-.05-.08-.18-.13-.38-.23s-1.16-.57-1.34-.64c-.18-.06-.31-.1-.44.1s-.5.64-.62.77c-.11.13-.23.15-.43.05-.2-.1-.84-.31-1.6-.99-.59-.52-.99-1.18-1.1-1.38-.12-.2-.01-.3.09-.41l.3-.35c.1-.11.13-.19.2-.32.06-.13.03-.25-.02-.35-.05-.1-.44-1.08-.61-1.48-.16-.39-.32-.33-.44-.34h-.38Z" />
    </svg>
  )
}

export function ThreadsTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#000000" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
      <path fill="#ffffff" d="M15.3 11.55c-.05-.03-.11-.05-.17-.08-.1-1.85-1.1-2.9-2.8-2.92h-.03c-1.02 0-1.86.43-2.38 1.22l.94.64c.4-.59 1-.72 1.45-.72h.01c.56 0 .98.16 1.25.48.2.24.33.56.4.97a7.2 7.2 0 0 0-1.57-.08c-1.58.09-2.59 1.02-2.49 2.41.05.71.4 1.32.99 1.72.5.34 1.13.5 1.8.47.88-.05 1.56-.39 2.04-1 .37-.46.6-1.06.7-1.81.42.26.74.6.91 1.01.24.56.25 1.48-.5 2.23-.66.65-1.45.94-2.64.95-1.33-.01-2.33-.44-2.98-1.27-.61-.79-.93-1.91-.94-3.35.01-1.44.33-2.57.94-3.35.65-.83 1.65-1.26 2.98-1.27 1.33.01 2.35.44 3.03 1.29.33.41.59.93.75 1.54l1.08-.29c-.2-.75-.52-1.4-.95-1.93-.87-1.08-2.15-1.63-3.8-1.64h-.01c-1.65.01-2.9.56-3.73 1.65-.74.97-1.12 2.3-1.13 3.98v.01c.01 1.67.39 3.01 1.13 3.97.83 1.08 2.09 1.64 3.73 1.65h.01c1.47-.01 2.5-.4 3.35-1.24 1.11-1.11 1.08-2.51.72-3.37-.26-.62-.76-1.12-1.45-1.46Zm-2.85 2.75c-.74.04-1.5-.29-1.54-1.01-.03-.53.38-1.12 1.58-1.19.14-.01.27-.01.4-.01.44 0 .85.04 1.22.12-.14 1.73-.95 2.04-1.67 2.07Z" />
    </svg>
  )
}

export function RedditTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#FF4500" />
      <path fill="#ffffff" d="M19 12a1.4 1.4 0 0 0-2.37-1 6.85 6.85 0 0 0-3.45-1.1l.59-2.74 1.9.41a1 1 0 1 0 .12-.72l-2.17-.46a.35.35 0 0 0-.42.27l-.66 3.07a6.9 6.9 0 0 0-3.5 1.1A1.4 1.4 0 1 0 7.99 13.3a2.7 2.7 0 0 0-.03.43c0 2.18 2.54 3.95 5.67 3.95s5.67-1.77 5.67-3.95c0-.14-.01-.28-.04-.42A1.4 1.4 0 0 0 19 12Zm-9.6.99a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm5.55 2.63c-.68.68-2.08.73-2.49.73s-1.81-.05-2.48-.73a.27.27 0 0 1 .38-.38c.43.43 1.34.58 2.1.58s1.68-.15 2.1-.58a.27.27 0 1 1 .39.38Zm-.17-1.63a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  )
}

export function BlueskyTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#0285FF" />
      <path fill="#ffffff" d="M8.3 7.1c1.5 1.13 3.1 3.43 3.7 4.68.6-1.25 2.2-3.55 3.7-4.68 1.08-.81 2.7-1.44 2.7.66 0 .42-.24 3.42-.38 3.91-.49 1.7-2.2 2.12-3.74 1.86 2.68.46 3.36 1.97 1.9 3.48-2.8 2.85-4.02-.72-4.33-1.63-.06-.17-.08-.25-.08-.18 0-.07-.03.01-.09.18-.31.91-1.53 4.48-4.33 1.63-1.46-1.51-.78-3.02 1.9-3.48-1.54.26-3.25-.16-3.74-1.86-.14-.49-.38-3.49-.38-3.91 0-2.1 1.62-1.47 2.7-.66Z" />
    </svg>
  )
}

export function MastodonTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#6364FF" />
      <path fill="#ffffff" d="M17.9 9.55c0-2.7-1.77-3.5-1.77-3.5-.9-.41-2.43-.59-4.05-.6h-.04c-1.62.01-3.16.19-4.05.6 0 0-1.77.8-1.77 3.5 0 .62-.01 1.36.01 2.15.06 2.65.48 5.27 2.93 5.92 1.15.3 2.13.37 2.92.32 1.28-.07 2-.46 2-.46l-.04-.93s-.92.29-1.95.26c-1.02-.04-2.1-.11-2.27-1.36a2.5 2.5 0 0 1-.02-.35s1 .24 2.28.3c.78.04 1.51-.05 2.26-.13 1.42-.17 2.66-1.06 2.82-1.86.25-1.27.23-3.1.23-3.1Zm-2.16 3.58h-1.34v-3.28c0-.69-.29-1.04-.88-1.04-.64 0-.97.42-.97 1.24v1.8h-1.33v-1.8c0-.82-.33-1.24-.97-1.24-.58 0-.87.35-.87 1.04v3.28H8.06V9.65c0-.69.18-1.24.53-1.64.36-.4.84-.61 1.44-.61.69 0 1.21.27 1.55.8l.33.56.34-.56c.34-.53.86-.8 1.55-.8.6 0 1.08.21 1.44.61.35.4.53.95.53 1.64Z" />
    </svg>
  )
}

export function GlobeTile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5.2" fill="#5B7083" />
      <g transform="translate(6 6) scale(0.5)" fill="none" stroke="#ffffff" strokeWidth="2.2">
        <circle cx="12" cy="12" r="8.4" />
        <path d="M12 3.6c-2.3 2.2-3.6 5.3-3.6 8.4s1.3 6.2 3.6 8.4c2.3-2.2 3.6-5.3 3.6-8.4S14.3 5.8 12 3.6Z" />
        <line x1="3.7" y1="12" x2="20.3" y2="12" />
      </g>
    </svg>
  )
}
