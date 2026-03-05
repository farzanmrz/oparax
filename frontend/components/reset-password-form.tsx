import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/submit-button"
import { updatePassword } from "@/app/auth/reset-password/actions"

export function ResetPasswordForm({
  error,
  tokenHash,
  type,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  error?: string
  tokenHash?: string
  type?: "recovery"
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action={updatePassword} className="p-6 md:p-8">
            {tokenHash && <input type="hidden" name="token_hash" value={tokenHash} />}
            {type && <input type="hidden" name="type" value={type} />}
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Set a new password</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Use at least 6 characters and keep it unique to this account.
                </p>
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Confirm new password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                />
              </Field>
              <Field>
                <SubmitButton type="submit" className="h-11 w-full">
                  Update password
                </SubmitButton>
              </Field>
              <FieldDescription className="text-center">
                <Link href="/login" className="underline underline-offset-4">
                  Back to sign in
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/images/landing_bird.png"
              alt="Oparax bird illustration"
              fill
              sizes="(min-width: 768px) 50vw, 0vw"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
