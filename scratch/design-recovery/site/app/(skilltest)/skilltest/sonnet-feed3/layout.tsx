import "./feed3.css";
import "../../../(next)/palettes.css";
import { themeScript } from "@/next/theme";

export const metadata = {
  title: "Oparax | Feed directions (sonnet-feed3)",
  robots: { index: false, follow: false },
};

// Own root layout for the sonnet-feed3 directions. Theme is applied before paint from ?theme=light|dark (default
// dark), as the accepted feeds do; tokens come from the fixed DESIGN.md files and pages wrap in .palette-council.
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
