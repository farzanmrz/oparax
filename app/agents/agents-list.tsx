import { PlusIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { OparaxMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

/**
 * The zero-desk landing state. `app/agents/page.tsx` redirects into the
 * reporter's most recent desk whenever one exists — this only renders when
 * they own none yet, or when the desk lookup itself errored. Everywhere else
 * the site header's desk switcher is the listing, so there's no list/search/
 * sort machinery here anymore.
 */
export function AgentsList({ error = null }: { readonly error?: string | null }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? <ErrorState message={error} /> : <EmptyState />}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <span className="flex size-20 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <OparaxMark className="size-10 text-primary" />
      </span>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-balance">
          Start your first news desk
        </h2>
        <p className="mx-auto max-w-lg text-base leading-relaxed text-pretty text-muted-foreground">
          A desk is an agent that watches a beat around the clock — aggregating atomic news items,
          surfacing developing stories, and drafting posts in your voice.
        </p>
      </div>
      <Button asChild className="h-12 px-6 text-base" size="lg">
        <Link href="/agents/new">
          <PlusIcon />
          Create your first agent
        </Link>
      </Button>
    </div>
  );
}

function ErrorState({ message }: { readonly message: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
        <TriangleAlertIcon aria-hidden="true" className="size-5 text-destructive" />
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Couldn&apos;t load your agents</h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
