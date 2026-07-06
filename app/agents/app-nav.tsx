"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/agents", label: "Agents" },
  { href: "/agents/settings", label: "Settings" },
] as const;

// Client island for the app top-bar nav: highlights the active section.
// "Agents" covers the listing, /new and /[id]; "Settings" is the nested
// /agents/settings — special-cased so it doesn't also light up "Agents".
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/agents"
            ? pathname === "/agents" || pathname.startsWith("/agents/new") || isAgentDetail(pathname)
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

// A detail route (/agents/<id>) but not /agents/new or /agents/settings.
function isAgentDetail(pathname: string): boolean {
  const rest = pathname.slice("/agents/".length);
  return (
    pathname.startsWith("/agents/") &&
    rest.length > 0 &&
    !rest.startsWith("new") &&
    !rest.startsWith("settings")
  );
}
