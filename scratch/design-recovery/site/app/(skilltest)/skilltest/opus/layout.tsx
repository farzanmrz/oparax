import "@/skilltest/opus/opus.css";
import { themeScript } from "@/next/theme";

export const metadata = {
  title: "Oparax",
  description: "Oparax watches the web, X, GitHub and Product Hunt around your beat and brings each story to you on X.",
  robots: { index: false, follow: false },
};

// Root layout for this one route (no group-level layout, so sibling skilltest routes stay independent).
// The theme is set before paint: ?theme=light|dark first, then the stored choice, default dark.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="palette-council">{children}</body>
    </html>
  );
}
