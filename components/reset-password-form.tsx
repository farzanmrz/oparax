import { cn } from "@/lib/utils"
import { AuthPendingLink } from "@/components/auth-pending-link"
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
    <div className={cn("auth-form-stack", className)} {...props}>
      <Card className="auth-card">
        <CardContent className="auth-card-content">
          <form action={updatePassword} className="auth-form-panel">
            {tokenHash && <input type="hidden" name="token_hash" value={tokenHash} />}
            {type && <input type="hidden" name="type" value={type} />}
            <FieldGroup className="auth-field-group">
              <div className="auth-heading-block">
                <h1 className="auth-heading">Set a new password</h1>
                <p className="auth-helper text-balance">
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
              <Field className="auth-action-field">
                <SubmitButton type="submit" className="auth-submit-button">
                  Update password
                </SubmitButton>
              </Field>
              <FieldDescription className="auth-inline-action">
                <AuthPendingLink href="/login" className="auth-link">
                  Back to Login
                </AuthPendingLink>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
