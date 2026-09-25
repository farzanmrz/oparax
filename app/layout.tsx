// Root layout: wraps every page in the app. Loads fonts and global CSS.

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Nunito_Sans, Source_Sans_3 } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { landingContent } from "@/lib/landing/content";
import "./globals.css";
import { cn } from "@/lib/utils";

// Nunito Sans for headings (the preset's) and Source Sans 3 for text (the owner's override); DESIGN.md.
const nunitoSansHeading = Nunito_Sans({ subsets: ["latin"], variable: "--font-heading" });

const sourceSans3 = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans" });

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
      className={cn("font-sans", sourceSans3.variable, nunitoSansHeading.variable)}
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
