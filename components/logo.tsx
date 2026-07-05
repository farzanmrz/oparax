// Oparax "orbit" mark — two round-capped arcs + core dot. Draws with
// currentColor so it adapts to the surrounding text color. The wordmark is
// always plain text next to the mark, never an image.
export function OparaxMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true" {...props}>
      <path
        d="M 431.77 811.44 A 310 310 0 0 1 431.77 212.56"
        fill="none"
        stroke="currentColor"
        strokeWidth="73"
        strokeLinecap="round"
      />
      <path
        d="M 592.23 212.56 A 310 310 0 0 1 592.23 811.44"
        fill="none"
        stroke="currentColor"
        strokeWidth="73"
        strokeLinecap="round"
      />
      <circle cx="512" cy="512" r="132" fill="currentColor" />
    </svg>
  );
}
