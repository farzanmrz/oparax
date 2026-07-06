import Link from "next/link";
import { redirect } from "next/navigation";
import { OparaxMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

// Landing page — signed-in users go straight to the app; everyone else gets
// the editorial pitch and entries into the auth pages.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/agents");

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <OparaxMark className="size-5" />
            Oparax
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-20 md:py-28">
          <p className="mb-6 flex items-center gap-2 text-sm font-medium tracking-widest text-muted-foreground uppercase">
            <span aria-hidden="true" className="size-2 rounded-full bg-live" />
            The AI news desk
          </p>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Your beat never sleeps. Now neither does your desk.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Oparax watches the accounts and sources you can&apos;t keep up with, surfaces breaking
            stories the moment they land, and drafts posts in your voice — ready for your byline.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="px-5">
              <Link href="/signup">Start reporting</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-5">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl gap-px bg-border px-0 md:grid-cols-3">
            <article className="bg-background p-6 md:p-8">
              <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
                01 — Watch
              </p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">Your beat, on the wire</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Oparax monitors the reporters, agencies, and sources on X that define your beat —
                around the clock, so nothing slips past.
              </p>
            </article>
            <article className="bg-background p-6 md:p-8">
              <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
                02 — Catch
              </p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">
                Breaking, before it breaks
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                When a story starts moving, Oparax flags it immediately with the context you need to
                decide whether it&apos;s yours to run with.
              </p>
            </article>
            <article className="bg-background p-6 md:p-8">
              <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
                03 — Draft
              </p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight">Posts in your voice</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Drafts arrive written the way you write — your cadence, your framing — so filing is
                an edit, not a rewrite.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
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
