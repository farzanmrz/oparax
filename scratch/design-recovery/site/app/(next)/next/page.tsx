import Link from "next/link";
import { screens } from "@/next/screens";

// Review tooling: a plain list of every screen and state.
export default function Index() {
  return (
    <main className="mx-auto w-[90%] max-w-[1800px] py-10">
      <h1 className="text-2xl font-semibold">Oparax structure render</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every screen and state. Add ?theme=light or ?theme=dark to any link, and ?chrome=0 to hide the review dock.
      </p>
      <div className="mt-8 grid grid-cols-4 gap-8">
        {screens.map((group) => (
          <section key={group.group}>
            <h2 className="text-sm font-semibold">{group.group}</h2>
            <ul className="mt-2 space-y-1">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-primary underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">{link.href}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
