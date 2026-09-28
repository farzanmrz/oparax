import Link from "next/link";
import { MissingAgentHeading } from "@/components/monitor/refresh-while-building";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { monitorContent as copy } from "@/lib/monitor/content";
import { readViewer } from "@/lib/monitor/read";

export default async function MonitorNotFound() {
  const viewer = await readViewer();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={viewer.signedIn} />
      <main className="mx-auto flex w-full max-w-[1356px] flex-1 flex-col items-start justify-center gap-4 px-4 py-8">
        <MissingAgentHeading />
        <Button asChild className="min-h-11 desk:min-h-6">
          <Link href="/">{copy.home}</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
