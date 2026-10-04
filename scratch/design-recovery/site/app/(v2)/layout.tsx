import "../(next)/next.css";
import "../(next)/palettes.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense } from "react";
import { themeScript } from "@/next/theme";
import { StyleSwitcher } from "@/v2/shared/style-switcher";

export const metadata = {
  title: "Oparax | Directions v2",
  robots: { index: false, follow: false },
};

// Root layout for the three v2 direction flows. The theme is applied before paint (?theme=light|dark, then the
// stored choice, default dark) so screenshots are deterministic. Each direction wraps its pages in .palette-council.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Suspense>
          <StyleSwitcher />
        </Suspense>
      </body>
    </html>
  );
}
