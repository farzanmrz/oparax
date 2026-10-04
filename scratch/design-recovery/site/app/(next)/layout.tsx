import "./next.css";
import "./palettes.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReviewDock } from "@/next/review-dock";
import { themeScript } from "@/next/theme";
import { paletteScript } from "@/next/palette";

export const metadata = {
  title: "Oparax | Structure Render",
  robots: { index: false, follow: false },
};

// Separate root layout for the structure-stage render. The theme is applied before paint so screenshots
// are deterministic: ?theme=light|dark first, then the stored choice, default dark. React never owns the
// html class, so a re-render cannot undo the script's choice. The palette script works the same way.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: paletteScript }} />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <ReviewDock />
      </body>
    </html>
  );
}
