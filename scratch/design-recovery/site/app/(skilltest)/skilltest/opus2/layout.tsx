import "./opus2.css";
import { themeScript } from "@/next/theme";

export const metadata = {
  title: "Oparax | Landing (opus2 skill test)",
  robots: { index: false, follow: false },
};

// Own root layout. The theme is set before paint from ?theme=light|dark, then the stored choice, default dark.
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
