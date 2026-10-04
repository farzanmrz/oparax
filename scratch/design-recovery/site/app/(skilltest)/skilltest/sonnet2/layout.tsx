import "@/skilltest/sonnet2/sonnet2.css";
import { themeScript } from "@/skilltest/sonnet2/theme";

export const metadata = { title: "Oparax", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="s2">{children}</body>
    </html>
  );
}
