import Image from "next/image"
import Link from "next/link"
import { Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SubmitButton } from "@/components/submit-button"
import { login } from "@/app/login/actions"

export function LoginForm({
  error,
  message,
  className,
  ...props
}: React.ComponentProps<"div"> & { error?: string; message?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action={login} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Sign in</h1>
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
                <Input id="email" name="email" type="email" required />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-primary underline underline-offset-4 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Field>
                <SubmitButton type="submit" className="w-full bg-blue-500 text-white hover:bg-blue-700">
                  <Mail />
                  Sign in with email
                </SubmitButton>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or
              </FieldSeparator>
              <Field className="flex flex-col gap-3">
                <Button type="button" className="w-full bg-blue-500 text-white hover:bg-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="#000"
                    />
                  </svg>
                  Sign in with Apple
                </Button>
                <Button type="button" className="w-full bg-blue-500 text-white hover:bg-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </Button>
                <Button type="button" className="w-full bg-blue-500 text-white hover:bg-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.226 5.596zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      fill="#000"
                    />
                  </svg>
                  Sign in with X
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Don&apos;t have an account?{" "}
                <a href="/signup" className="font-medium text-blue-600 dark:text-blue-400 hover:text-primary underline underline-offset-4 transition-colors">
                  Sign up
                </a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/images/landing_bird.png"
              alt="Oparax bird illustration"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{" "}
        <a href="#" className="font-medium text-blue-600 dark:text-blue-400 hover:text-primary underline underline-offset-4 transition-colors">Terms of Service</a>{" "}
        and{" "}
        <a href="#" className="font-medium text-blue-600 dark:text-blue-400 hover:text-primary underline underline-offset-4 transition-colors">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
