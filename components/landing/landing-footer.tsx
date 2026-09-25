import Link from "next/link";
import { ContactDialog } from "@/components/landing/contact-dialog";
import { legalLinks } from "@/lib/legal/content";

// The footer links and the Contact trigger look identical.
const linkClassName = "inline-flex h-11 items-center hover:text-foreground desk:h-auto";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <nav className="mx-auto flex min-h-14 max-w-[1356px] items-center justify-center gap-6 px-4 text-[13.5px] text-muted-foreground">
        {legalLinks.map((link) => (
          <Link key={link.href} href={link.href} className={linkClassName}>
            {link.label}
          </Link>
        ))}
        <ContactDialog triggerClassName={linkClassName} />
      </nav>
    </footer>
  );
}
