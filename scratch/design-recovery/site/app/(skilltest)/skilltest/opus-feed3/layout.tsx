import "./opus-feed3.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeScript } from "@/next/theme";

export const metadata = {
  title: "Oparax | Feed directions (opus-feed3)",
  robots: { index: false, follow: false },
};

// Root layout for the opus-feed3 directions (three-way consensus, October 2). The theme is applied before paint
// (?theme=light|dark, then the stored choice, default dark) so headless screenshots are deterministic; pages wrap
// their content in .palette-council.
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
