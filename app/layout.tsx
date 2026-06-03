// Root layout — wraps every page in the app. Loads fonts and global CSS.
import type { Metadata } from "next";
import { Roboto_Flex, IBM_Plex_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from '@vercel/analytics/next';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const robotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Oparax",
  description: "The Chirp app for Oparax",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${robotoFlex.variable} ${ibmPlexMono.variable} antialiased`}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
