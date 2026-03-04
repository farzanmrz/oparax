"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SubmitButton({
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus()

  return (
    <Button disabled={pending || disabled} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  )
}
