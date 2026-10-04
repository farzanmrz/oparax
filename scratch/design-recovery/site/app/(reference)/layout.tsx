import "../globals.css";
import "../../directions/d1.css";
import "../../directions/d2.css";
import "../../directions/d3.css";
import "../../directions/d4.css";
import "../visual-directions.css";
import "../representations.css";
import "../catalog-foundation.css";
import "../shared-catalog.css";
import "../typography-preview.css";
import { TooltipProvider } from "@/components/ui/tooltip";
export const metadata = {
  title: "Oparax | Reference Set",
  robots: { index: false, follow: false },
};
// The earlier free and font-comparison set keeps its own root layout so its global CSS never reaches the Pro Exploration.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
