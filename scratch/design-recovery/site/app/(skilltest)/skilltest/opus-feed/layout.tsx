import "./opus-feed.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeScript } from "@/next/theme";

export const metadata = {
  title: "Oparax | Feed directions (opus-feed)",
  robots: { index: false, follow: false },
};

// Root layout for the opus-feed directions. The theme is applied before paint (?theme=light|dark, then the
// stored choice, default dark) so headless screenshots are deterministic; pages wrap content in .palette-council.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
