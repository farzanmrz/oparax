import { notFound, redirect } from "next/navigation";
import { PageLine } from "@/components/one/app-shell";
import { OneShell } from "@/components/one/shell";
import { Stage } from "@/components/one/stage";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { settingsContent as copy } from "@/lib/settings/content";
import { readOwnerSettings } from "@/lib/settings/read";
import { isReservedHandle, normalizeValidHandle } from "@/lib/x/handle";

// The owner's three pages beside the feed (Sources, Notifications, Account) share one frame: the ownership read, the
// rail with the agent's sources, and the page line. Signed out leads to log in and back; another account's owner
// reads the one line that says so under the public header.

export async function readOwnerPage(
  rawHandle: string,
  page: "sources" | "notifications" | "account",
) {
  const valid = normalizeValidHandle(rawHandle);
  if (!valid || isReservedHandle(valid)) notFound();
  const handle = valid.toLowerCase();
  const owned = await readOwnerSettings(handle);
  if (!owned.ok && owned.reason === "signedOut")
    redirect(`/login?next=${encodeURIComponent(`/${handle}/${page}`)}`);
  return { handle, owned };
}

/** Someone signed in to another account: the public header and the one line that says so. */
export function Elsewhere({ title }: { title: string }) {
  return (
    <Stage>
      <SiteHeader signedIn />
      <main className="one-column flex-1 space-y-6 py-8">
        <h1 className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-t1">
          {title}
        </h1>
        <Alert>
          <AlertDescription>{copy.errors.wrongAccount}</AlertDescription>
        </Alert>
      </main>
      <SiteFooter />
    </Stage>
  );
}

/** The owner's page inside the shell: the rail with the sources, the title line, the page under it. */
export function OwnerPage({
  owned,
  title,
  children,
}: {
  owned: Extract<Awaited<ReturnType<typeof readOwnerSettings>>, { ok: true }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <OneShell email={owned.email} agent={owned.agent} sources={owned.railSources}>
      <PageLine title={title} home={`/${owned.monitor.handle}`} />
      {children}
    </OneShell>
  );
}
