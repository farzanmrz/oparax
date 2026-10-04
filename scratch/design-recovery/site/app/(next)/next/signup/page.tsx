import { Page } from "@/next/frame";
import { AuthShell, SignupCard } from "@/next/auth-card";

export default function SignupPage() {
  return (
    <Page header="visitor" className="flex flex-col">
      <AuthShell>
        <SignupCard />
      </AuthShell>
    </Page>
  );
}
