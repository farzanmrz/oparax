"use client"

import { Fragment } from "react"
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

const breadcrumbLinkClass =
  "rounded-sm font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-4 transition-[color,text-decoration-color] hover:text-teal-900 hover:decoration-current active:text-teal-800 dark:text-teal-300 dark:decoration-teal-300/35 dark:hover:text-teal-100 dark:active:text-teal-200"

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
    <div className="flex w-full flex-col gap-5">
      <div className="flex min-h-7 items-center gap-2">
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
                      <BreadcrumbPage className="font-semibold text-foreground">
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 border-b border-border px-2 pb-5 sm:flex-row sm:items-end sm:justify-between md:px-4">
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
