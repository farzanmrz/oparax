"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type DeleteActionResult = {
  success?: boolean
  error?: string
}

export function ConfirmedDeleteButton({
  action,
  confirmDescription = "This action cannot be undone.",
  confirmTitle = "Are you sure?",
  label = "Delete",
  redirectTo,
}: {
  action: () => Promise<DeleteActionResult>
  confirmDescription?: string
  confirmTitle?: string
  label?: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await action()

      if (result.error) {
        toast.error(result.error)
        return
      }

      setOpen(false)

      if (redirectTo) {
        router.push(redirectTo)
      }

      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <HugeiconsIcon
            icon={Delete02Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isPending}>
              No
            </Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            pending={isPending}
            disabled={isPending}
            onClick={handleConfirm}
          >
            Yes, delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
