import "../../../(next)/next.css";
import "../../../(next)/palettes.css";
import "../../../../skilltest/sonnet3/landing.css";
import { themeScript } from "@/next/theme";

export const metadata = {
  title: "Oparax | Landing (sonnet3)",
  robots: { index: false, follow: false },
};

// Own root layout for the sonnet3 landing test. Same foundation as the accepted feeds: next.css tokens and
// the council palette block, theme applied before paint from ?theme=light|dark (default dark).
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
