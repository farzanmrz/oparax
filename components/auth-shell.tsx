import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader signedIn={false} />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <h1 className="font-heading text-xl font-normal tracking-tight text-balance">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
              ) : null}
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
          {footer ? (
            <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">{footer}</div>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Inline alert styles for auth error / notice messages. */
export function AuthAlert({
  tone,
  children,
}: {
  tone: "error" | "notice";
  children: React.ReactNode;
}) {
  if (tone === "error") {
    return (
      <p
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive"
      >
        {children}
      </p>
    );
  }
  return (
    <p
      role="status"
      className="rounded-lg border border-border bg-muted px-3 py-2 text-sm leading-relaxed text-foreground"
    >
      {children}
    </p>
  );
}
