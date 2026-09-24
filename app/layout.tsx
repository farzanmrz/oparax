// Root layout — wraps every page in the app. Loads fonts and global CSS.

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Manrope } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { landingContent } from "@/lib/landing/content";
import "./globals.css";
import { cn } from "@/lib/utils";

// The fonts are the preset's (DESIGN.md): Manrope for headings, IBM Plex Sans for text.
const manropeHeading = Manrope({ subsets: ["latin"], variable: "--font-heading" });

const ibmPlexSans = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-sans" });

// JetBrains Mono backs --font-mono: handles, counts, timestamps, money.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("bg-background font-sans", ibmPlexSans.variable, manropeHeading.variable)}
      suppressHydrationWarning
    >
      <body className={`${jetbrainsMono.variable} antialiased`}>
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
