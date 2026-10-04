import { Page } from "@/next/frame";
import { AuthShell, LoginCard } from "@/next/auth-card";

export default function LoginPage() {
  return (
    <Page header="visitor" className="flex flex-col">
      <AuthShell>
        <LoginCard />
      </AuthShell>
    </Page>
  );
}
