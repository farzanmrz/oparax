import "./feed.css";
import "../../../(next)/palettes.css";
import { themeScript } from "@/next/theme";

export const metadata = {
  title: "Oparax | Feed direction (sonnet-feed)",
  robots: { index: false, follow: false },
};

// Own root layout for the sonnet-feed skill test. Theme is applied before paint from ?theme=light|dark (default
// dark), exactly as the accepted feeds do; tokens come from the fixed DESIGN.md files, pages wrap in .palette-council.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
