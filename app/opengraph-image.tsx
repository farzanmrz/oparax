import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OparaxMark } from "@/components/logo";
import { landingContent } from "@/lib/landing/content";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = landingContent.sharing.alt;

// The site's own fonts (DESIGN.md), static files from Google Fonts with their OFL licenses beside
// them: Nunito Sans for the headline, Source Sans 3 for the wordmark and text.
export default async function Image() {
  let fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];
  try {
    const dir = join(process.cwd(), "assets/fonts");
    const [heading, text, textMedium] = await Promise.all([
      readFile(join(dir, "NunitoSans-Regular.ttf")),
      readFile(join(dir, "SourceSans3-Regular.ttf")),
      readFile(join(dir, "SourceSans3-Medium.ttf")),
    ]);
    fonts = [
      { name: "Nunito Sans", data: heading, weight: 400, style: "normal" },
      { name: "Source Sans 3", data: text, weight: 400, style: "normal" },
      { name: "Source Sans 3", data: textMedium, weight: 500, style: "normal" },
    ];
  } catch (error) {
    console.error("Could not load landing preview fonts; using the default sans font.", error);
  }

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "48px 56px",
        backgroundColor: "#09090b",
        color: "#fafafa",
        fontFamily: fonts ? "Source Sans 3" : "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#ffffff" }}>
        <OparaxMark width={40} height={40} />
        <span style={{ fontSize: 30, fontWeight: 500 }}>{landingContent.brand}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 40,
          fontSize: 84,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          fontWeight: 400,
          fontFamily: fonts ? "Nunito Sans" : "sans-serif",
        }}
      >
        <span>{landingContent.sharing.headline}</span>
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 26,
          maxWidth: "100%",
          fontSize: 30,
          lineHeight: 1.4,
          color: "#9f9fa9",
        }}
      >
        {landingContent.sharing.description}
      </div>
      <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: "#9f9fa9" }}>
        {landingContent.sharing.domain}
      </div>
    </div>,
    { ...size, fonts },
  );
}
