import { Mail } from "lucide-react"
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
import { requestPasswordReset } from "@/app/forgot-password/actions"

export function ForgotPasswordForm({
  error,
  message,
  className,
  ...props
}: React.ComponentProps<"div"> & { error?: string; message?: string }) {
  return (
    <div className={cn("auth-form-stack", className)} {...props}>
      <Card className="auth-card">
        <CardContent className="auth-card-content">
          <form action={requestPasswordReset} className="auth-form-panel">
            <FieldGroup className="auth-field-group">
              <div className="auth-heading-block">
                <h1 className="auth-heading">Reset your password</h1>
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
              {message && (
                <div
                  role="status"
                  className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
                >
                  {message}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                />
              </Field>
              <Field>
                <SubmitButton type="submit" className="auth-submit-button">
                  <Mail />
                  Send reset link
                </SubmitButton>
              </Field>
              <FieldDescription className="auth-inline-action">
                <AuthPendingLink
                  href="/login"
                  className="auth-link"
                >
                  Return to Login
                </AuthPendingLink>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
