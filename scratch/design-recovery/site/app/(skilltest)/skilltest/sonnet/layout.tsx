import "@/skilltest/sonnet/styles.css";
import { themeScript } from "@/skilltest/sonnet/theme-script";

export const metadata = {
  title: "Oparax | Landing (skilltest sonnet)",
  robots: { index: false, follow: false },
};

// Own root layout for this route. The theme is applied before paint (?theme=light|dark, then the stored choice,
// default dark) and React never owns the html attribute, so a re-render cannot undo it.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="s-body">{children}</body>
    </html>
  );
}
