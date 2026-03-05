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
import { requestPasswordReset } from "@/app/forgot-password/actions"

export function ForgotPasswordForm({
  error,
  message,
  className,
  ...props
}: React.ComponentProps<"div"> & { error?: string; message?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action={requestPasswordReset} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Reset your password</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Enter your account email and we&apos;ll send you a secure reset
                  link.
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
                  placeholder="you@example.com"
                  required
                />
              </Field>
              <Field>
                <SubmitButton type="submit" className="h-11 w-full">
                  Send reset link
                </SubmitButton>
              </Field>
              <FieldDescription className="text-center">
                Remembered it?{" "}
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
