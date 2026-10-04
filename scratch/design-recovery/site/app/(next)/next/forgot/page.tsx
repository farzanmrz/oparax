import Link from "next/link";
import { Page, readParams, type SearchParams } from "@/next/frame";
import { AuthShell, NoticeCard } from "@/next/auth-card";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { auth } from "@/next/copy";

export default async function ForgotPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  const sent = param("state") === "sent";
  return (
    <Page header="visitor" className="flex flex-col">
      <AuthShell>
        <NoticeCard title={auth.forgot.title} body={sent ? auth.forgot.sent : auth.forgot.subtitle}>
          {sent ? (
            <Button asChild variant="outline" className="w-full">
              <Link href="/next/login">{auth.forgot.back}</Link>
            </Button>
          ) : (
            <form action="/next/forgot">
              <input type="hidden" name="state" value="sent" />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">{auth.email}</FieldLabel>
                  <Input id="email" type="email" placeholder={auth.emailPlaceholder} />
                </Field>
                <Field>
                  <Button type="submit">{auth.forgot.submit}</Button>
                  <FieldDescription className="text-center">
                    <Link href="/next/login">{auth.forgot.back}</Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          )}
        </NoticeCard>
      </AuthShell>
    </Page>
  );
}
