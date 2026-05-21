"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [isVisible, setIsVisible] = useState(false)
  const Icon = isVisible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-muted-foreground/75 active:text-muted-foreground/90 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none"
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export { PasswordInput }
