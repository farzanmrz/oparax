import { UserRoundPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { AuthPendingLink } from "@/components/auth-pending-link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field"
import { SignupLiveFields } from "@/components/signup-live-fields"
import { SubmitButton } from "@/components/submit-button"
import { signup } from "@/app/signup/actions"

export function SignupForm({
  error,
  className,
  ...props
}: React.ComponentProps<"div"> & { error?: string }) {
  return (
    <div className={cn("auth-form-stack", className)} {...props}>
      <Card className="auth-card">
        <CardContent className="auth-card-content">
          <form action={signup} className="auth-form-panel">
            <FieldGroup className="auth-field-group">
              <div className="auth-heading-block">
                <h1 className="auth-heading">Sign Up</h1>
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
              <SignupLiveFields />
              <Field>
                <SubmitButton type="submit" className="auth-submit-button">
                  <UserRoundPlus />
                  Sign Up
                </SubmitButton>
              </Field>
              <FieldSeparator>
                Or
              </FieldSeparator>
              <Field className="auth-sso-stack">
                <Button variant="outline" type="button" className="auth-sso-button">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="currentColor"
                    />
                  </svg>
                  Continue with Apple
                </Button>
                <Button variant="outline" type="button" className="auth-sso-button">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>
                <Button variant="outline" type="button" className="auth-sso-button">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.226 5.596zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      fill="currentColor"
                    />
                  </svg>
                  Continue with X
                </Button>
              </Field>
              <FieldDescription className="auth-inline-action">
                Already have an account?{" "}
                <AuthPendingLink
                  href="/login"
                  className="auth-link"
                >
                  Login
                </AuthPendingLink>
              </FieldDescription>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="auth-legal">
        By clicking continue, you agree to our{" "}
        <a href="#" className="auth-link">Terms of Service</a>{" "}
        and{" "}
        <a href="#" className="auth-link">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
