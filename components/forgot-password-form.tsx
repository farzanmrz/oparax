import Image from "next/image"
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

const linkClass =
  "rounded-sm font-semibold !text-teal-700 underline decoration-teal-700/30 underline-offset-4 transition-[color,text-decoration-color] hover:!text-teal-900 hover:decoration-current active:!text-teal-800"

const submitButtonClass =
  "h-11 w-full bg-teal-600 text-white shadow-sm shadow-teal-950/20 hover:-translate-y-px hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-950/25 active:translate-y-0 active:scale-[0.99] active:bg-teal-700 active:shadow-inner"

export function ForgotPasswordForm({
  error,
  message,
  className,
  ...props
}: React.ComponentProps<"div"> & { error?: string; message?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border-border/70 bg-card/95 p-0 shadow-2xl shadow-foreground/10 md:h-[700px]">
        <CardContent className="grid h-full p-0 md:grid-cols-2">
          <form action={requestPasswordReset} className="flex h-full flex-col justify-center bg-gradient-to-b from-card to-muted/30 p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-semibold">Reset your password</h1>
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
                <SubmitButton type="submit" className={submitButtonClass}>
                  <Mail />
                  Send reset link
                </SubmitButton>
              </Field>
              <FieldDescription className="text-center">
                <AuthPendingLink
                  href="/login"
                  className={linkClass}
                >
                  Return to Login
                </AuthPendingLink>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted/60 hidden items-center justify-center p-6 md:flex">
            <Image
              src="/images/landing_bird.png"
              alt="Oparax bird illustration"
              width={1696}
              height={2528}
              sizes="(min-width: 768px) 50vw, 0vw"
              className="h-full max-h-full w-auto max-w-full object-contain opacity-90"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
