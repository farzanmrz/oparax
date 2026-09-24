// Scratch font comparison (owner, September 24). /preview/fonts shows every candidate as a heading
// and a paragraph; /preview/fonts?h=<key>&b=<key> renders the preview page in that pair.

import Link from "next/link";
import { OparaxMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { allFontVariables, type FontKey, fontKeys, fonts } from "./fonts";

const pairs: { h: FontKey; b: FontKey; note: string }[] = [
  {
    h: "public-sans",
    b: "source-sans-3",
    note: "recommended: wide and grounded headings, open comfortable text",
  },
  { h: "source-sans-3", b: "source-sans-3", note: "one family, headings in a heavier weight" },
  { h: "noto-sans", b: "source-sans-3", note: "the most neutral heading" },
  { h: "roboto", b: "roboto", note: "the plain choice" },
  { h: "nunito-sans", b: "source-sans-3", note: "your preset's heading, softer" },
  { h: "instrument-sans", b: "public-sans", note: "a little more character" },
];

function key(v: string | string[] | undefined, fallback: FontKey): FontKey {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s in fonts ? (s as FontKey) : fallback;
}

const sources = [
  {
    name: "MarkTechPost",
    focus: "AI research news",
    reason: "you linked it 4 times",
    strong: true,
  },
  { name: "The Verge", focus: "AI", reason: "you quoted its writers twice", strong: true },
  { name: "OpenAI", focus: "News", reason: "on your beat", strong: false },
];

export default async function FontsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const h = key(sp.h, "public-sans");
  const b = key(sp.b, "source-sans-3");
  const headingFamily = fonts[h].css;
  const bodyFamily = fonts[b].css;
  const showPair = "h" in sp || "b" in sp;

  return (
    <div className={`${allFontVariables} min-h-dvh bg-background text-foreground`}>
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1356px] items-center justify-between px-4 desk:px-6">
          <span
            className="flex items-center gap-2 text-[17px] tracking-tight"
            style={{ fontFamily: bodyFamily }}
          >
            <OparaxMark className="size-5 text-foreground" />
            Oparax
          </span>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/preview/fonts">All fonts</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main
        className="mx-auto max-w-[1356px] px-4 py-10 desk:px-6"
        style={{ fontFamily: bodyFamily }}
      >
        <section>
          <p className="text-sm text-muted-foreground">Pairs, each a full page: click to see it.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pairs.map((p) => (
              <Button
                key={`${p.h}-${p.b}`}
                variant={p.h === h && p.b === b && showPair ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={`/preview/fonts?h=${p.h}&b=${p.b}`}>
                  {fonts[p.h].label} / {fonts[p.b].label}
                </Link>
              </Button>
            ))}
          </div>
          {showPair ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Heading {fonts[h].label}, text {fonts[b].label}.{" "}
              {pairs.find((p) => p.h === h && p.b === b)?.note ?? ""}
            </p>
          ) : null}
        </section>

        {showPair ? (
          <>
            <section className="mt-12 max-w-3xl">
              <h1
                className="text-4xl tracking-tight desk:text-5xl"
                style={{ fontFamily: headingFamily }}
              >
                The internet, watched for one person.
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Type your X handle and one sentence about what you follow. Oparax reads your
                activity once, picks the sources that fit, and turns what they publish into cards.
              </p>
              <form className="mt-8 flex flex-col gap-3 desk:flex-row">
                <Input placeholder="@handle" className="desk:max-w-44" aria-label="X handle" />
                <Input placeholder="what you follow, in one sentence" aria-label="Your beat" />
                <Button type="button">Build</Button>
              </form>
            </section>
            <section className="mt-14">
              <h2 className="text-xl tracking-tight" style={{ fontFamily: headingFamily }}>
                Your sources
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Strong matches are on by default.
              </p>
              <div className="mt-6 grid gap-4 desk:grid-cols-3">
                {sources.map((s) => (
                  <Card key={s.name}>
                    <CardHeader>
                      <CardTitle style={{ fontFamily: headingFamily }}>{s.name}</CardTitle>
                      <CardDescription>{s.focus}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{s.reason}</span>
                      <Switch defaultChecked={s.strong} aria-label={`Watch ${s.name}`} />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-2">
                <Badge>Watching</Badge>
                <Badge variant="secondary">Building</Badge>
                <Badge variant="outline">Not monitored yet</Badge>
                <span className="ml-2 font-mono text-sm text-muted-foreground">
                  @nihan · 25 posts · 2m ago
                </span>
              </div>
            </section>
          </>
        ) : (
          <section className="mt-10 grid gap-6 desk:grid-cols-2">
            {fontKeys.map((k) => (
              <Card key={k} style={{ fontFamily: fonts[k].css }}>
                <CardHeader>
                  <CardDescription className="font-mono">{fonts[k].label}</CardDescription>
                  <CardTitle className="text-3xl tracking-tight">
                    Alibaba releases Qwen-Image-2.1, a 7B open-weight image model
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[15px] leading-relaxed">
                    Alibaba's Qwen team has released Qwen-Image-2.1, a unified text-to-image
                    generation and image editing model. The 7B model is open weight, and the team
                    says it improves on text rendering inside images and on multi-image editing.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    MarkTechPost · you linked it 4 times · 0.92 fit
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" asChild>
                      <Link href={`/preview/fonts?h=${k}&b=${k}`}>Use for both</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/preview/fonts?h=${k}&b=source-sans-3`}>Heading only</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
