import Link from "next/link";
import { Mail } from "lucide-react";
import { XLogo } from "@/pro/shared/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { auth } from "./copy";

// Stock shadcn login-03 (radix-mira) composition, imported as is. Only the providers (Continue with X,
// Continue with Google, email and password) and the copy (lib/auth/content.ts) are swapped. No design work.

function GoogleMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted p-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">{children}</div>
    </div>
  );
}

function Providers() {
  return (
    <>
      <Field>
        <Button variant="outline" type="button" asChild>
          <Link href="/next/setup">
            <XLogo />
            {auth.x}
          </Link>
        </Button>
        <Button variant="outline" type="button" asChild>
          <Link href="/next/setup?handle=typed">
            <GoogleMark />
            {auth.google}
          </Link>
        </Button>
      </Field>
      <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">{auth.or}</FieldSeparator>
    </>
  );
}

export function LoginCard() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{auth.login.title}</CardTitle>
        <CardDescription>{auth.login.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/next/feed/page">
          <FieldGroup>
            <Providers />
            <Field>
              <FieldLabel htmlFor="email">{auth.email}</FieldLabel>
              <Input id="email" type="email" placeholder={auth.emailPlaceholder} />
            </Field>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">{auth.password}</FieldLabel>
                <Link href="/next/forgot" className="ml-auto text-sm underline-offset-4 hover:underline">
                  {auth.login.forgot}
                </Link>
              </div>
              <Input id="password" type="password" />
            </Field>
            <Field>
              <Button type="submit">{auth.login.submit}</Button>
              <Button variant="ghost" type="button">
                <Mail />
                {auth.login.magic}
              </Button>
              <FieldDescription className="text-center">
                {auth.login.noAccount} <Link href="/next/signup">Sign up</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export function SignupCard() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{auth.signup.title}</CardTitle>
        <CardDescription>{auth.signup.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/next/signup/sent">
          <FieldGroup>
            <Providers />
            <Field>
              <FieldLabel htmlFor="email">{auth.email}</FieldLabel>
              <Input id="email" type="email" placeholder={auth.emailPlaceholder} />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{auth.password}</FieldLabel>
              <Input id="password" type="password" />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm">{auth.confirm}</FieldLabel>
              <Input id="confirm" type="password" />
            </Field>
            <Field>
              <Button type="submit">{auth.signup.submit}</Button>
              <FieldDescription className="text-center">
                {auth.signup.haveAccount} <Link href="/next/login">Log in</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export function NoticeCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription role="status">{body}</CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
