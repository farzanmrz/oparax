"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { AuthPendingLink } from "@/components/auth-pending-link"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

type PageAction = {
  href: string
  label: string
}

export function DashboardPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: PageAction
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-2 sm:flex-row sm:items-end sm:justify-between md:px-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-2 md:hidden" />
            <h1 className="truncate text-3xl font-semibold tracking-tight text-heading">
              {title}
            </h1>
          </div>
          {description && (
            <p className="max-w-2xl text-base text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && (
          <Button
            asChild
            size="lg"
          >
            <AuthPendingLink href={action.href}>
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              {action.label}
            </AuthPendingLink>
          </Button>
        )}
      </div>
    </div>
  )
}
