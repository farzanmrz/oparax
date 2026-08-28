import Link from "next/link";
import { OnboardBox } from "@/app/onboard/onboard-box";
import { OparaxMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

// Landing page: the front door for everyone, signed in or not (#131). The handle box awaits
// the whole pilot build inside its server action, so this page carries the long maxDuration.
export const maxDuration = 800;

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-[90rem] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <OparaxMark className="size-5" />
            Oparax
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="ghost" className="h-11 desk:h-8">
                <Link href="/agents">Your desks</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="h-11 desk:h-8">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="h-11 desk:h-8">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-[81rem] flex-1 flex-col justify-center px-6 py-16 desk:py-24">
          <p className="mb-6 flex items-center gap-2 text-sm font-medium tracking-widest text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-live" />
            AI news monitoring
          </p>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight desk:text-6xl">
            A desk that watches your beat around the clock
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Oparax monitors the accounts and sites that define a beat, catches the stories that
            matter, and sends breaking news straight to you as X DMs, with a public live feed page
            for your readers.
          </p>
          <div className="mt-10">
            <OnboardBox />
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-[81rem] gap-px bg-border px-0 desk:grid-cols-3">
            <article className="bg-background p-6 desk:p-8">
              <p className="text-sm font-medium tracking-widest text-muted-foreground">01</p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">Watch</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Your desk follows the X accounts and news sites that define your beat, around the
                clock, and filters out everything that isn&apos;t yours.
              </p>
            </article>
            <article className="bg-background p-6 desk:p-8">
              <p className="text-sm font-medium tracking-widest text-muted-foreground">02</p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">Alert</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                When a story on your beat breaks, you get an X DM with the headline, the key fact,
                and a link, usually within minutes.
              </p>
            </article>
            <article className="bg-background p-6 desk:p-8">
              <p className="text-sm font-medium tracking-widest text-muted-foreground">03</p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">Feed page</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Every desk gets a public live feed page you can share, so your readers can follow
                the beat as it moves.
              </p>
            </article>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-[81rem] px-6 py-12 desk:py-16">
            <p className="text-sm font-medium tracking-widest text-muted-foreground">
              Sample alert
            </p>
            <div className="mt-4 max-w-md rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Oparax · sample DM</p>
              <div className="mt-2 rounded-md bg-muted p-3 text-sm leading-relaxed">
                <p>Breaking on your beat: the transfer window&apos;s biggest move is done.</p>
                <p className="mt-2">Fee reported at 90m euros, medical set for tomorrow.</p>
                <p className="mt-2 text-accent">oparax.ai/feed/yourdesk</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                This is a sample. Real alerts carry the story that just broke on your beat.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 w-full max-w-[90rem] items-center justify-between px-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <OparaxMark className="size-4" />
            Oparax
          </span>
          <span>Built for reporters on deadline.</span>
        </div>
      </footer>
    </div>
  );
}
