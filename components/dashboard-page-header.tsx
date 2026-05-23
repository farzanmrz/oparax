"use client"

import { Fragment } from "react"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { AuthPendingLink } from "@/components/auth-pending-link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

const breadcrumbLinkClass =
  "rounded-sm font-medium text-link no-underline decoration-link/25 underline-offset-4 transition-[color,text-decoration-color] hover:text-link-hover hover:decoration-current active:text-link-active"

type Crumb = {
  label: string
  href?: string
}

type PageAction = {
  href: string
  label: string
}

export function DashboardPageHeader({
  title,
  description,
  breadcrumbs,
  action,
}: {
  title: string
  description?: string
  breadcrumbs: Crumb[]
  action?: PageAction
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="border-b border-border">
        <div className="mx-auto flex min-h-12 w-full max-w-screen-2xl items-center gap-2 px-2 md:px-4">
          <SidebarTrigger className="-ml-2 md:hidden" />
          <Breadcrumb>
            <BreadcrumbList className="gap-1 text-xs sm:text-[0.8rem]">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1

                return (
                  <Fragment key={`${crumb.label}-${index}`}>
                    <BreadcrumbItem>
                      {crumb.href && !isLast ? (
                        <BreadcrumbLink asChild className={breadcrumbLinkClass}>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="font-normal text-muted-foreground">
                          {crumb.label}
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {!isLast && (
                      <BreadcrumbSeparator className="text-muted-foreground/90 [&>svg]:size-4" />
                    )}
                  </Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-2 sm:flex-row sm:items-end sm:justify-between md:px-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="truncate text-3xl font-semibold tracking-tight text-heading">
            {title}
          </h1>
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
