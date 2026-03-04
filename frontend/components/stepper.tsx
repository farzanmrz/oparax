"use client"

import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"

interface StepperProps {
  steps: readonly string[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav
      aria-label="Progress"
      className={cn("flex items-center justify-between", className)}
    >
      {steps.map((label, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary text-primary",
                  !isCompleted &&
                    !isCurrent &&
                    "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    strokeWidth={2.5}
                    className="size-4"
                  />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full transition-colors",
                  index < currentStep
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
