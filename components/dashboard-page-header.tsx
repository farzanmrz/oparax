"use client"

import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-2 md:hidden" />
        <Breadcrumb>
          <BreadcrumbList className="text-[0.9rem]">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1

              return (
                <BreadcrumbItem key={`${crumb.label}-${index}`}>
                  {crumb.href && !isLast ? (
                    <BreadcrumbLink asChild className="font-medium">
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="font-semibold">
                      {crumb.label}
                    </BreadcrumbPage>
                  )}
                  {!isLast && <BreadcrumbSeparator />}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
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
            className="h-10 bg-foreground px-4 text-background shadow-sm shadow-foreground/10 hover:bg-foreground/90 hover:shadow-lg hover:shadow-foreground/15 active:bg-foreground/85 sm:w-auto"
          >
            <Link href={action.href}>
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              {action.label}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
