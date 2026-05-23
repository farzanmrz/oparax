"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"
import {
  type ComponentProps,
  type MouseEvent,
  useState,
} from "react"
import { cn } from "@/lib/utils"

type AuthPendingLinkProps = ComponentProps<typeof Link>

function shouldShowPending(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  ) {
    return false
  }

  const link = event.currentTarget

  return (
    (!link.target || link.target === "_self") &&
    !link.hasAttribute("download")
  )
}

export function AuthPendingLink({
  children,
  className,
  onClick,
  ...props
}: AuthPendingLinkProps) {
  const [isPending, setIsPending] = useState(false)

  return (
    <Link
      {...props}
      aria-busy={isPending}
      data-pending={isPending ? true : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 data-[pending=true]:cursor-wait data-[pending=true]:opacity-80",
        className
      )}
      onClick={(event) => {
        onClick?.(event)

        if (shouldShowPending(event)) {
          setIsPending(true)
        }
      }}
    >
      {children}
      {isPending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
    </Link>
  )
}
