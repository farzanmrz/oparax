import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

function getDisplayName({
  email,
  metadata,
}: {
  email: string
  metadata: Record<string, unknown>
}) {
  const metadataName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : typeof metadata.display_name === "string"
          ? metadata.display_name
          : ""

  if (metadataName.trim()) return metadataName.trim()
  if (email) return email.split("@")[0]

  return "Reporter"
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const email = user.email ?? ""
  const name = getDisplayName({
    email,
    metadata: user.user_metadata,
  })

  return (
    <SidebarProvider>
      <AppSidebar user={{ email, name }} />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-6 bg-muted/25 p-4 md:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
