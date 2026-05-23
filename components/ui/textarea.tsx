import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-background/35 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive disabled:bg-input/50 placeholder:text-muted-foreground flex field-sizing-content min-h-20 w-full rounded-lg border-2 px-3.5 py-3 text-base transition-colors outline-none hover:border-foreground/35 hover:bg-background/45 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
