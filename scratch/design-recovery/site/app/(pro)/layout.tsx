import "./pro.css";
import { TooltipProvider } from "@/components/ui/tooltip";
export const metadata = {
  title: "Oparax | Pro Exploration",
  robots: { index: false, follow: false },
};
// Separate root layout: full Tailwind preflight and the shared Pro theme never mix with the reference set's CSS.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
