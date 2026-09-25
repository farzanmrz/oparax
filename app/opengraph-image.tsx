import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OparaxMark } from "@/components/logo";
import { landingContent } from "@/lib/landing/content";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = landingContent.sharing.alt;

// Static fonts and OFL: marcologous/hanken-grotesk, Google's pinned source commit
// 1ab416e82130b2d3ddb7710abf7ceabf07156a13 (fonts/ttf and OFL.txt).
export default async function Image() {
  let fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];
  try {
    const [regular, bold] = await Promise.all([
      readFile(join(process.cwd(), "assets/fonts/HankenGrotesk-Regular.ttf")),
      readFile(join(process.cwd(), "assets/fonts/HankenGrotesk-Bold.ttf")),
    ]);
    fonts = [
      { name: "Hanken Grotesk", data: regular, weight: 400, style: "normal" },
      { name: "Hanken Grotesk", data: bold, weight: 700, style: "normal" },
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
        backgroundColor: "#0c0c0e",
        backgroundImage: "radial-gradient(ellipse at top, #112735, #0c0c0e 72%)",
        color: "#f5f6fc",
        fontFamily: fonts ? "Hanken Grotesk" : "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#ffffff" }}>
        <OparaxMark width={40} height={40} />
        <span style={{ fontSize: 30, fontWeight: 700 }}>{landingContent.brand}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 40,
          fontSize: 84,
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
          fontWeight: 700,
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
          color: "#afaba3",
        }}
      >
        {landingContent.sharing.description}
      </div>
      <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: "#999ba1" }}>
        {landingContent.sharing.domain}
      </div>
    </div>,
    { ...size, fonts },
  );
}
