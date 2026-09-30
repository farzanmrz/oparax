import Link from "next/link";
import { ContactDialog } from "@/components/landing/contact-dialog";
import { landingContent } from "@/lib/landing/content";

const linkClassName =
  "inline-flex min-h-11 items-center rounded-md hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring desk:min-h-8";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <nav
        aria-label={landingContent.footer.label}
        className="mx-auto flex min-h-14 w-[min(90%,1800px)] items-center justify-center gap-6 text-[13.5px] text-muted-foreground desk:justify-end"
      >
        {landingContent.footer.links.map((link) => (
          <Link key={link.href} href={link.href} className={linkClassName}>
            {link.label}
          </Link>
        ))}
        <ContactDialog triggerClassName={linkClassName} />
      </nav>
    </footer>
  );
}
