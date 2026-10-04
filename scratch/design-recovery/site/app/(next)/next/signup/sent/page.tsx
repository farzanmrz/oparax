import Link from "next/link";
import { Page } from "@/next/frame";
import { AuthShell, NoticeCard } from "@/next/auth-card";
import { Button } from "@/components/ui/button";
import { auth } from "@/next/copy";

export default function SignupSentPage() {
  return (
    <Page header="visitor" className="flex flex-col">
      <AuthShell>
        <NoticeCard title={auth.signup.title} body={auth.sent(auth.emailPlaceholder)}>
          <Button asChild variant="outline" className="w-full">
            <Link href="/next/login">{auth.forgot.back}</Link>
          </Button>
        </NoticeCard>
      </AuthShell>
    </Page>
  );
}
