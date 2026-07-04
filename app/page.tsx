import Link from "next/link";
import { redirect } from "next/navigation";
import { OparaxMark } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";

// Stub landing page — signed-in users go straight to the app; everyone else
// gets the app name and links into the auth pages. v0 owns the real design.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-sm space-y-4 p-8">
      <h1 className="flex items-center gap-2">
        <OparaxMark className="size-5" />
        Oparax
      </h1>
      <nav className="space-x-4">
        <Link href="/login">Log in</Link>
        <Link href="/signup">Sign up</Link>
      </nav>
    </main>
  );
}
