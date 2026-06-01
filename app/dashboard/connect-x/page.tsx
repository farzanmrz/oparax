// Imports
import { redirect } from "next/navigation"
import { ConnectX } from "@/components/loop/connect-x"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

function getSafeNextPath(next: string | undefined): string {
  if (!next) return "/dashboard/agents"
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard/agents"
  if (next === "/login" || next === "/signup") return "/dashboard/agents"
  if (next.startsWith("/dashboard/connect-x")) return "/dashboard/agents"
  return next
}

/**
 * Required X connection gate. Users need a connected X account before creating
 * agents because the MVP workflow ends in manual posting.
 * @param props.searchParams - optional next path and reason
 * @returns the Connect X page, or redirects if already connected
 */
export default async function ConnectXPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>
}) {
  const params = await searchParams
  const nextPath = getSafeNextPath(params.next)
  const supabase = await createClient()

  const { data: connection } = await supabase
    .from("x_connections")
    .select("id")
    .maybeSingle<{ id: string }>()

  if (connection) {
    redirect(nextPath)
  }

  const message =
    params.reason === "create-agent"
      ? "Connect X before creating an agent."
      : "Connect X to create agents and post drafted items."

  return (
    <div className="flex w-full flex-col gap-6">
      <DashboardPageHeader title="Connect X" description={message} />
      <div className="mx-auto w-full max-w-screen-2xl px-2 md:px-4">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="max-w-xl text-base leading-6 text-muted-foreground">
              Oparax uses X only for posting. Email/password remains your login,
              and the X token is stored separately for this account.
            </p>
            <ConnectX nextPath={nextPath} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
