// Font candidates for the scratch comparison page (owner, September 24). `font.variable` is the class
// that defines the variable; `css` is the var() to put in a style. Every family here is in
// shadcn's own font registry, so whichever pair wins can go into the preset and into Claude Design.

import {
  DM_Sans,
  Figtree,
  IBM_Plex_Sans,
  Instrument_Sans,
  Inter,
  Manrope,
  Noto_Sans,
  Nunito_Sans,
  Public_Sans,
  Roboto,
  Source_Sans_3,
} from "next/font/google";

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-source-sans-3",
});
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-noto-sans",
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-public-sans",
});
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-roboto",
});
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-nunito-sans",
});
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-instrument-sans",
});
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-figtree",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-dm-sans",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-inter",
});
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-ibm-plex-sans",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-manrope",
});

export const fonts = {
  "source-sans-3": { label: "Source Sans 3", font: sourceSans3, css: "var(--f-source-sans-3)" },
  "noto-sans": { label: "Noto Sans", font: notoSans, css: "var(--f-noto-sans)" },
  "public-sans": { label: "Public Sans", font: publicSans, css: "var(--f-public-sans)" },
  roboto: { label: "Roboto", font: roboto, css: "var(--f-roboto)" },
  "nunito-sans": { label: "Nunito Sans", font: nunitoSans, css: "var(--f-nunito-sans)" },
  "instrument-sans": {
    label: "Instrument Sans",
    font: instrumentSans,
    css: "var(--f-instrument-sans)",
  },
  figtree: { label: "Figtree", font: figtree, css: "var(--f-figtree)" },
  "dm-sans": { label: "DM Sans", font: dmSans, css: "var(--f-dm-sans)" },
  inter: { label: "Inter", font: inter, css: "var(--f-inter)" },
  "ibm-plex-sans": { label: "IBM Plex Sans", font: ibmPlexSans, css: "var(--f-ibm-plex-sans)" },
  manrope: { label: "Manrope", font: manrope, css: "var(--f-manrope)" },
} as const;

export type FontKey = keyof typeof fonts;
export const fontKeys = Object.keys(fonts) as FontKey[];
export const allFontVariables = fontKeys.map((k) => fonts[k].font.variable).join(" ");
