import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getUsername } from "@/lib/user";

/**
 * App auth guard + shell for /agents/*. The old global top header is gone —
 * chrome now lives in a collapsible sidebar (components/app-sidebar.tsx) and
 * each page renders its own header bar as the first row of the inset. The
 * sidebar cookie is read server-side so collapse state survives navigation
 * without a flash. The inset keeps the viewport-owning structure: full-height,
 * scrollable region so the chat can own its viewport. The username comes from
 * lib/user.ts, same as before.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar username={getUsername(user)} />
      <SidebarInset className="h-dvh min-h-0 bg-background text-foreground">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex h-full w-full flex-col px-4 sm:px-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
