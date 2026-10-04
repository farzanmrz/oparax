// Root layout: wraps every page in the app. Loads fonts and global CSS.

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BotIdClient } from "botid/client";
import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { landingContent } from "@/lib/landing/content";
import "./globals.css";
import { cn } from "@/lib/utils";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(landingContent.sharing.origin),
  title: landingContent.sharing.title,
  description: landingContent.sharing.description,
  openGraph: {
    siteName: landingContent.brand,
    type: "website",
    title: landingContent.sharing.title,
    description: landingContent.sharing.description,
  },
  twitter: {
    card: "summary_large_image",
    title: landingContent.sharing.title,
    description: landingContent.sharing.description,
    images: [
      {
        url: "/opengraph-image",
        alt: landingContent.sharing.alt,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceef2" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", openSans.variable)} suppressHydrationWarning>
      <body className="antialiased">
        <BotIdClient
          protect={[
            { path: "/api/build", method: "POST" },
            { path: "/api/waitlist", method: "POST" },
          ]}
        />
        {/* Dark by default; the person can switch to light (owner, September 23). */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
