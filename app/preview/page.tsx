// Scratch preview of the design system (owner, September 23): header, logo, name, the light and
// dark switch, and the basic pieces a page is made of. Not a product page; delete when issue 1 lands.

import { OparaxMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const shadowMd =
  "shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_1px_-0.5px_rgba(0,0,0,0.06),0px_3px_3px_-1.5px_rgba(0,0,0,0.06),_0px_6px_6px_-3px_rgba(0,0,0,0.06),0px_12px_12px_-6px_rgba(0,0,0,0.06),0px_24px_24px_-12px_rgba(0,0,0,0.06)]";

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

export default function PreviewPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1356px] items-center justify-between px-4">
          <span className="flex items-center gap-2 text-[17px] tracking-tight">
            <OparaxMark className="size-5 text-foreground" />
            Oparax
          </span>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm">
              Log in
            </Button>
            <Button size="sm">Build your monitor</Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1356px] px-4 py-14">
        <section className="max-w-2xl">
          <h1 className="font-heading text-4xl tracking-tight desk:text-5xl">
            The internet, watched for one person.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Type your X handle and one sentence about what you follow. Oparax reads your activity
            once, picks the sources that fit, and turns what they publish into cards.
          </p>
          <form className="mt-8 flex flex-col gap-3 desk:flex-row">
            <Input placeholder="@handle" className="desk:max-w-44" aria-label="X handle" />
            <Input placeholder="what you follow, in one sentence" aria-label="Your beat" />
            <Button type="button">Build</Button>
          </form>
        </section>

        <section className="mt-16">
          <h2 className="font-heading text-xl tracking-tight">Your sources</h2>
          <p className="mt-1 text-sm text-muted-foreground">Strong matches are on by default.</p>
          <div className="mt-6 grid gap-4 desk:grid-cols-3">
            {sources.map((s) => (
              <Card key={s.name} className={shadowMd}>
                <CardHeader>
                  <CardTitle className="font-heading">{s.name}</CardTitle>
                  <CardDescription>{s.focus}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{s.reason}</span>
                  <Switch defaultChecked={s.strong} aria-label={`Watch ${s.name}`} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-heading text-xl tracking-tight">States</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge>Watching</Badge>
            <Badge variant="secondary">Building</Badge>
            <Badge variant="outline">Not monitored yet</Badge>
            <Badge variant="destructive">Failed</Badge>
            <span className="ml-2 font-mono text-sm text-muted-foreground">
              @nihan · 25 posts · 2m ago
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Remove</Button>
          </div>
        </section>
      </main>
    </div>
  );
}
