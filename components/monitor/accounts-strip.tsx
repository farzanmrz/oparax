import { Badge } from "@/components/ui/badge";
import { monitorContent as copy } from "@/lib/monitor/content";
import type { MonitorFeed } from "@/lib/monitor/read";
import { normalizeValidHandle } from "@/lib/x/handle";

export function AccountsStrip({ accounts }: { accounts: MonitorFeed["accounts"] }) {
  return (
    <section aria-labelledby="accounts-heading" className="space-y-4">
      <h2 id="accounts-heading" className="font-heading text-xl font-semibold">
        {copy.accounts}
      </h2>
      {!accounts.length ? <p className="text-muted-foreground">{copy.noAccounts}</p> : null}
      <ul className="space-y-3">
        {accounts.map((account) => {
          const handle = normalizeValidHandle(account.handle);
          return (
            <li key={account.handle} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" asChild>
                  <a
                    href={handle ? `https://x.com/${handle}` : undefined}
                    className="min-h-11 desk:min-h-6"
                  >
                    @{account.handle}
                  </a>
                </Badge>
                {account.watched ? <Badge variant="secondary">{copy.watched}</Badge> : null}
              </div>
              {account.name ? <p>{account.name}</p> : null}
              <p className="text-sm text-muted-foreground">{account.why}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
