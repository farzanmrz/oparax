"use client"

// Imports
import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  updateDisplayName,
  type UpdateDisplayNameState,
} from "@/app/dashboard/settings/actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/submit-button"
import { SignOutButton } from "@/components/sign-out-button"
import { ConnectX } from "@/components/loop/connect-x"
import { DisconnectXButton } from "@/components/loop/disconnect-x-button"

/**
 * Profile settings section: edit the display name, manage the connected X
 * account, and sign out. Client island because it drives a Server Action via
 * useActionState and refreshes the router so the sidebar name updates on save.
 * @param props.initialDisplayName - current display name (defaultValue)
 * @param props.xUsername - connected X handle, if any
 * @param props.xError - X connect/callback error to surface, if any
 * @returns the profile section UI
 */
export function ProfileSection({
  initialDisplayName,
  xUsername,
  xError,
  agentCount,
}: {
  initialDisplayName: string
  xUsername?: string
  xError?: string
  agentCount: number
}) {

  // Router to refresh server components (sidebar name) after a save.
  const router = useRouter()

  // Wire the display-name Server Action into a form action.
  const [state, dispatch] = useActionState<UpdateDisplayNameState, FormData>(
    updateDisplayName,
    {},
  )

  // On a successful save, refresh so the sidebar/header re-read the new name.
  useEffect(() => {
    if (state.success) {
      router.refresh()
    }
  }, [state.success, router])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            This name appears in the sidebar and on your drafts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={dispatch} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="display_name">Display name</FieldLabel>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={initialDisplayName}
                maxLength={60}
                aria-invalid={state.error ? true : undefined}
                placeholder="Your name"
              />
              <FieldError>{state.error}</FieldError>
              {state.success && (
                <p className="text-sm text-muted-foreground">Saved.</p>
              )}
            </Field>
            <SubmitButton className="self-start">Save</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected accounts</CardTitle>
          <CardDescription>
            Link your X (Twitter) account to post drafts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {xUsername ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                Connected as <span className="font-medium">@{xUsername}</span>
              </p>
              <DisconnectXButton agentCount={agentCount} />
            </div>
          ) : (
            <ConnectX />
          )}
          {xError && <p className="text-sm text-destructive">{xError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details and session.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  )
}
