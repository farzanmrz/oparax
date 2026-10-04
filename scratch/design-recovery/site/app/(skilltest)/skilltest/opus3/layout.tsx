import "./opus3.css";
import { themeScript } from "@/next/theme";

export const metadata = {
  title: "Oparax | Landing (skill test, opus3)",
  robots: { index: false, follow: false },
};

// Own root layout for the landing test. The theme is applied before paint (?theme=light|dark, then the stored
// choice, default dark) by the same script the accepted feeds use, so screenshots are deterministic.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
